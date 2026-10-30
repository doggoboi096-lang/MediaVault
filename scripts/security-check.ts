/**
 * security-check.ts — Automated checks for the phase-1 security checklist.
 *
 * Starts a throwaway MediaVault instance (own port, temp DATA_DIR, temp secret, AI off),
 * runs the checks against it and prints a pass/fail table. It never touches the real
 * library, media_uploads or the dev server already running on :3000.
 *
 *   npm run test:security
 *
 * Checks 6 (sign in with the allowed Google account) and 9 (open over https://…ts.net)
 * need a real Google sign-in and a Tailscale device, so they are listed as manual.
 */

import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';

const PORT = 3191;
const BASE = `http://127.0.0.1:${PORT}`;
const OWNER = 'owner@example.com';
const ROOT = process.cwd();
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

interface Result {
  id: string;
  name: string;
  pass: boolean | 'manual';
  detail: string;
}
const results: Result[] = [];
const record = (id: string, name: string, pass: boolean, detail: string) => results.push({ id, name, pass, detail });

// ── Fixtures ────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-security-'));
const dataDir = path.join(tmp, 'data');
const libraryDir = path.join(tmp, 'library');
fs.mkdirSync(path.join(dataDir, 'media_uploads'), { recursive: true });
fs.mkdirSync(libraryDir, { recursive: true });
// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(dataDir, 'media_uploads', 'sample.png'), PNG);
fs.writeFileSync(path.join(libraryDir, 'scanned-original.png'), PNG);

const secret = crypto.randomBytes(32).toString('hex');
const serverEnv = {
  ...process.env,
  PORT: String(PORT),
  HOST: '127.0.0.1',
  DATA_DIR: dataDir,
  SESSION_SECRET: secret,
  ALLOWED_EMAIL: OWNER,
  ALLOWED_TAILSCALE_LOGIN: OWNER,
  AUTH_DISABLED: 'false',
  AI_AUTOSTART: 'false',
  HMR_PORT: '24691',
};

function startServer(env: NodeJS.ProcessEnv): { child: ChildProcess; output: () => string } {
  let out = '';
  const child = spawn(process.execPath, [TSX_CLI, 'server.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', d => (out += d));
  child.stderr?.on('data', d => (out += d));
  return { child, output: () => out };
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('server did not start');
}

const mediaFiles = () => fs.readdirSync(path.join(dataDir, 'media_uploads')).sort().join(',');

async function main() {
  // Sessions are signed with the same code and secret the server uses.
  process.env.SESSION_SECRET = secret;
  process.env.ALLOWED_EMAIL = OWNER;
  const { signSession } = await import('../src/server/auth.ts');
  const cookie = `mv_session=${signSession(OWNER)}`;
  const authed = { headers: { Cookie: cookie } };

  const server = startServer(serverEnv);
  try {
    await waitForHealth();

    // 1. Not reachable from the LAN
    const lanIps = Object.values(os.networkInterfaces())
      .flat()
      .filter(i => i && i.family === 'IPv4' && !i.internal)
      .map(i => i!.address);
    if (lanIps.length === 0) {
      record('1', 'Không truy cập được qua IP LAN', true, 'máy không có IP LAN (bỏ qua)');
    } else {
      const outcomes = await Promise.all(
        lanIps.map(
          ip =>
            new Promise<string>(resolve => {
              const sock = net.connect({ host: ip, port: PORT, timeout: 2000 });
              sock.on('connect', () => (sock.destroy(), resolve(`${ip}: KẾT NỐI ĐƯỢC`)));
              sock.on('error', (e: any) => resolve(`${ip}: ${e.code}`));
              sock.on('timeout', () => (sock.destroy(), resolve(`${ip}: timeout`)));
            })
        )
      );
      record('1', 'Không truy cập được qua IP LAN', outcomes.every(o => !o.includes('KẾT NỐI ĐƯỢC')), outcomes.join('; '));
    }

    // 2. API without a session
    const r2 = await fetch(`${BASE}/api/media`);
    record('2', 'GET /api/media không có cookie → 401', r2.status === 401, `status ${r2.status}`);

    // 3. serve-media is gone (checked with a valid session so auth can't mask it)
    const r3 = await fetch(`${BASE}/api/serve-media?path=${encodeURIComponent('C:\\Windows\\win.ini')}`, authed);
    record('3', '/api/serve-media đã bị xoá → 404', r3.status === 404, `status ${r3.status}`);

    // 4. Path traversal on delete
    const r4a = await fetch(`${BASE}/api/media/..%5C..%5Cpackage.json`, { method: 'DELETE', ...authed });
    const r4b = await fetch(`${BASE}/api/media`, {
      method: 'DELETE',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames: ['../package.json'] }),
    });
    const pkgSafe = fs.existsSync(path.join(ROOT, 'package.json'));
    record('4', 'Xoá với ..\\..\\package.json → 400, file còn nguyên', r4a.status === 400 && r4b.status === 400 && pkgSafe, `param ${r4a.status}, body ${r4b.status}, package.json ${pkgSafe ? 'còn' : 'MẤT'}`);

    // 5. Login with a token that isn't from the allowed account
    const r5 = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'not-a-google-token' }),
    });
    record('5', 'Token không hợp lệ bị từ chối, không có cookie', r5.status === 401 && !r5.headers.get('set-cookie'), `status ${r5.status}; 403 với tài khoản Google khác cần thử tay`);

    // 7. Media files need the session
    const r7a = await fetch(`${BASE}/media/sample.png`);
    const r7b = await fetch(`${BASE}/media/sample.png`, authed);
    record('7', '/media/… không có cookie → 401, có cookie → 200', r7a.status === 401 && r7b.status === 200, `không cookie ${r7a.status}, có cookie ${r7b.status}`);

    // 8. Login rate limit: 10 attempts per 15 minutes per IP (check 5 used one already)
    const statuses: number[] = [r5.status];
    for (let i = 0; i < 10; i++) {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'x' }),
      });
      statuses.push(r.status);
    }
    record('8', 'Lần đăng nhập thứ 11 → 429', statuses[9] !== 429 && statuses[10] === 429, `lần 10: ${statuses[9]}, lần 11: ${statuses[10]}`);

    // 10. Upload without a session writes nothing
    const before = mediaFiles();
    const form = new FormData();
    form.append('files', new Blob([PNG], { type: 'image/png' }), 'intruder.png');
    let r10status = 0;
    try {
      r10status = (await fetch(`${BASE}/api/media/upload`, { method: 'POST', body: form })).status;
    } catch (e: any) {
      r10status = -1;
    }
    const after = mediaFiles();
    record('10', 'Upload không có session → 401, không có file mới', r10status === 401 && before === after, `status ${r10status}, media_uploads ${before === after ? 'không đổi' : 'CÓ FILE MỚI'}`);

    // 12. Deleting a scanned item keeps the original on disk
    const scan = await fetch(`${BASE}/api/scan/start`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: libraryDir }),
    });
    const list = (await (await fetch(`${BASE}/api/media`, authed)).json()).data as any[];
    const scanned = list.find(i => i.filename === 'scanned-original.png');
    const fileRes = scanned ? await fetch(`${BASE}${scanned.url}`, authed) : null;
    const del = scanned ? await fetch(`${BASE}/api/media/${scanned.filename}`, { method: 'DELETE', ...authed }) : null;
    const listAfter = (await (await fetch(`${BASE}/api/media`, authed)).json()).data as any[];
    const originalKept = fs.existsSync(path.join(libraryDir, 'scanned-original.png'));
    const goneFromIndex = !listAfter.some(i => i.filename === 'scanned-original.png');
    record(
      '12',
      'Xoá ảnh từ lượt quét: chỉ gỡ khỏi index, file gốc còn',
      scan.status === 200 && fileRes?.status === 200 && del?.status === 200 && originalKept && goneFromIndex,
      `quét ${scan.status}, xem file ${fileRes?.status}, xoá ${del?.status}, file gốc ${originalKept ? 'còn' : 'MẤT'}, index ${goneFromIndex ? 'đã gỡ' : 'vẫn còn'}`
    );

    // Extra hardening checks
    const viteBlocked = await Promise.all(
      ['/library_index.json', '/media_uploads/sample.png', '/.env', `/@fs/${dataDir.replace(/\\/g, '/')}/media_uploads/sample.png`].map(async p => [
        p,
        (await fetch(`${BASE}${p}`)).status,
      ])
    );
    record('A', 'Vite không phục vụ file dữ liệu', viteBlocked.every(([, s]) => s === 404 || s === 403), viteBlocked.map(([p, s]) => `${String(p).slice(0, 28)} ${s}`).join('; '));

    const health = await (await fetch(`${BASE}/api/health`)).json();
    record('B', '/api/health chỉ trả status', JSON.stringify(health) === '{"status":"ok"}', JSON.stringify(health));

    const rTs = await fetch(`${BASE}/api/media`, { headers: { Cookie: cookie, 'Tailscale-User-Login': 'someone-else@example.com' } });
    record('C', 'Header Tailscale sai tài khoản → 403 (dù có session)', rTs.status === 403, `status ${rTs.status}`);

    const tampered = cookie.slice(0, -2) + (cookie.endsWith('AA') ? 'BB' : 'AA');
    const rTamper = await fetch(`${BASE}/api/media`, { headers: { Cookie: tampered } });
    record('D', 'Session bị sửa chữ ký → 401', rTamper.status === 401, `status ${rTamper.status}`);

    const badRoots = process.platform === 'win32' ? ['C:\\', process.env.SystemRoot || 'C:\\Windows', 'relative\\path'] : ['/', '/etc', 'relative/path'];
    const rootStatuses = await Promise.all(
      badRoots.map(async p => [
        p,
        (
          await fetch(`${BASE}/api/config`, {
            method: 'POST',
            headers: { Cookie: cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({ libraryPath: p }),
          })
        ).status,
      ])
    );
    record('E', 'Không cho trỏ thư viện vào gốc ổ đĩa / thư mục hệ thống', rootStatuses.every(([, s]) => s === 400), rootStatuses.map(([p, s]) => `${p} ${s}`).join('; '));

    const patch = await fetch(`${BASE}/api/media`, {
      method: 'PATCH',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { filename: 'sample.png', path: path.join(ROOT, 'package.json'), url: '/evil', description: 'ok' } }),
    });
    const indexed = ((await (await fetch(`${BASE}/api/media`, authed)).json()).data as any[]).find(i => i.filename === 'sample.png');
    record('F', 'PATCH không sửa được path/url', patch.status === 200 && indexed?.path === path.join(dataDir, 'media_uploads', 'sample.png') && indexed?.url === '/media/sample.png', `path ${indexed?.path?.endsWith('sample.png') ? 'giữ nguyên' : 'BỊ ĐỔI'}, url ${indexed?.url}`);

    // Phase-2 endpoints are behind the same session check
    const phase2 = await Promise.all(
      [
        ['GET', '/api/events'],
        ['GET', '/api/settings/ai'],
        ['PATCH', '/api/settings/ai'],
        ['POST', '/api/queue/backfill'],
        [`POST`, `/api/media/${indexed?.id || 'x'}/reanalyze`],
        ['GET', '/api/media/search?q=test'],
      ].map(async ([method, p]) => [p, (await fetch(`${BASE}${p}`, { method })).status])
    );
    record('G', 'Endpoint giai đoạn 2 cần session', phase2.every(([, s]) => s === 401), phase2.map(([p, s]) => `${String(p).replace(/media\/[^/]+\/re/, 'media/:id/re')} ${s}`).join('; '));
  } finally {
    server.child.kill();
  }

  // 11. AUTH_DISABLED with a public HOST must refuse to start
  const unsafe = startServer({ ...serverEnv, AUTH_DISABLED: 'true', HOST: '0.0.0.0', PORT: String(PORT + 1) });
  const exitCode = await new Promise<number | null>(resolve => {
    const timer = setTimeout(() => (unsafe.child.kill(), resolve(null)), 30_000);
    unsafe.child.on('exit', code => (clearTimeout(timer), resolve(code)));
  });
  record('11', 'AUTH_DISABLED=true + HOST=0.0.0.0 → không khởi động', exitCode !== null && exitCode !== 0 && unsafe.output().includes('AUTH_DISABLED'), `exit code ${exitCode}`);

  results.push(
    { id: '6', name: 'Đăng nhập đúng email, cookie HttpOnly + Secure', pass: 'manual', detail: 'cần đăng nhập Google thật' },
    { id: '9', name: 'Truy cập qua https://…ts.net từ điện thoại', pass: 'manual', detail: 'cần thiết bị trong tailnet' }
  );
}

main()
  .catch(err => {
    console.error(err);
    record('!', 'Script lỗi', false, String(err?.message || err));
  })
  .finally(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    const order = (id: string) => (/^\d+$/.test(id) ? Number(id) : 100 + id.charCodeAt(0));
    results.sort((a, b) => order(a.id) - order(b.id));
    for (const r of results) {
      const mark = r.pass === 'manual' ? 'THỦ CÔNG' : r.pass ? 'ĐẠT    ' : 'TRƯỢT  ';
      console.log(`${mark}  #${r.id.padEnd(2)} ${r.name}\n          ${r.detail}`);
    }
    const failed = results.filter(r => r.pass === false).length;
    console.log(`\n${results.filter(r => r.pass === true).length} đạt, ${failed} trượt, ${results.filter(r => r.pass === 'manual').length} cần kiểm tra thủ công`);
    process.exit(failed ? 1 : 0);
  });
