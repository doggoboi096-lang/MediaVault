import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, HelpCircle, Settings, Menu, X, Languages } from 'lucide-react';
import { auth } from '../lib/firebase';
import { translations, Lang } from '../lib/i18n';
import { IconButton } from './ui';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder: string;
  onOpenUpload: () => void;
  onOpenSettings: () => void;
  onOpenProjectInfo: () => void;
  onToggleSidebar: () => void;
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
  lang,
  setLang,
}) => {
  const [showAccount, setShowAccount] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const user = auth.currentUser;
  const displayName = user?.displayName || t('guestNode');

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
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="w-full h-full rounded-full bg-accent-container text-on-accent-container flex items-center justify-center text-sm font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {showAccount && (
            <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-[#26282c] shadow-2xl shadow-black/50 p-4 z-50">
              <p className="text-center text-sm text-ink-muted">{user?.email || 'localhost'}</p>
              <p className="text-center text-xl text-ink mt-2">{displayName}</p>
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
