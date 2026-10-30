import React, { useState, useEffect, useRef } from 'react';
import { Play, Star, Check, X, Download, Share2, CalendarDays, Trash2, RotateCcw, FileText } from 'lucide-react';
import { MediaItem } from '../types';
import { SmartMedia } from './SmartMedia';
import { Chip, IconButton } from './ui';
import { translations, Lang, fill } from '../lib/i18n';
import { isDocument } from '../lib/collections';

interface TimelineViewProps {
  media: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  lang: Lang;
  /** 'trash' swaps the bulk actions for restore / delete permanently. */
  mode?: 'library' | 'trash';
  showFilters?: boolean;
  emptyState?: React.ReactNode;
  onTrash?: (filenames: string[]) => void;
  onRestore?: (filenames: string[]) => void;
  onPermanentDelete?: (filenames: string[]) => void;
  onUpdateMedia?: (item: MediaItem) => void;
}

type Filter = 'all' | 'image' | 'video' | 'favorite' | 'document';

interface DateGroup {
  key: string;
  title: string;
  places: string;
  items: MediaItem[];
}

const LazyTile: React.FC<{
  item: MediaItem;
  isSelected: boolean;
  selecting: boolean;
  onOpen: (item: MediaItem) => void;
  toggleSelect: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}> = ({ item, isSelected, selecting, onOpen, toggleSelect, onToggleFavorite }) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={`media-card-${item.id}`}
      data-id={item.id}
      onClick={e => (selecting ? toggleSelect(item.id, e) : onOpen(item))}
      className={`media-item-card group relative aspect-square cursor-pointer select-none overflow-hidden transition-colors ${
        isSelected ? 'bg-accent-container/60' : 'bg-tile'
      }`}
    >
      <div className={`absolute transition-all duration-150 ${isSelected ? 'inset-3 rounded-lg overflow-hidden' : 'inset-0'}`}>
        {inView && <SmartMedia item={item} fit="cover" className="w-full h-full" />}
      </div>

      {/* Top scrim + select control */}
      <div
        className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent transition-opacity ${
          selecting && !isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${isSelected ? '!opacity-0' : ''}`}
      />
      <button
        type="button"
        onClick={e => toggleSelect(item.id, e)}
        aria-label={isSelected ? 'Deselect' : 'Select'}
        aria-pressed={isSelected}
        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity cursor-pointer ${
          isSelected
            ? 'bg-accent text-on-accent opacity-100'
            : `border-2 border-white/90 text-transparent hover:text-white/90 ${selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
        }`}
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </button>

      {item.type === 'video' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-white text-xs font-medium drop-shadow pointer-events-none">
          {item.videoMeta?.duration && <span>{item.videoMeta.duration}</span>}
          <Play className="w-4 h-4 fill-current" />
        </div>
      )}

      {isDocument(item) && (
        <FileText className="absolute bottom-2 right-2 w-4 h-4 text-white drop-shadow pointer-events-none" />
      )}

      <button
        type="button"
        onClick={e => onToggleFavorite(item.id, e)}
        aria-label="Favorite"
        aria-pressed={!!item.isFavorite}
        className={`absolute bottom-1.5 left-1.5 w-7 h-7 flex items-center justify-center rounded-full text-white drop-shadow transition-opacity cursor-pointer ${
          item.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <Star className={`w-[18px] h-[18px] ${item.isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  media,
  onSelectMedia,
  onToggleFavorite,
  lang,
  mode = 'library',
  showFilters = false,
  emptyState,
  onTrash,
  onRestore,
  onPermanentDelete,
  onUpdateMedia,
}) => {
  const [filterType, setFilterType] = useState<Filter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedShare, setCopiedShare] = useState(false);
  const t = (key: keyof typeof translations.en) => translations[lang]?.[key] || key;

  // Drag-to-select (hold Shift)
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Drop selections that no longer exist (e.g. after trashing).
  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => media.some(m => m.id === id)));
  }, [media]);

  const counts: Record<Filter, number> = {
    all: media.length,
    image: media.filter(m => m.type === 'image').length,
    video: media.filter(m => m.type === 'video').length,
    favorite: media.filter(m => m.isFavorite).length,
    document: media.filter(isDocument).length,
  };

  const filteredMedia = media.filter(item => {
    if (filterType === 'image') return item.type === 'image';
    if (filterType === 'video') return item.type === 'video';
    if (filterType === 'favorite') return !!item.isFavorite;
    if (filterType === 'document') return isDocument(item);
    return true;
  });

  const timeOf = (m: MediaItem) => {
    const raw = m.date || m.exif?.dateTaken || '';
    const time = raw ? new Date(raw.replace(/-/g, '/')).getTime() : 0;
    return isNaN(time) ? 0 : time;
  };
  const sortedMedia = [...filteredMedia].sort((a, b) => timeOf(b) - timeOf(a));

  const dateFormatter = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const groups: DateGroup[] = [];
  for (const item of sortedMedia) {
    const key = item.date || 'unknown';
    let group = groups.find(g => g.key === key);
    if (!group) {
      const time = timeOf(item);
      const label = time ? dateFormatter.format(time) : item.dateFormatted || key;
      group = { key, title: label.charAt(0).toUpperCase() + label.slice(1), places: '', items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  for (const g of groups) {
    const names = [...new Set(g.items.map(i => i.location?.city || i.location?.name).filter(n => n && n !== 'Unknown Location' && n !== 'GPS Location'))];
    g.places = names.join(', ');
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const selectedItems = media.filter(m => selectedIds.includes(m.id));
  const selectedFilenames = selectedItems.map(m => m.filename);

  const handleBulkDownload = () => {
    selectedItems.forEach((item, index) => {
      const downloadUrl = item.originalHeicUrl || item.url;
      if (!downloadUrl) return;
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = item.title || item.filename || `media-${item.id}`;
        // Restore the extension when downloading the original HEIC vault copy
        if (item.originalHeicUrl && link.download.endsWith('.jpg')) {
          link.download = link.download.replace(/\.jpg$/i, '.heic');
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 120);
    });
  };

  const handleBulkShare = async () => {
    const urls = selectedItems.map(m => (m.url.startsWith('http') ? m.url : `${window.location.origin}${m.url}`)).join('\n');
    try {
      await navigator.clipboard.writeText(urls);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleBulkDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate || !onUpdateMedia) return;
    const newFormatted = new Date(newDate).toLocaleDateString();
    selectedItems.forEach(item =>
      onUpdateMedia({
        ...item,
        date: newDate,
        dateFormatted: newFormatted,
        exif: { ...(item.exif || {}), dateTaken: `${newDate} ${item.exif?.dateTaken?.split(' ')[1] || '00:00:00'}` },
      })
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setStartPos(pos);
      setCurrentPos(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCurrentPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);
    const containerRect = containerRef.current.getBoundingClientRect();
    const left = Math.min(startPos.x, currentPos.x);
    const right = Math.max(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const bottom = Math.max(startPos.y, currentPos.y);
    const next = new Set(selectedIds);
    containerRef.current.querySelectorAll('.media-item-card').forEach(card => {
      const r = card.getBoundingClientRect();
      const cLeft = r.left - containerRect.left;
      const cTop = r.top - containerRect.top;
      const intersects = !(right < cLeft || left > cLeft + r.width || bottom < cTop || top > cTop + r.height);
      const id = card.getAttribute('data-id');
      if (intersects && id) next.add(id);
    });
    setSelectedIds([...next]);
  };

  const selectionBoxStyle = isDragging
    ? {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
      }
    : {};

  const selecting = selectedIds.length > 0;

  return (
    <div className="relative">
      {/* Selection bar replaces the filters while items are selected */}
      {selecting ? (
        <div className="sticky top-0 z-20 h-16 px-3 sm:px-4 flex items-center gap-2 bg-panel/95 backdrop-blur border-b border-line">
          <IconButton label={t('deselect')} onClick={() => setSelectedIds([])}>
            <X className="w-5 h-5" />
          </IconButton>
          <span className="text-[17px] text-ink">{fill(t('selectedCount'), { count: selectedIds.length })}</span>
          <div className="ml-auto flex items-center gap-0.5">
            <IconButton label={t('download')} onClick={handleBulkDownload}>
              <Download className="w-5 h-5" />
            </IconButton>
            <IconButton label={copiedShare ? t('copied') : t('share')} onClick={handleBulkShare}>
              {copiedShare ? <Check className="w-5 h-5 text-accent" /> : <Share2 className="w-5 h-5" />}
            </IconButton>
            {onUpdateMedia && (
              <label
                title={t('editDateBulk')}
                className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-tile-hover cursor-pointer"
              >
                <CalendarDays className="w-5 h-5" />
                <span className="sr-only">{t('editDateBulk')}</span>
                <input
                  type="date"
                  onChange={handleBulkDateChange}
                  className="absolute inset-0 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </label>
            )}
            {mode === 'trash' ? (
              <>
                <IconButton
                  label={t('restoreSelected')}
                  onClick={() => {
                    onRestore?.(selectedFilenames);
                    setSelectedIds([]);
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                </IconButton>
                <IconButton
                  label={t('deletePermanently')}
                  onClick={() => {
                    if (onPermanentDelete && window.confirm(t('confirmDeleteSelected'))) {
                      onPermanentDelete(selectedFilenames);
                      setSelectedIds([]);
                    }
                  }}
                >
                  <Trash2 className="w-5 h-5 text-[#f2a39a]" />
                </IconButton>
              </>
            ) : (
              <IconButton
                label={t('trashSelected')}
                onClick={() => {
                  onTrash?.(selectedFilenames);
                  setSelectedIds([]);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </IconButton>
            )}
          </div>
        </div>
      ) : (
        showFilters &&
        media.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-4 sm:px-6 pt-5 pb-1">
            {(
              [
                ['all', t('all')],
                ['image', t('photos')],
                ['video', t('videos')],
                ['favorite', t('favorites')],
                ['document', t('documents')],
              ] as [Filter, string][]
            )
              .filter(([f]) => f === 'all' || counts[f] > 0)
              .map(([f, label]) => (
                <Chip key={f} selected={filterType === f} onClick={() => setFilterType(f)}>
                  {label}
                  <span className="text-ink-muted font-normal">{counts[f]}</span>
                </Chip>
              ))}
          </div>
        )
      )}

      <div
        id="timeline-container"
        ref={containerRef}
        className="relative px-1 sm:px-6 pb-10 select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isDragging && <div className="absolute border border-accent bg-accent/15 z-30 pointer-events-none" style={selectionBoxStyle} />}

        {groups.map(group => (
          <section key={group.key} className="pt-6">
            <div className="px-3 sm:px-0 pb-3">
              <h2 className="text-[15px] font-medium text-ink">{group.title}</h2>
              {group.places && <p className="text-[13px] text-ink-muted mt-0.5">{group.places}</p>}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-1">
              {group.items.map(item => (
                <LazyTile
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.includes(item.id)}
                  selecting={selecting}
                  onOpen={onSelectMedia}
                  toggleSelect={toggleSelect}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </section>
        ))}

        {filteredMedia.length === 0 && emptyState}
      </div>
    </div>
  );
};
