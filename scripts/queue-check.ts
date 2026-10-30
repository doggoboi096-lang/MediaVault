/**
 * queue-check.ts — End-to-end checks for the background AI queue (phase 2).
 *
 * Runs a throwaway MediaVault instance (own port, temp DATA_DIR) against a stub
 * OpenAI-compatible "AI" server, so the queue can be tested quickly and without a GPU.
 *
 *   npm run test:queue
 */

import { spawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

const PORT = 3193;
const AI_PORT = 18089;
const BASE = `http://127.0.0.1:${PORT}`;
const OWNER = 'owner@example.com';
const ROOT = process.cwd();
const TSX_CLI = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

interface Result {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}
const results: Result[] = [];
const record = (id: string, name: string, pass: boolean, detail: string) => results.push({ id, name, pass, detail });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Stub AI (llama-server compatible subset) ───────────────────────────────
let stubDelayMs = 50;
let stubCalls = 0;
const stub = http.createServer((req, res) => {
  if (req.url === '/health') return res.end(JSON.stringify({ status: 'ok' }));
  let body = '';
  req.on('data', d => (body += d));
  req.on('end', async () => {
    stubCalls++;
    await sleep(stubDelayMs);
    const json = JSON.parse(body || '{}').response_format?.type === 'json_object';
    const content = json
      ? JSON.stringify({ tags: ['stub scene', 'queue test'], detectedObjects: [{ label: 'cat', confidence: 0.91 }] })
      : 'Không có văn bản.';
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }));
  });
});

// ── Fixtures ────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-queue-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(path.join(dataDir, 'media_uploads'), { recursive: true });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const secret = crypto.randomBytes(32).toString('hex');
const serverEnv = {
  ...process.env,
  PORT: String(PORT),
  HOST: '127.0.0.1',
  DATA_DIR: dataDir,
  SESSION_SECRET: secret,
  ALLOWED_EMAIL: OWNER,
  AUTH_DISABLED: 'false',
  AI_BASE_URL: `http://127.0.0.1:${AI_PORT}`,
  HMR_PORT: '24693',
};

let serverLog = '';
function startServer(): ChildProcess {
  const child = spawn(process.execPath, [TSX_CLI, 'server.ts'], { cwd: ROOT, env: serverEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', d => (serverLog += d));
  child.stderr?.on('data', d => (serverLog += d));
  return child;
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error('server did not start');
}

async function stopServer(child: ChildProcess) {
  if (child.exitCode !== null) return;
  const exited = new Promise(r => child.once('exit', r));
  child.kill(); // abrupt on Windows (TerminateProcess): the same as pulling the plug mid-job
  await exited;
}

let cookie = '';
const api = (p: string, init: RequestInit = {}) =>
  fetch(`${BASE}${p}`, { ...init, headers: { Cookie: cookie, ...(init.headers || {}) } });

async function upload(names: string[]) {
  const form = new FormData();
  for (const n of names) form.append('files', new Blob([PNG], { type: 'image/png' }), n);
  const started = Date.now();
  const res = await api('/api/media/upload', { method: 'POST', body: form });
  return { status: res.status, ms: Date.now() - started, body: await res.json() };
}

async function media(): Promise<any[]> {
  return (await (await api('/api/media')).json()).data;
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await sleep(250);
  }
  return false;
}

/** How many times each media id was completed, from the worker's log lines. */
function completions(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of serverLog.matchAll(/\[QUEUE\] Done (\S+)/g)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  return counts;
}

async function main() {
  await new Promise<void>(r => stub.listen(AI_PORT, '127.0.0.1', r));
  process.env.SESSION_SECRET = secret;
  process.env.ALLOWED_EMAIL = OWNER;
  const { signSession } = await import('../src/server/auth.ts');
  cookie = `mv_session=${signSession(OWNER)}`;

  let server = startServer();
  try {
    await waitForHealth();

    // 1. 50 photos appear immediately, tags arrive in the background
    stubDelayMs = 40;
    const names = Array.from({ length: 50 }, (_, i) => `batch-${String(i).padStart(2, '0')}.png`);
    const up = await upload(names);
    const listed = await media();
    const visible = names.filter(n => listed.some(i => i.title === n)).length;
    const pendingAtUpload = listed.filter(i => names.includes(i.title) && i.aiStatus !== 'done').length;
    const allTagged = await waitFor(async () => (await media()).filter(i => names.includes(i.title)).every(i => i.aiStatus === 'done'), 120_000);
    const tagged = (await media()).filter(i => names.includes(i.title) && i.tags.includes('stub scene')).length;
    record(
      '1',
      'Upload 50 ảnh: hiện ngay, tag xuất hiện dần',
      up.status === 200 && visible === 50 && pendingAtUpload > 0 && allTagged && tagged === 50,
      `upload ${up.status} trong ${up.ms} ms, ${visible}/50 hiện ngay (${pendingAtUpload} đang chờ AI), sau đó ${tagged}/50 có tag`
    );

    // 2. Kill the server mid-queue, restart: resumes, nothing skipped or processed twice
    stubDelayMs = 400; // two AI calls per photo ≈ 0.8 s each
    const restartNames = Array.from({ length: 10 }, (_, i) => `restart-${i}.png`);
    await upload(restartNames);
    await waitFor(async () => (await media()).filter(i => restartNames.includes(i.title) && i.aiStatus === 'done').length >= 3, 30_000);
    const doneBeforeKill = (await media()).filter(i => restartNames.includes(i.title) && i.aiStatus === 'done').length;
    await stopServer(server);

    server = startServer();
    await waitForHealth();
    const resumed = await waitFor(async () => (await media()).filter(i => restartNames.includes(i.title)).every(i => i.aiStatus === 'done'), 60_000);
    const ids = (await media()).filter(i => restartNames.includes(i.title)).map(i => i.id);
    const counts = completions();
    const twice = ids.filter(id => (counts.get(id) || 0) > 1).length;
    const missing = ids.filter(id => !counts.get(id)).length;
    record(
      '2',
      'Tắt server giữa chừng rồi bật lại: chạy tiếp, không bỏ sót, không trùng',
      resumed && ids.length === 10 && twice === 0 && missing === 0 && /Resuming \d+ job/.test(serverLog),
      `${doneBeforeKill}/10 xong trước khi tắt; sau khi bật lại: ${ids.length - missing}/10 xong, ${twice} ảnh bị xử lý 2 lần`
    );
  } finally {
    await stopServer(server);
  }
}

main()
  .catch(err => {
    console.error(err);
    record('!', 'Script lỗi', false, String(err?.message || err));
  })
  .finally(() => {
    stub.close();
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const r of results) console.log(`${r.pass ? 'ĐẠT  ' : 'TRƯỢT'}  #${r.id.padEnd(2)} ${r.name}\n        ${r.detail}`);
    const failed = results.filter(r => !r.pass).length;
    console.log(`\n${results.length - failed} đạt, ${failed} trượt (AI giả: ${stubCalls} lần gọi)`);
    process.exit(failed ? 1 : 0);
  });
