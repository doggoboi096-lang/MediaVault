import React, { useState } from 'react';
import { 
  HardDrive, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Folder, 
  Check, 
  Sliders, 
  Activity, 
  Terminal,
  Zap,
  Globe,
  Lock
} from 'lucide-react';
import { SystemHardwareStatus } from '../types';
import { translations, Lang } from '../lib/i18n';

interface SettingsViewProps {
  hwStatus: SystemHardwareStatus;
  currentLibraryPath: string;
  onUpdateLibraryPath: (path: string) => void;
  onTriggerScan: () => void;
  lang: Lang;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  hwStatus,
  currentLibraryPath,
  onUpdateLibraryPath,
  onTriggerScan,
  lang
}) => {
  const [libraryInput, setLibraryInput] = useState(currentLibraryPath);
  const [hwEngine, setHwEngine] = useState<string>(hwStatus.hwAccelEngine);
  const [yoloConf, setYoloConf] = useState<number>(65);
  const [vpnMesh, setVpnMesh] = useState<string>(hwStatus.vpnMesh.provider);
  const [isSaved, setIsSaved] = useState(false);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLibraryPath(libraryInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div id="settings-container" className="p-6 max-w-[1200px] mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">{t('systemConfigTitle')}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t('systemConfigDesc')}
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
        >
          {isSaved ? <Check className="w-3.5 h-3.5 text-white" /> : <Zap className="w-3.5 h-3.5" />}
          <span>{isSaved ? t('settingsSaved') : t('saveChanges')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Physical Media Storage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">{t('physicalStorageRoot')}</h2>
              <p className="text-[11px] text-zinc-500">{t('physicalStorageDesc')}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">{t('primaryLibraryPath')}</label>
              <div className="flex items-center rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="pl-3 text-zinc-500">
                  <Folder className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={libraryInput}
                  onChange={(e) => setLibraryInput(e.target.value)}
                  className="flex-1 bg-transparent py-2 px-2.5 font-mono text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px]">
              <span className="text-zinc-500">{t('dirWatcher')}</span>
              <span className="text-emerald-400 font-mono font-bold">{t('activeLatency')}</span>
            </div>

            <button
              type="button"
              onClick={onTriggerScan}
              className="w-full py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('rescanIndex')}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Hardware Acceleration & FFmpeg */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">{t('mediaProcessing')}</h2>
              <p className="text-[11px] text-zinc-500">{t('mediaProcessingDesc')}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">{t('hwAccelEngineLabel')}</label>
              <select
                value={hwEngine}
                onChange={(e) => setHwEngine(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-2.5 font-mono text-xs text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="NVIDIA NVENC (CUDA 12.4)">NVIDIA NVENC (CUDA 12.4 / RTX 4080)</option>
                <option value="Intel QuickSync (VAAPI)">Intel QuickSync (VAAPI / QSV)</option>
                <option value="Apple VideoToolbox">Apple VideoToolbox (M-Series)</option>
                <option value="CPU (libx265)">CPU Fallback (libx264/libx265)</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-[11px]">
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('processorThreads')}</span>
                <span className="font-mono text-zinc-200">{hwStatus.cpuCores} Threads ({hwStatus.cpuModel})</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('thumbnailCache')}</span>
                <span className="font-mono text-emerald-400">{t('webpOnthefly')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Local AI Inference (YOLOv8 & OCR) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">{t('aiVisionLocal')}</h2>
                <p className="text-[11px] text-zinc-500">{t('edgeBasedObject')}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
              Simulated via Gemini
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">{t('confCutoff')}</label>
                <span className="font-mono text-emerald-400 font-bold">{yoloConf}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                value={yoloConf}
                onChange={(e) => setYoloConf(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-[11px]">
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('modelArch')}</span>
                <span className="font-mono text-emerald-400 font-semibold">{hwStatus.yoloEngine} <span className="text-amber-400 text-[10px] font-normal">(Gemini Sim)</span></span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('avgLatency')}</span>
                <span className="font-mono text-emerald-400">{hwStatus.yoloInferenceAvgMs} ms / frame</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('ocrPipeline')}</span>
                <span className="font-mono text-zinc-200">PaddleOCR + Tesseract 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Networking & Zero-Trust Reverse Proxy */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">{t('meshVpnProxy')}</h2>
              <p className="text-[11px] text-zinc-500">{t('meshVpnDesc')}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">{t('zeroTrustVpn')}</label>
              <select
                value={vpnMesh}
                onChange={(e) => setVpnMesh(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-2.5 font-mono text-xs text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="Tailscale">Tailscale (Node: 100.84.192.42)</option>
                <option value="WireGuard">WireGuard (Direct Peer 51820)</option>
                <option value="Cloudflare WARP">Cloudflare WARP Tunnel</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-[11px]">
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('reverseProxy')}</span>
                <span className="font-mono text-zinc-200">Nginx 1.25 (HTTP/3 QUIC)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('sslCert')}</span>
                <span className="font-mono text-emerald-400">Let's Encrypt Auto-Renewal</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span className="text-zinc-500">{t('lanOrigin')}</span>
                <span className="font-mono text-zinc-300">192.168.1.105:3000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Health & Cache Statistics */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold text-zinc-100">{t('dbEngineMetrics')}</h3>
              <p className="text-[11px] text-zinc-500">{t('dbEngineDesc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
              Simulated via JSON for Demo
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
              {t('walHealthy')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
            <span className="text-zinc-500 block text-[9px] uppercase font-bold font-mono">{t('totalRecords')}</span>
            <span className="text-sm font-mono font-bold text-zinc-100">{hwStatus.dbStats.records.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
            <span className="text-zinc-500 block text-[9px] uppercase font-bold font-mono">{t('sqliteDbSize')} (JSON)</span>
            <span className="text-sm font-mono font-bold text-zinc-100">{hwStatus.dbStats.dbSize}</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
            <span className="text-zinc-500 block text-[9px] uppercase font-bold font-mono">{t('cacheHitRatio')}</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{hwStatus.dbStats.cacheHitRatio}</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
            <span className="text-zinc-500 block text-[9px] uppercase font-bold font-mono">{t('ramCacheAlloc')}</span>
            <span className="text-sm font-mono font-bold text-sky-400">256 MB Pool</span>
          </div>
        </div>
      </div>
    </div>
  );
};
