/**
 * ai_runtime.ts — Self-managed local AI runtime (llama.cpp + Qwen3-VL 4B)
 *
 * On server start, downloads (first run only) the official llama.cpp `llama-server`
 * binary and the Qwen3-VL 4B GGUF weights into the project, then launches the
 * server as a child process. No Ollama or any other external service is required.
 *
 * Set AI_BASE_URL to use an already-running OpenAI-compatible server instead.
 */

import fs from 'fs';
import path from 'path';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import { once } from 'events';
import { finished } from 'stream/promises';

// ── Config ──────────────────────────────────────────────────────────────────
const LLAMA_CPP_TAG = process.env.LLAMA_CPP_TAG || 'b12001';
const AI_PORT = Number(process.env.AI_PORT || 8089);
const CTX_SIZE = process.env.AI_CTX_SIZE || '8192';

const RUNTIME_DIR = path.join(process.cwd(), '.ai_runtime');
const MODELS_DIR = path.join(process.cwd(), 'models');

const HF_REPO = process.env.AI_HF_REPO || 'Qwen/Qwen3-VL-4B-Instruct-GGUF';
const MODEL_FILE = process.env.AI_MODEL_FILE || 'Qwen3VL-4B-Instruct-Q4_K_M.gguf';
const MMPROJ_FILE = process.env.AI_MMPROJ_FILE || 'mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf';

const EXTERNAL_BASE_URL = process.env.AI_BASE_URL;
export const AI_BASE_URL = EXTERNAL_BASE_URL || `http://127.0.0.1:${AI_PORT}`;

// ── Status (exposed via /api/health) ────────────────────────────────────────
export const aiStatus = {
  stage: 'idle' as 'idle' | 'downloading' | 'starting' | 'ready' | 'error',
  message: '',
  progress: 0,
};

function setStatus(stage: typeof aiStatus.stage, message: string, progress = aiStatus.progress) {
  aiStatus.stage = stage;
  aiStatus.message = message;
  aiStatus.progress = progress;
  console.log(`[AI-RUNTIME] ${message}`);
}

// ── Download helper with progress logging ───────────────────────────────────
async function downloadFile(url: string, dest: string, label: string) {
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url}`);

  const total = Number(res.headers.get('content-length') || 0);
  const tmp = `${dest}.part`;
  const out = fs.createWriteStream(tmp);
  let received = 0;
  let lastLogged = -1;

  for await (const chunk of res.body as any) {
    if (!out.write(chunk)) await once(out, 'drain');
    received += chunk.length;
    if (total > 0) {
      const pct = Math.floor((received / total) * 100);
      if (pct !== lastLogged && pct % 5 === 0) {
        lastLogged = pct;
        setStatus('downloading', `Downloading ${label}: ${pct}% (${(received / 1e9).toFixed(2)}/${(total / 1e9).toFixed(2)} GB)`, pct);
      }
    }
  }
  out.end();
  await finished(out);
  fs.renameSync(tmp, dest);
}

// ── llama.cpp binary ────────────────────────────────────────────────────────
function llamaAssetName(): string {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  if (process.platform === 'darwin') return `llama-${LLAMA_CPP_TAG}-bin-macos-${arch}.tar.gz`;
  if (process.platform === 'win32') {
    // Vulkan runs on NVIDIA / AMD / Intel GPUs without a CUDA toolkit; LLAMA_BACKEND=cpu forces CPU.
    const backend = process.env.LLAMA_BACKEND === 'cpu' ? 'cpu' : 'vulkan';
    return `llama-${LLAMA_CPP_TAG}-bin-win-${backend}-${arch}.zip`;
  }
  // Linux defaults to CPU (e.g. Codespaces has no GPU); LLAMA_BACKEND=vulkan opts into GPU.
  return process.env.LLAMA_BACKEND === 'vulkan'
    ? `llama-${LLAMA_CPP_TAG}-bin-ubuntu-vulkan-${arch}.tar.gz`
    : `llama-${LLAMA_CPP_TAG}-bin-ubuntu-${arch}.tar.gz`;
}

function findFile(dir: string, name: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === name) return full;
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    }
  }
  return null;
}

async function ensureLlamaServer(): Promise<string> {
  if (process.env.LLAMA_SERVER_PATH) return process.env.LLAMA_SERVER_PATH;

  const asset = llamaAssetName();
  const installDir = path.join(RUNTIME_DIR, asset.replace(/\.(zip|tar\.gz)$/, ''));
  const exeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';

  const existing = findFile(installDir, exeName);
  if (existing) return existing;

  const archivePath = path.join(RUNTIME_DIR, asset);
  await downloadFile(`https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_TAG}/${asset}`, archivePath, `llama.cpp ${LLAMA_CPP_TAG}`);

  setStatus('starting', `Extracting ${asset}...`);
  // Extract into a temp dir and rename on success, so an interrupted extraction is never treated as installed.
  const tmpDir = `${installDir}.tmp`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(installDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  // Windows' built-in bsdtar handles .zip; call it explicitly so Git Bash's GNU tar is never picked up.
  const tarBin = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';
  await new Promise<void>((resolve, reject) => {
    const p = spawn(tarBin, ['-xf', archivePath, '-C', tmpDir], { stdio: 'ignore' });
    p.on('error', reject);
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`tar exited with code ${code}`))));
  });
  fs.renameSync(tmpDir, installDir);
  fs.unlinkSync(archivePath);

  const exe = findFile(installDir, exeName);
  if (!exe) throw new Error(`${exeName} not found after extracting ${asset}`);
  if (process.platform !== 'win32') fs.chmodSync(exe, 0o755);
  return exe;
}

// ── GPU selection ───────────────────────────────────────────────────────────
/**
 * By default llama.cpp splits layers across every GPU it sees, so on laptops half the
 * model lands on the slow integrated GPU. Pin to one device, preferring a discrete card.
 */
function pickDevice(exe: string): string | null {
  if (process.env.AI_DEVICE) return process.env.AI_DEVICE;
  const out = spawnSync(exe, ['--list-devices'], { cwd: path.dirname(exe), encoding: 'utf-8' });
  const devices = `${out.stdout || ''}\n${out.stderr || ''}`
    .split('\n')
    .map(line => line.match(/^\s+(\w+\d+):\s+(.+?)\s+\(/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => ({ id: m[1], name: m[2] }));
  if (devices.length === 0) return null;
  const discrete = devices.find(d => /nvidia|geforce|rtx|quadro|radeon rx|radeon pro|arc a|arc b/i.test(d.name));
  const chosen = discrete || devices[0];
  console.log(`[AI-RUNTIME] GPU devices: ${devices.map(d => `${d.id}=${d.name}`).join(', ')} → using ${chosen.id}`);
  return chosen.id;
}

// ── Model weights ───────────────────────────────────────────────────────────
async function ensureModels(): Promise<{ model: string; mmproj: string }> {
  const model = path.join(MODELS_DIR, MODEL_FILE);
  const mmproj = path.join(MODELS_DIR, MMPROJ_FILE);
  const base = `https://huggingface.co/${HF_REPO}/resolve/main`;
  await downloadFile(`${base}/${MODEL_FILE}`, model, MODEL_FILE);
  await downloadFile(`${base}/${MMPROJ_FILE}`, mmproj, MMPROJ_FILE);
  return { model, mmproj };
}

// ── Server process ──────────────────────────────────────────────────────────
let child: ChildProcess | null = null;
let readyPromise: Promise<void> | null = null;

async function isHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${AI_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitUntilHealthy(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(`llama-server exited with code ${child.exitCode} (see .ai_runtime/llama-server.log)`);
    }
    if (await isHealthy()) return;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Timed out waiting for llama-server to become ready');
}

function stopChild() {
  if (child && child.exitCode === null) child.kill();
}

async function boot() {
  if (EXTERNAL_BASE_URL) {
    setStatus('starting', `Using external AI server at ${EXTERNAL_BASE_URL}`);
    await waitUntilHealthy(60_000);
    setStatus('ready', 'External AI server is ready', 100);
    return;
  }

  // Reuse a server left running from a previous session on the same port.
  if (await isHealthy()) {
    setStatus('ready', `Reusing llama-server already running on port ${AI_PORT}`, 100);
    return;
  }

  setStatus('downloading', 'Checking local AI runtime (first run downloads ~3 GB)...', 0);
  const exe = await ensureLlamaServer();
  const { model, mmproj } = await ensureModels();

  setStatus('starting', `Loading ${MODEL_FILE} into llama-server on port ${AI_PORT}...`);
  const logStream = fs.createWriteStream(path.join(RUNTIME_DIR, 'llama-server.log'), { flags: 'w' });
  const device = pickDevice(exe);
  child = spawn(exe, [
    ...(device ? ['--device', device, '--split-mode', 'none'] : []),
    '-m', model,
    '--mmproj', mmproj,
    '--host', '127.0.0.1',
    '--port', String(AI_PORT),
    '-c', CTX_SIZE,
    '-np', '1',
    '-ngl', '99',
    '--jinja',
  ], { cwd: path.dirname(exe), stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);
  child.on('exit', code => {
    if (aiStatus.stage === 'ready') setStatus('error', `llama-server stopped unexpectedly (code ${code})`);
  });

  process.on('exit', stopChild);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      stopChild();
      process.exit(0);
    });
  }

  await waitUntilHealthy(5 * 60_000);
  setStatus('ready', `Qwen3-VL ready at ${AI_BASE_URL}`, 100);
}

/** Starts the runtime once; later calls return the same promise. */
export function startAiRuntime(): Promise<void> {
  if (!readyPromise) {
    readyPromise = boot().catch(err => {
      setStatus('error', `Local AI runtime failed: ${err?.message || err}`);
      readyPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return readyPromise;
}
