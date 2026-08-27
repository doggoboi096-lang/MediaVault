import React, { useState } from 'react';
import { Cloud, Folder, Search, CheckCircle2, Loader2, HardDrive, Terminal, X, Zap } from 'lucide-react';
import { LibraryScanProgress } from '../types';
import { translations, Lang } from '../lib/i18n';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: (path: string) => void;
  scanProgress: LibraryScanProgress;
  lang: Lang;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartScan,
  scanProgress,
  lang
}) => {
  const [libraryPath, setLibraryPath] = useState('D:\\GiaDinh\\HinhAnh');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  if (!isOpen) return null;

  const presetFolders = [
    'D:\\GiaDinh\\HinhAnh',
    'D:\\Photos\\Travel_2023_2026',
    '/mnt/storage/media_vault',
    '/data/personal_cloud/photos',
    'C:\\Users\\Admin\\Pictures\\Family'
  ];

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (libraryPath.trim()) {
      onStartScan(libraryPath.trim());
    }
  };

  return (
    <div 
      id="onboarding-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-2.5 shadow-sm">
            <Zap className="w-5 h-5 fill-emerald-500/20" />
          </div>
          <h1 className="text-base font-bold text-zinc-100 tracking-tight font-mono">MEDIAVAULT CORE</h1>
          <p className="text-xs text-zinc-500 font-mono">Self-Hosted Media Engine</p>
        </div>

        {/* Main Card Container */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6 shadow-2xl relative overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">Library Initialization</h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Specify the physical root mount directory for hardware-accelerated indexing and streaming.
              </p>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-4">
              {/* Library Path Input with Browse Button */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                  LIBRARY ROOT PATH
                </label>
                <div className="flex items-center rounded-md bg-zinc-950 border border-zinc-800 focus-within:border-emerald-500 overflow-hidden transition-all">
                  <div className="pl-3 pr-2 text-zinc-500">
                    <Folder className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-library-path"
                    type="text"
                    value={libraryPath}
                    onChange={(e) => setLibraryPath(e.target.value)}
                    placeholder="D:\GiaDinh\HinhAnh"
                    className="flex-1 bg-transparent py-2 pr-2.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none"
                    disabled={scanProgress.isScanning}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFolderPicker(!showFolderPicker)}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 hover:text-white border-l border-zinc-700 transition-colors cursor-pointer"
                  >
                    Browse
                  </button>
                </div>

                {/* Directory quick selector dropdown */}
                {showFolderPicker && (
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-md space-y-1 mt-1.5 text-xs">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block px-1 font-mono">Quick Mount Presets</span>
                    {presetFolders.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setLibraryPath(p);
                          setShowFolderPicker(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center gap-2 cursor-pointer"
                      >
                        <HardDrive className="w-3 h-3 text-emerald-400" />
                        <span>{p}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Scanning Progress UI if active */}
              {scanProgress.isScanning && (
                <div className="p-3.5 rounded-md bg-zinc-950 border border-zinc-800 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-medium flex items-center gap-2 text-xs font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Ingesting & Analyzing Media...
                    </span>
                    <span className="font-mono text-zinc-300 text-xs font-bold">{scanProgress.percentage}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress.percentage}%` }}
                    />
                  </div>

                  {/* Terminal log messages */}
                  <div className="bg-zinc-900 p-2 rounded border border-zinc-800 font-mono text-[10px] text-zinc-400 space-y-1 max-h-24 overflow-y-auto">
                    {scanProgress.logMessages.map((msg, i) => (
                      <p key={i} className="text-zinc-300">{msg}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Scanning Button */}
              <button
                id="btn-start-scanning"
                type="submit"
                disabled={scanProgress.isScanning}
                className={`w-full py-2.5 px-4 rounded-md text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  scanProgress.isScanning
                    ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-sm'
                }`}
              >
                {scanProgress.isScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Media Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Start Indexing Directory</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-zinc-500 mt-4 text-center font-mono">
          Path and hardware flags can be reconfigured in Settings.
        </p>
      </div>
    </div>
  );
};
