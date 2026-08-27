import React, { useState } from 'react';
import { Search, Bell, Upload, Sparkles, CheckCircle2, Shield, HardDrive, Cpu, X, Globe } from 'lucide-react';
import { IndexingActivity, SystemHardwareStatus } from '../types';
import { translations, Lang } from '../lib/i18n';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCommandPalette: () => void;
  onOpenUpload: () => void;
  activities: IndexingActivity[];
  hwStatus: SystemHardwareStatus;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const formatBytes = (bytes: number) => {
  if (bytes == null || isNaN(bytes)) return '0 GB';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(1) + ' GB';
};

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenCommandPalette,
  onOpenUpload,
  activities,
  hwStatus,
  lang,
  setLang
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  return (
    <header 
      id="top-header"
      className="h-14 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-6 flex items-center justify-between z-20 sticky top-0"
    >
      {/* Central Search Bar */}
      <div className="flex items-center gap-4 flex-1">
        <div 
          onClick={onOpenCommandPalette}
          className="relative w-96 group cursor-pointer"
        >
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none" />
          <input
            id="input-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-zinc-800 border-none rounded-md py-1.5 pl-10 pr-12 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          />
          <div className="absolute right-2.5 top-2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-700/60 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls: YOLOv8 status, Notifications, Upload Media, User Avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end mr-3">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">YOLOv8 Local</span>
          <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('processingActive')}
          </span>
        </div>

        {/* Upload Media Button */}
        <button
          id="btn-header-upload-media"
          onClick={onOpenUpload}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-900/30 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{t('uploadMedia')}</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 text-zinc-300 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? '🇬🇧 EN' : '🇻🇳 VI'}</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="btn-notification-bell"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="w-8 h-8 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 flex items-center justify-center text-zinc-300 hover:text-white transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5" />
          </button>

          {/* Notification Popup Dropdown */}
          {showNotifications && (
            <div 
              id="dropdown-notifications"
              className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Background Pipeline</h4>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2 space-y-1.5 max-h-64 overflow-y-auto">
                {activities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{act.title}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{act.timeAgo}</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span>{act.description}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 font-mono">
                  <Cpu className="w-3 h-3 text-sky-400" />
                  GPU: {hwStatus.gpuUsage}%
                </span>
                <span className="text-emerald-400 font-mono font-medium">YOLOv8 Active (14ms)</span>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Node Profile */}
        <div className="relative">
          <button
            id="btn-user-avatar"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="w-8 h-8 rounded-md overflow-hidden border border-emerald-500/50 hover:border-emerald-400 transition-colors flex-shrink-0 focus:outline-none cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
              alt="Admin Profile"
              className="w-full h-full object-cover"
            />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div 
              id="dropdown-user-menu"
              className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                  alt="Admin"
                  className="w-9 h-9 rounded-md object-cover"
                />
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">Self-Hosted Admin</h4>
                  <p className="text-xs text-zinc-400 font-mono">root@vault.lan</p>
                </div>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    VPN Mesh
                  </span>
                  <span className="font-mono text-emerald-400">Tailscale (100.84.192.42)</span>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    Storage Used
                  </span>
                  <span className="font-mono text-zinc-300">{formatBytes(hwStatus.storageUsed)} / {formatBytes(hwStatus.storageTotal)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-center py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
