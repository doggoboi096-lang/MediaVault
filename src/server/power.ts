/**
 * power.ts — Is the machine on AC power? Used by the "only while charging" AI setting.
 * Machines without a battery (desktops, servers) always count as on AC power.
 * The answer is cached for a minute because the OS query takes a moment.
 */

import fs from 'fs';
import path from 'path';
import util from 'util';
import { execFile } from 'child_process';

const execFileAsync = util.promisify(execFile);
let cached: { value: boolean; at: number } | null = null;

async function query(): Promise<boolean> {
  if (process.env.POWER_SOURCE === 'battery') return false; // for tests
  if (process.env.POWER_SOURCE === 'ac') return true;

  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        // PowerOnline is True on AC; no battery at all returns nothing.
        '(Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus -ErrorAction SilentlyContinue | Select-Object -First 1).PowerOnline',
      ],
      { timeout: 10_000, windowsHide: true }
    );
    return stdout.trim().toLowerCase() !== 'false';
  }

  if (process.platform === 'darwin') {
    const { stdout } = await execFileAsync('pmset', ['-g', 'batt'], { timeout: 5000 });
    return !stdout.includes("'Battery Power'");
  }

  // Linux: any online "Mains" supply means AC; no supplies listed means a desktop/server.
  const dir = '/sys/class/power_supply';
  if (!fs.existsSync(dir)) return true;
  const mains = fs.readdirSync(dir).filter(n => {
    try {
      return fs.readFileSync(path.join(dir, n, 'type'), 'utf8').trim() === 'Mains';
    } catch {
      return false;
    }
  });
  if (!mains.length) return true;
  return mains.some(n => {
    try {
      return fs.readFileSync(path.join(dir, n, 'online'), 'utf8').trim() === '1';
    } catch {
      return false;
    }
  });
}

export async function isOnAcPower(): Promise<boolean> {
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  let value = true;
  try {
    value = await query();
  } catch (e: any) {
    console.warn('[POWER] Could not read the power source, assuming AC:', e?.message || e);
  }
  cached = { value, at: Date.now() };
  return value;
}
