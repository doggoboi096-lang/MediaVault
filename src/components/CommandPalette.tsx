import React, { useState, useEffect } from 'react';
import { Search, Film, Image as ImageIcon, MapPin, Tag, Contact, FileText, Settings, X } from 'lucide-react';
import { MediaItem, SmartCollection } from '../types';
import { SmartMedia } from './SmartMedia';
import { translations, Lang } from '../lib/i18n';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem[];
  collections: SmartCollection[];
  onSelectMedia: (item: MediaItem) => void;
  onSelectCollection: (col: SmartCollection) => void;
  onNavigateView: (view: 'timeline' | 'explorer' | 'settings') => void;
  lang: Lang;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  media,
  collections,
  onSelectMedia,
  onSelectCollection,
  onNavigateView,
  lang
}) => {
  const [query, setQuery] = useState('');
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredMedia = media.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.filename.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q)) ||
      m.location?.name.toLowerCase().includes(q) ||
      m.location?.city.toLowerCase().includes(q) ||
      m.detectedObjects?.some((d) => d.label.toLowerCase().includes(q)) ||
      m.ocrData?.extractedText.some((text) => text.toLowerCase().includes(q))
    );
  }).slice(0, 6);

  const filteredCollections = collections.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  return (
    <div 
      id="command-palette-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-950">
          <Search className="w-4 h-4 text-zinc-500 mr-2.5 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            autoFocus
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 rounded border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 text-xs">
          {/* Smart Collections Section */}
          {filteredCollections.length > 0 && (
            <div>
              <span className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">
                {t('smartCollections')}
              </span>
              <div className="space-y-0.5 mt-0.5">
                {filteredCollections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onSelectCollection(col);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-zinc-800 text-zinc-200 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                        {col.id === 'col-id' ? <Contact className="w-3.5 h-3.5" /> : col.id === 'col-doc' ? <FileText className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-100 text-xs">{col.title}</span>
                        <p className="text-[11px] text-zinc-400 truncate max-w-sm">{col.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{col.itemsCount} items</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Media Items Section */}
          {filteredMedia.length > 0 && (
            <div>
              <span className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">
                {t('indexedMedia')}
              </span>
              <div className="space-y-0.5 mt-0.5">
                {filteredMedia.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectMedia(item);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-zinc-800 text-zinc-200 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <SmartMedia item={item} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-zinc-800" />
                      <div>
                        <span className="font-medium text-zinc-200 block truncate max-w-md text-xs">{item.title || item.filename}</span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          {item.location && (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <MapPin className="w-2.5 h-2.5" />
                              {item.location.name}
                            </span>
                          )}
                          <span>{item.exif?.dimensions}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{item.dateFormatted}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <span className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">
              {t('quickNavigation')}
            </span>
            <div className="grid grid-cols-3 gap-1.5 mt-0.5 px-0.5">
              <button
                onClick={() => {
                  onNavigateView('timeline');
                  onClose();
                }}
                className="p-2 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 border border-zinc-800 transition-colors cursor-pointer text-xs font-mono"
              >
                <Film className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('timeline')}</span>
              </button>
              <button
                onClick={() => {
                  onNavigateView('explorer');
                  onClose();
                }}
                className="p-2 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 border border-zinc-800 transition-colors cursor-pointer text-xs font-mono"
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>{'Explorer'}</span>
              </button>
              <button
                onClick={() => {
                  onNavigateView('settings');
                  onClose();
                }}
                className="p-2 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2 border border-zinc-800 transition-colors cursor-pointer text-xs font-mono"
              >
                <Settings className="w-3.5 h-3.5 text-sky-400" />
                <span>{'Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
