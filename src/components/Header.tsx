import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, HelpCircle, Settings, Menu, X, Languages, LogOut, Sparkles, Loader2 } from 'lucide-react';
import { translations, Lang, fill } from '../lib/i18n';
import { QueueProgress } from '../types';
import { IconButton } from './ui';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder: string;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onOpenProjectInfo: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  /** Owner email from the server session. */
  userEmail: string;
  /** Live AI queue counters; the chip shows while photos are waiting. */
  queue: QueueProgress | null;
  onOpenAiSettings: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const BrandMark: React.FC = () => (
  <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#203a62" />
    <circle cx="16" cy="14" r="6" fill="none" stroke="#a8c3ff" strokeWidth="2.6" />
    <path d="M16 18.5v6" stroke="#a8c3ff" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="16" cy="14" r="1.8" fill="#f2b84b" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
  onOpenUpload,
  onOpenSettings,
  onOpenProjectInfo,
  onToggleSidebar,
  onLogout,
  userEmail,
  queue,
  onOpenAiSettings,
  lang,
  setLang,
}) => {
  const [showAccount, setShowAccount] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const displayName = userEmail ? userEmail.split('@')[0] : t('guestNode');

  // "/" focuses search, like most photo libraries.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header id="top-header" className="h-16 flex items-center gap-2 px-2 sm:px-4 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-1 lg:w-[248px] flex-shrink-0">
        <IconButton label={t('openMenu')} onClick={onToggleSidebar} className="lg:hidden">
          <Menu className="w-5 h-5" />
        </IconButton>
        <div className="flex items-center gap-2.5 pl-1 lg:pl-3">
          <BrandMark />
          <span className="text-[22px] font-normal text-ink tracking-tight hidden sm:inline">MediaVault</span>
        </div>
      </div>

      {/* Search */}
      <form
        role="search"
        onSubmit={e => e.preventDefault()}
        className="flex-1 min-w-0 max-w-[720px] h-12 rounded-full bg-tile focus-within:bg-[#2e3136] flex items-center gap-1 pl-1 pr-1 sm:pl-2 sm:pr-2 transition-colors"
      >
        <IconButton label={t('searchGeneric')} onClick={() => inputRef.current?.focus()}>
          <Search className="w-5 h-5" />
        </IconButton>
        <input
          ref={inputRef}
          id="input-global-search"
          type="search"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label={t('searchGeneric')}
          className="flex-1 min-w-0 bg-transparent text-[15px] text-ink placeholder-ink-muted outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {searchQuery && (
          <IconButton label={t('clearSearch')} onClick={() => onSearchChange('')}>
            <X className="w-5 h-5" />
          </IconButton>
        )}
      </form>

      {/* Actions */}
      <div className="flex items-center gap-0.5 ml-auto pl-2">
        {queue && queue.pending + queue.processing > 0 && (
          <button
            type="button"
            id="ai-queue-chip"
            onClick={onOpenAiSettings}
            aria-live="polite"
            className="h-9 px-3 mr-1 rounded-full bg-tile hover:bg-tile-hover hidden md:flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            {queue.processing > 0 && !queue.blockedBy ? (
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-accent" />
            )}
            {fill(
              t(
                queue.blockedBy === 'paused'
                  ? 'aiChipPaused'
                  : queue.blockedBy === 'on-battery'
                    ? 'aiChipOnBattery'
                    : queue.blockedBy === 'ai-unavailable'
                      ? 'aiChipUnavailable'
                      : 'aiChipRemaining'
              ),
              { n: queue.pending + queue.processing }
            )}
          </button>
        )}
        <IconButton label={t('uploadMedia')} onClick={onOpenUpload}>
          <Plus className="w-6 h-6" />
        </IconButton>
        <IconButton label={t('helpProject')} onClick={onOpenProjectInfo} className="hidden sm:flex">
          <HelpCircle className="w-[22px] h-[22px]" />
        </IconButton>
        <IconButton label={t('settingsTitle')} onClick={onOpenSettings} className="hidden sm:flex">
          <Settings className="w-[22px] h-[22px]" />
        </IconButton>
        <button
          type="button"
          onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
          title={t('switchLanguage')}
          aria-label={t('switchLanguage')}
          className="h-10 px-3 rounded-full hidden sm:flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink hover:bg-tile-hover transition-colors cursor-pointer"
        >
          <Languages className="w-[18px] h-[18px]" />
          {lang === 'vi' ? 'VI' : 'EN'}
        </button>

        <div className="relative ml-1">
          <button
            type="button"
            id="btn-user-avatar"
            onClick={() => setShowAccount(v => !v)}
            aria-label={displayName}
            aria-expanded={showAccount}
            className="w-10 h-10 rounded-full p-[3px] ring-2 ring-accent-strong/80 hover:ring-accent transition-shadow cursor-pointer"
          >
            <span className="w-full h-full rounded-full bg-accent-container text-on-accent-container flex items-center justify-center text-sm font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </button>

          {showAccount && (
            <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-[#26282c] shadow-2xl shadow-black/50 p-4 z-50">
              <p className="text-center text-sm text-ink-muted truncate">{userEmail || 'localhost'}</p>
              <p className="text-center text-xl text-ink mt-2 truncate">{displayName}</p>
              <button
                type="button"
                onClick={() => {
                  setShowAccount(false);
                  onOpenSettings();
                }}
                className="mt-4 w-full h-10 rounded-full border border-ink-faint text-sm font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer"
              >
                {t('settingsTitle')}
              </button>
              <button
                type="button"
                id="btn-sign-out"
                onClick={() => {
                  setShowAccount(false);
                  onLogout();
                }}
                className="mt-2 w-full h-10 rounded-full flex items-center justify-center gap-2 text-sm font-medium text-ink hover:bg-tile-hover transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
