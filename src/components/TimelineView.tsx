import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Heart, 
  Check, 
  Sparkles, 
  Filter, 
  Cpu, 
  Activity, 
  Layers, 
  HardDrive, 
  MapPin,
  Download,
  Share2,
  Calendar,
  Trash2,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import { MediaItem, SystemHardwareStatus } from '../types';
import { SmartMedia } from './SmartMedia';
import { translations, Lang } from '../lib/i18n';

interface TimelineViewProps {
  media: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  hwStatus: SystemHardwareStatus;
  lang: Lang;
  currentView?: string;
  onTrash?: (filenames: string[]) => void;
  onRestore?: (filenames: string[]) => void;
  onPermanentDelete?: (filenames: string[]) => void;
  onUpdateMedia?: (item: MediaItem) => void;
  onEmptyTrash?: () => void;
}

interface DateGroup {
  title: string;
  location: string;
  items: MediaItem[];
}

const LazyMediaCard: React.FC<{
  item: MediaItem;
  isSelected: boolean;
  isHeroImage: boolean;
  spanClass: string;
  onSelectMedia: (item: MediaItem) => void;
  toggleSelect: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}> = ({ item, isSelected, isHeroImage, spanClass, onSelectMedia, toggleSelect, onToggleFavorite }) => {
  const [inView, setInView] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={`media-card-${item.id}`}
      data-id={item.id}
      onClick={() => onSelectMedia(item)}
      className={`media-item-card group relative rounded-lg overflow-hidden cursor-pointer bg-zinc-900 border transition-all duration-150 select-none ${spanClass} ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-md scale-[0.99]'
          : 'border-zinc-800 hover:border-emerald-500/80 hover:shadow-lg'
      }`}
    >
      {inView ? (
        <SmartMedia item={item} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-zinc-900" />
      )}

      {/* Non-hover badges positioned cleanly away from top-left select button */}
      {item.type === 'video' && (
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none flex items-center gap-1 group-hover:opacity-0 transition-opacity">
          {item.videoMeta && (
            <div className="px-1.5 py-0.5 rounded bg-zinc-950/90 border border-zinc-800 text-zinc-200 text-[10px] font-mono flex items-center gap-1">
              <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
              <span>{item.videoMeta.duration}</span>
              <span className="text-[9px] text-zinc-500 ml-0.5">HEVC</span>
            </div>
          )}
          <div className="px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[9px] font-mono text-zinc-300">
            4K
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 z-10 pointer-events-none group-hover:opacity-0 transition-opacity flex flex-col items-end gap-1">
        {item.detectedObjects && item.detectedObjects.length > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-zinc-950/90 text-emerald-400 border border-zinc-800 text-[9px] font-mono flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {item.detectedObjects[0].label.toUpperCase()}
          </span>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1">
            {item.tags.filter(t => t !== 'uploaded' && t !== 'local').slice(0, 2).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-950/90 text-sky-400 border border-zinc-800 text-[9px] font-mono flex items-center shadow-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {(item.type === 'id_card' || item.type === 'document') && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-800/80 text-purple-300 text-[9px] font-mono font-bold z-10 pointer-events-none group-hover:opacity-0 transition-opacity">
          {item.type === 'id_card' ? 'ID' : 'OCR'}
        </div>
      )}

      {/* Hover action overlay & controls */}
      <div className={`absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent flex flex-col justify-between p-2 transition-opacity z-20 ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => toggleSelect(item.id, e)}
            className={`w-6 h-6 rounded flex items-center justify-center relative z-30 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 border border-zinc-700'
            }`}
            title="Select"
          >
            <Check className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => onToggleFavorite(item.id, e)}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors relative z-30 cursor-pointer ${
              item.isFavorite
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-900/80 text-zinc-300 hover:text-rose-400 hover:bg-zinc-800 border border-zinc-700'
            }`}
            title="Favorite"
          >
            <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="space-y-1 relative z-30">
          <p className="text-[11px] font-semibold text-zinc-100 truncate font-mono">
            {item.title || item.filename}
          </p>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>{item.exif?.dimensions || (item.type === 'video' ? '4K UHD' : '')}</span>
            <span>{item.exif?.size}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatBytes = (bytes: number) => {
  if (bytes == null || isNaN(bytes)) return '0 GB';
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(1) + ' MB';
  return (bytes / (1024 ** 3)).toFixed(1) + ' GB';
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  media,
  onSelectMedia,
  onToggleFavorite,
  hwStatus,
  lang,
  currentView,
  onTrash,
  onRestore,
  onPermanentDelete,
  onUpdateMedia,
  onEmptyTrash
}) => {
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'favorite' | 'id_card'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedShare, setCopiedShare] = useState(false);
  const [liveHwStatus, setLiveHwStatus] = useState(hwStatus);

  // Drag-to-select state
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const t = (key: keyof typeof translations.en) => translations[lang]?.[key] || key;

  // Live RAM/CPU polling every 3 seconds
  useEffect(() => {
    setLiveHwStatus(hwStatus);
  }, [hwStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/system')
        .then(res => res.json())
        .then(data => { if (data.success && data.data) setLiveHwStatus(data.data); })
        .catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Filter items
  const filteredMedia = media.filter((item) => {
    if (filterType === 'image') return item.type === 'image';
    if (filterType === 'video') return item.type === 'video';
    if (filterType === 'favorite') return !!item.isFavorite;
    if (filterType === 'id_card') return item.type === 'id_card' || item.type === 'document';
    return true;
  });

  // Sort filtered media chronologically descending (newest to oldest)
  const sortedMedia = [...filteredMedia].sort((a, b) => {
    const rawA = a.date || a.exif?.dateTaken || '';
    const rawB = b.date || b.exif?.dateTaken || '';
    const timeA = rawA ? new Date(rawA.replace(/-/g, '/')).getTime() : 0;
    const timeB = rawB ? new Date(rawB.replace(/-/g, '/')).getTime() : 0;
    if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB)) {
      return timeB - timeA;
    }
    return rawB.localeCompare(rawA);
  });

  // Group by dateFormatted
  const groupedDates = sortedMedia.reduce((acc, item) => {
    const groupKey = item.dateFormatted || item.date || 'Other';
    if (!acc[groupKey]) {
      acc[groupKey] = {
        title: groupKey,
        location: item.location ? `${item.location.city || item.location.name || ''}, ${item.location.country === 'United States' ? 'CA' : (item.location.country || '')}`.replace(/^, |, $/g, '') : '',
        items: []
      };
    }
    acc[groupKey].items.push(item);
    return acc;
  }, {} as Record<string, DateGroup>);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Action 1: Download
  const handleBulkDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const selectedItems = media.filter((m) => selectedIds.includes(m.id));
    selectedItems.forEach((item, index) => {
      const downloadUrl = item.originalHeicUrl || item.url;
      if (downloadUrl) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = item.title || item.filename || `media-${item.id}`;
          // If we are downloading the HEIC vault copy, we can restore the extension
          if (item.originalHeicUrl && link.download.endsWith('.jpg')) {
            link.download = link.download.replace(/\.jpg$/i, '.heic');
          }
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 120);
      }
    });
  };

  // Bulk Action 2: Share (Copy URLs to clipboard)
  const handleBulkShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const selectedItems = media.filter((m) => selectedIds.includes(m.id));
    const urls = selectedItems
      .map((m) => (m.url.startsWith('http') ? m.url : `${window.location.origin}${m.url}`))
      .join('\n');

    try {
      await navigator.clipboard.writeText(urls);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // Bulk Action 3: Edit Date
  const handleBulkDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) return;
    const newFormatted = new Date(newDate).toLocaleDateString();
    const selectedItems = media.filter((m) => selectedIds.includes(m.id));
    selectedItems.forEach((item) => {
      const updated: MediaItem = {
        ...item,
        date: newDate,
        dateFormatted: newFormatted,
        exif: {
          ...(item.exif || {}),
          dateTaken: `${newDate} ${item.exif?.dateTaken?.split(' ')[1] || '00:00:00'}`
        }
      };
      if (onUpdateMedia) {
        onUpdateMedia(updated);
      }
    });
  };

  // Drag-to-select logic handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setStartPos({ x, y });
        setCurrentPos({ x, y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCurrentPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && containerRef.current) {
      setIsDragging(false);
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollY = containerRef.current.scrollTop;
      const scrollX = containerRef.current.scrollLeft;
      
      const left = Math.min(startPos.x, currentPos.x) + scrollX;
      const right = Math.max(startPos.x, currentPos.x) + scrollX;
      const top = Math.min(startPos.y, currentPos.y) + scrollY;
      const bottom = Math.max(startPos.y, currentPos.y) + scrollY;

      const cards = containerRef.current.querySelectorAll('.media-item-card');
      const newlySelected = new Set(selectedIds);
      
      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const cLeft = rect.left - containerRect.left + scrollX;
        const cRight = rect.right - containerRect.left + scrollX;
        const cTop = rect.top - containerRect.top + scrollY;
        const cBottom = rect.bottom - containerRect.top + scrollY;

        const intersects = !(right < cLeft || left > cRight || bottom < cTop || top > cBottom);
        if (intersects) {
          const id = card.getAttribute('data-id');
          if (id) newlySelected.add(id);
        }
      });
      
      setSelectedIds(Array.from(newlySelected));
    }
  };

  let selectionBoxStyle = {};
  if (isDragging) {
    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    selectionBoxStyle = { left, top, width, height };
  }

  return (
    <div 
      id="timeline-container" 
      className="p-6 space-y-6 max-w-[1700px] mx-auto select-none relative"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isDragging && (
        <div 
          className="absolute border border-emerald-400 bg-emerald-500/20 z-50 pointer-events-none"
          style={selectionBoxStyle}
        />
      )}
      {/* High-Density System Stat Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t('totalItems')}</div>
            <div className="text-lg font-bold font-mono text-zinc-100">{media.length.toLocaleString()}</div>
          </div>
          <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono text-xs">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {liveHwStatus.drives?.map((drive, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{drive.name} (DUNG LƯỢNG)</div>
            <div className="text-xl font-bold text-zinc-100">{(drive.usedBytes / 1024**3).toFixed(1)} GB / {(drive.totalBytes / 1024**3).toFixed(1)} GB</div>
            <div className="w-full bg-zinc-800 h-1.5 mt-3 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${drive.percentage}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Filter Bar & Bulk Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-md border border-zinc-800">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('allMedia')} ({media.length})
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'image'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('photos')} ({media.filter(m => m.type === 'image').length})
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'video'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            4K {t('videos')} ({media.filter(m => m.type === 'video').length})
          </button>
          <button
            onClick={() => setFilterType('favorite')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'favorite'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('favorites')} ({media.filter(m => m.isFavorite).length})
          </button>
          <button
            onClick={() => setFilterType('id_card')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              filterType === 'id_card'
                ? 'bg-zinc-800 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            IDs & {t('documents')} ({media.filter(m => m.type === 'id_card' || m.type === 'document').length})
          </button>
          
          {currentView === 'trash' && (
            <button
              onClick={() => {
                 if (onEmptyTrash && window.confirm('Empty all items from Trash? This cannot be undone.')) {
                   onEmptyTrash();
                   setSelectedIds([]);
                 }
              }}
              className="flex items-center gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded text-xs font-medium cursor-pointer active:scale-95 transition-transform ml-4"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        {/* Selected Counter & Bulk Actions Banner */}
        {selectedIds.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 bg-zinc-900 border border-emerald-500/50 px-3 py-1.5 rounded-md text-xs text-emerald-400 shadow-lg animate-in fade-in">
            <span className="font-mono font-semibold">
              {t('selectedCount').replace('{count}', selectedIds.length.toString())}
            </span>

            <button
              onClick={() => setSelectedIds([])}
              className="text-zinc-400 hover:text-white text-[11px] px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
              title={t('deselect')}
            >
              {t('deselect')}
            </button>

            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

            {/* Bulk Action: Download */}
            <button
              onClick={handleBulkDownload}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
              title={t('download')}
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('download')}</span>
            </button>

            {/* Bulk Action: Share */}
            <button
              onClick={handleBulkShare}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
              title={t('share')}
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedShare ? t('copied') : t('share')}</span>
            </button>

            {/* Bulk Action: Edit Date */}
            <div className="flex items-center gap-1 bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded text-xs font-medium border border-zinc-700">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[11px] text-zinc-400">{t('editDateBulk')}:</span>
              <input
                type="date"
                onChange={handleBulkDateChange}
                className="bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px] focus:outline-none focus:border-emerald-500 cursor-pointer"
              />
            </div>

            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

            {/* Trash / Restore / Delete actions */}
            {currentView === 'trash' ? (
              <>
                <button
                  onClick={() => {
                     const selectedFilenames = media.filter(m => selectedIds.includes(m.id)).map(m => m.filename);
                     if (onRestore) onRestore(selectedFilenames);
                     setSelectedIds([]);
                  }}
                  className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2.5 py-1 rounded text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('restoreSelected')}</span>
                </button>
                <button
                  onClick={() => {
                     const selectedFilenames = media.filter(m => selectedIds.includes(m.id)).map(m => m.filename);
                     if (onPermanentDelete && window.confirm('Permanently delete selected items? This cannot be undone.')) {
                       onPermanentDelete(selectedFilenames);
                       setSelectedIds([]);
                     }
                  }}
                  className="flex items-center gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t('deletePermanently')}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                   const selectedFilenames = media.filter(m => selectedIds.includes(m.id)).map(m => m.filename);
                   if (onTrash) onTrash(selectedFilenames);
                   setSelectedIds([]);
                }}
                className="flex items-center gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1 rounded text-xs font-medium cursor-pointer active:scale-95 transition-transform"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('trashSelected')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Date-Grouped Media Sections */}
      {(Object.values(groupedDates) as DateGroup[]).map((group) => (
        <section key={group.title} className="space-y-3">
          {/* Group Header: Date (left) and Location (right) */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>{group.title}</span>
              <span className="text-xs font-mono text-zinc-500 font-normal">({group.items.length} files)</span>
            </h2>
            {group.location && (
              <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {group.location}
              </span>
            )}
          </div>

          {/* Photo & Video Grid with Dynamic Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 auto-rows-[160px]">
            {group.items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isHeroImage = (item.title || item.filename).includes('Tokyo_Rain_Night');
              const spanClass = isHeroImage
                ? 'col-span-2 row-span-2'
                : 'col-span-1 row-span-1';

              return (
                <LazyMediaCard
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  isHeroImage={isHeroImage}
                  spanClass={spanClass}
                  onSelectMedia={onSelectMedia}
                  toggleSelect={toggleSelect}
                  onToggleFavorite={onToggleFavorite}
                />
              );
            })}
          </div>
        </section>
      ))}

      {filteredMedia.length === 0 && (
        <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
          <Filter className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-zinc-300">No media items found</h3>
          <p className="text-xs text-zinc-500 mt-1">Try clearing filters or scanning a new directory</p>
        </div>
      )}
    </div>
  );
};
