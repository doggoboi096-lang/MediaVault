import React from 'react';
import { 
  Film, 
  FolderSearch, 
  Settings as SettingsIcon, 
  Upload, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  HardDrive,
  Sparkles,
  MapPin,
  Smile,
  Trash2,
  Info
} from 'lucide-react';
import { SystemHardwareStatus } from '../types';
import { translations, Lang } from '../lib/i18n';

interface SidebarProps {
  currentView: 'timeline' | 'explorer' | 'settings' | 'trash';
  onViewChange: (view: 'timeline' | 'explorer' | 'settings' | 'trash') => void;
  onOpenUpload: () => void;
  onOpenArchitecture: () => void;
  hwStatus: SystemHardwareStatus;
  lang: Lang;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  onOpenUpload,
  onOpenArchitecture,
  hwStatus,
  lang
}) => {
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const formatBytes = (bytes: number) => {
    if (bytes == null || isNaN(bytes)) return '0 GB';
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
    return (bytes / (1024 ** 3)).toFixed(1) + ' GB';
  };

  return (
    <aside 
      id="sidebar-main"
      className="w-60 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between h-screen select-none z-30"
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-zinc-950 font-bold shadow-sm shadow-emerald-500/20 text-base">
            Σ
          </div>
          <div>
            <span className="font-bold text-zinc-100 tracking-tight text-sm block leading-tight">MEDIAVAULT</span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium block">HIGH DENSITY NODE</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1" aria-label="Main Navigation">
          <div className="text-[10px] uppercase font-bold text-zinc-500 px-3 py-1.5 tracking-widest">
            {t('library')}
          </div>
          <button
            id="nav-timeline"
            onClick={() => onViewChange('timeline')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'timeline'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <Film className="w-4 h-4 flex-shrink-0" />
            <span>{t('allPhotosAndVideos')}</span>
          </button>

          <button
            id="nav-explorer"
            onClick={() => onViewChange('explorer')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'explorer'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <FolderSearch className="w-4 h-4 flex-shrink-0" />
            <span>{t('albumsAndCollections')}</span>
          </button>

          <button
            id="nav-trash"
            onClick={() => onViewChange('trash')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'trash'
                ? 'bg-zinc-800 text-red-400 font-semibold'
                : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span>Recently Deleted</span>
          </button>
          <button
            id="nav-settings"
            onClick={() => onViewChange('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <SettingsIcon className="w-4 h-4 flex-shrink-0" />
            <span>{t('nodeSettings')}</span>
          </button>

          <div className="pt-4 text-[10px] uppercase font-bold text-zinc-500 px-3 py-1.5 tracking-widest">
            {t('aiInsights')}
          </div>

          <button
            onClick={() => onViewChange('explorer')}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-md text-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{t('objectDetection')}</span>
          </button>

          <button
            onClick={() => onViewChange('timeline')}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-md text-sm transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4 flex-shrink-0 text-sky-400" />
            <span>{t('gpsGeotagsMap')}</span>
          </button>

          {/* Project Info for Judges button */}
          <div className="pt-3 px-1">
            <button
              id="nav-architecture"
              onClick={onOpenArchitecture}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md font-medium text-xs text-amber-300 hover:text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 transition-all shadow-sm shadow-amber-950/40 cursor-pointer group"
            >
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">{t('architecture')}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Node Status & Upload Button Area */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-[11px] space-y-3">
        {/* Storage Bars */}
        {hwStatus.drives?.map((drive, idx) => (
          <div key={idx}>
            <div className="flex justify-between mb-1.5 text-zinc-400">
              <span className="truncate max-w-[140px]">{drive.name} {formatBytes(drive.usedBytes)} / {formatBytes(drive.totalBytes)}</span>
              <span className="font-mono text-emerald-400 font-semibold">{drive.percentage}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(drive.percentage || 0, 100)}%` }}></div>
            </div>
          </div>
        ))}

        {/* Tailscale Status */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-zinc-400">
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>{t('tailscaleConnected')}</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-400">{hwStatus.vpnMesh?.virtualIp}</span>
          </div>
          
          <div className="flex items-center justify-between text-zinc-400">
            <div className="flex items-center gap-2 overflow-hidden">
              <Cpu className="w-3 h-3 text-sky-400 flex-shrink-0" />
              <span className="truncate text-[10px]" title={`NVENC Active: ${hwStatus.gpuName || 'Unknown GPU'}`}>NVENC Active: {hwStatus.gpuName || 'Unknown GPU'}</span>
            </div>
          </div>
        </div>

        {/* Upload Media Button */}
        <button
          id="btn-upload-media-sidebar"
          onClick={onOpenUpload}
          className="w-full mt-2 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-emerald-900/30"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{t('uploadMedia')}</span>
        </button>
      </div>
    </aside>
  );
};
