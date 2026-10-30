/**
 * auth.ts — Single-owner authentication.
 *
 * A Google ID token (from Firebase Auth in the browser) is verified once with firebase-admin,
 * which only needs the project id — no service-account key on disk. If the email matches
 * ALLOWED_EMAIL, the server issues its own stateless session:
 *   base64url(payload) + "." + base64url(HMAC-SHA256(payload))
 * so later requests (including <img>/<video> loads via cookie) never call Firebase.
 *
 * Bump SESSION_VERSION to sign out every device at once.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { audit } from './audit';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { email: string };
    }
  }
}

export const SESSION_COOKIE = 'mv_session';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

// Read lazily so tests and scripts can set the environment before first use.
const allowedEmail = () => (process.env.ALLOWED_EMAIL || '').trim().toLowerCase();
const allowedTailscaleLogin = () => (process.env.ALLOWED_TAILSCALE_LOGIN || '').trim().toLowerCase();
const sessionVersion = () => process.env.SESSION_VERSION || '1';
const sessionDays = () => Math.min(Math.max(Number(process.env.SESSION_DAYS) || 30, 1), 365);
export const authDisabled = () => process.env.AUTH_DISABLED === 'true';

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Startup checks ──────────────────────────────────────────────────────────
/** Refuses unsafe configurations before the server starts listening. */
export function checkAuthConfig(host: string) {
  if (authDisabled() && !LOCAL_HOSTS.includes(host)) {
    throw new Error(`AUTH_DISABLED=true is only allowed with HOST=127.0.0.1 (got HOST=${host})`);
  }
  if (authDisabled()) {
    console.warn('[AUTH] AUTH_DISABLED=true: every local request is treated as the owner. Demo use only.');
  } else if (!allowedEmail()) {
    console.warn('[AUTH] ALLOWED_EMAIL is not set: nobody can sign in until it is configured in .env');
  }
  secret(); // create or load the signing key now rather than on the first request
}

// ── Signing key ─────────────────────────────────────────────────────────────
let secretCache: Buffer | null = null;

function secret(): Buffer {
  if (secretCache) return secretCache;
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    if (fromEnv.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
    secretCache = Buffer.from(fromEnv, 'utf8');
    return secretCache;
  }
  const keyFile = path.join(process.cwd(), '.ai_runtime', 'session.key');
  if (fs.existsSync(keyFile)) {
    const stored = fs.readFileSync(keyFile, 'utf8').trim();
    if (stored.length >= 64) {
      secretCache = Buffer.from(stored, 'utf8');
      return secretCache;
    }
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(keyFile), { recursive: true });
  fs.writeFileSync(keyFile, generated, { mode: 0o600 });
  console.log(`[AUTH] Generated a new session key at ${keyFile}`);
  secretCache = Buffer.from(generated, 'utf8');
  return secretCache;
}

const hmac = (data: string) => crypto.createHmac('sha256', secret()).update(data).digest();

// ── Sessions ────────────────────────────────────────────────────────────────
interface SessionPayload {
  email: string;
  iat: number;
  exp: number;
  ver: string;
}

export function signSession(email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { email: email.toLowerCase(), iat: now, exp: now + sessionDays() * 86400, ver: sessionVersion() };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body).toString('base64url')}`;
}

export function verifySession(token: unknown): { email: string } | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;

  const expected = hmac(body);
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (payload.ver !== sessionVersion()) return null;
  // Changing ALLOWED_EMAIL also invalidates sessions issued to the previous owner.
  if (!allowedEmail() || payload.email !== allowedEmail()) return null;
  return { email: payload.email };
}

// ── Google ID token exchange ────────────────────────────────────────────────
function firebaseAuth() {
  if (!getApps().length) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'mediavault-2b811' });
  }
  return getAuth();
}

/**
 * Verifies a Google ID token and returns a session for the allowed owner.
 * checkRevoked is left off on purpose: it calls getUser(), which needs a service-account key.
 * Revocation is handled by SESSION_VERSION instead.
 */
export async function exchangeGoogleToken(idToken: string): Promise<{ email: string; token: string }> {
  if (!allowedEmail()) throw new AuthError(403, 'no owner configured (ALLOWED_EMAIL)');
  let decoded;
  try {
    decoded = await firebaseAuth().verifyIdToken(idToken);
  } catch {
    throw new AuthError(401, 'invalid token');
  }
  const email = (decoded.email || '').toLowerCase();
  if (!decoded.email_verified || email !== allowedEmail()) {
    audit(email || 'unknown', 'login-denied', []);
    throw new AuthError(403, 'forbidden');
  }
  audit(email, 'login', []);
  return { email, token: signSession(email) };
}

// ── Middleware ──────────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const tsLogin = req.get('Tailscale-User-Login');

  if (authDisabled()) {
    // Demo mode is for this machine only; anything arriving through `tailscale serve` is refused.
    if (tsLogin !== undefined) return res.status(403).json({ success: false, error: 'forbidden' });
    req.user = { email: allowedEmail() || 'local' };
    return next();
  }

  // [1] Tailscale layer: requests proxied by `tailscale serve` must come from the allowed account.
  if (tsLogin !== undefined && (!allowedTailscaleLogin() || tsLogin.trim().toLowerCase() !== allowedTailscaleLogin())) {
    return res.status(403).json({ success: false, error: 'forbidden' });
  }

  // [2] Session: web cookie or app bearer token.
  const bearer = req.get('Authorization');
  const token = req.cookies?.[SESSION_COOKIE] || (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined);
  const session = verifySession(token);
  if (!session) return res.status(401).json({ success: false, error: 'unauthorized' });

  req.user = session;
  next();
}

/** Fixed-window limiter kept in memory, keyed by client IP. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    }
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ success: false, error: 'too many attempts' });
    }
    next();
  };
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
});

// ── Routes: /api/auth ───────────────────────────────────────────────────────
export const authRouter = express.Router();
authRouter.use(express.json({ limit: '16kb' }));

authRouter.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  if (authDisabled()) return res.json({ success: true, email: allowedEmail() || 'local', token: null });

  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken || idToken.length > 8192) {
    return res.status(400).json({ success: false, error: 'idToken is required' });
  }
  try {
    const { email, token } = await exchangeGoogleToken(idToken);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: sessionDays() * 86400 * 1000 });
    res.json({ success: true, email, token });
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    res.status(status).json({ success: false, error: err instanceof AuthError ? err.message : 'login failed' });
  }
});

authRouter.post('/logout', requireAuth, (req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.json({ success: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, email: req.user!.email, authDisabled: authDisabled() });
});
