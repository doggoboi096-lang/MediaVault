import React from 'react';
import { Image, Bell, BookImage, FileText, Smartphone, Star, Smile, MapPin, Trash2, HardDrive, Settings } from 'lucide-react';
import { SystemHardwareStatus } from '../types';
import { translations, Lang, fill, formatBytes } from '../lib/i18n';
import { ViewId } from '../lib/collections';
import { BrandMark } from './Header';

interface SidebarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
  onManageStorage: () => void;
  hwStatus: SystemHardwareStatus;
  lang: Lang;
  /** Drawer state below the lg breakpoint. */
  open: boolean;
  onClose: () => void;
}

type NavKey = keyof typeof translations.en;

const PRIMARY: { view: ViewId; label: NavKey; icon: React.ElementType }[] = [
  { view: 'photos', label: 'navPhotos', icon: Image },
  { view: 'activity', label: 'navActivity', icon: Bell },
];

const COLLECTIONS: { view: ViewId; label: NavKey; icon: React.ElementType }[] = [
  { view: 'albums', label: 'navAlbums', icon: BookImage },
  { view: 'documents', label: 'navDocuments', icon: FileText },
  { view: 'screenshots', label: 'navScreenshots', icon: Smartphone },
  { view: 'favorites', label: 'navFavorites', icon: Star },
  { view: 'people', label: 'navPeople', icon: Smile },
  { view: 'places', label: 'navPlaces', icon: MapPin },
  { view: 'trash', label: 'navTrash', icon: Trash2 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  onManageStorage,
  hwStatus,
  lang,
  open,
  onClose,
}) => {
  const t = (key: NavKey) => translations[lang][key] || key;

  const drives = hwStatus.drives || [];
  const used = drives.reduce((s, d) => s + d.usedBytes, 0);
  const total = drives.reduce((s, d) => s + d.totalBytes, 0);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;

  const renderNavItem = ({ view, label, icon: Icon }: { view: ViewId; label: NavKey; icon: React.ElementType }) => {
    const active = currentView === view;
    return (
      <button
        key={view}
        type="button"
        id={`nav-${view}`}
        onClick={() => {
          onViewChange(view);
          onClose();
        }}
        aria-current={active ? 'page' : undefined}
        className={`w-full min-h-12 flex items-center gap-5 pl-6 pr-4 py-2.5 rounded-full text-left text-[15px] transition-colors cursor-pointer ${
          active ? 'bg-accent-container text-on-accent-container font-semibold' : 'text-ink hover:bg-tile-hover'
        }`}
      >
        <Icon className="w-[22px] h-[22px] flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
        <span className="leading-snug">{t(label)}</span>
      </button>
    );
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        id="sidebar-main"
        className={`w-[264px] flex-shrink-0 flex flex-col bg-shell select-none z-40
          fixed inset-y-0 left-0 transition-transform lg:static lg:translate-x-0
          ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div className="lg:hidden h-16 flex items-center gap-2.5 pl-6 flex-shrink-0">
          <BrandMark />
          <span className="text-[22px] text-ink tracking-tight">MediaVault</span>
        </div>
        <nav className="flex-1 overflow-y-auto pl-2 pr-3 pb-4 pt-2" aria-label="Main navigation">
          {PRIMARY.map(renderNavItem)}
          {/* The header hides its gear below sm, so the drawer carries Settings there */}
          <div className="sm:hidden">{renderNavItem({ view: 'settings', label: 'settingsTitle', icon: Settings })}</div>

          <h2 className="text-[15px] font-medium text-ink pl-6 pt-7 pb-3">{t('navCollections')}</h2>
          {COLLECTIONS.map(renderNavItem)}

          <div className="mx-4 my-5 h-px bg-line" />

          <div className="px-4">
            <div className="flex items-center gap-5 pl-2 text-[15px] text-ink">
              <HardDrive className="w-[22px] h-[22px]" strokeWidth={1.8} />
              <span>{t('navStorage')}</span>
            </div>
            <div
              className="mt-4 h-1 rounded-full bg-line overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('navStorage')}
            >
              <div className="h-full bg-accent rounded-full" style={{ width: `${Math.max(pct, total ? 2 : 0)}%` }} />
            </div>
            <p className="text-sm text-ink-muted mt-2.5">
              {total > 0 ? fill(t('storageUsedOf'), { used: formatBytes(used), total: formatBytes(total) }) : '…'}
            </p>
            <button
              type="button"
              onClick={() => {
                onManageStorage();
                onClose();
              }}
              className="mt-4 w-full h-10 rounded-full border border-ink-faint text-sm font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            >
              {t('manageStorage')}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};
