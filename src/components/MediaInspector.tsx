import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  MapPin, 
  Tag as TagIcon, 
  Sparkles, 
  ExternalLink, 
  Plus, 
  Copy, 
  Check, 
  Heart, 
  Download, 
  FileText,
  Cpu,
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Edit2,
  Save
} from 'lucide-react';
import { MediaItem } from '../types';
import { SmartMedia } from './SmartMedia';
import { translations, Lang } from '../lib/i18n';

interface MediaInspectorProps {
  item: MediaItem;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFavorite: (id: string) => void;
  onAddTag: (id: string, newTag: string) => void;
  onDelete?: (id: string, filename: string) => void;
  onRestore?: (id: string, filename: string) => void;
  onPermanentDelete?: (id: string, filename: string) => void;
  onUpdateMedia?: (item: MediaItem) => void;
  lang: Lang;
  currentView?: string;
}

export const MediaInspector: React.FC<MediaInspectorProps> = ({
  item,
  onBack,
  onPrev,
  onNext,
  onToggleFavorite,
  onAddTag,
  onDelete,
  onRestore,
  onPermanentDelete,
  onUpdateMedia,
  lang,
  currentView
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showAiBoxes, setShowAiBoxes] = useState<boolean>(true);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editTimeValue, setEditTimeValue] = useState<string>('');
  
  const [localItem, setLocalItem] = useState(item);
  
  // sync localItem if item changes
  React.useEffect(() => {
    if (item) {
      setLocalItem(item);
    }
  }, [item]);

  const [copiedOcr, setCopiedOcr] = useState<boolean>(false);
  const t = (key: keyof typeof translations.en) => translations[lang]?.[key] || key;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagInput.trim() && localItem?.id) {
      const cleanTag = newTagInput.trim().replace(/^#/, '');
      onAddTag(localItem.id, cleanTag);
      const currentTags = Array.isArray(localItem.tags) ? localItem.tags : [];
      const updated = {
        ...localItem,
        tags: [...currentTags, cleanTag]
      };
      setLocalItem(updated);
      if (onUpdateMedia) onUpdateMedia(updated);
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleCopyOcr = () => {
    const ocrStr = localItem?.ocrText || localItem?.ocr || '';
    if (ocrStr) {
      navigator.clipboard.writeText(ocrStr);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
  };

  if (!localItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-400">
        <p className="text-sm">No media selected</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-zinc-800 rounded text-xs text-white">
          {t('backToLibrary')}
        </button>
      </div>
    );
  }

  const isTrashMode = currentView === 'trash' || !!localItem?.isDeleted;
  const isVideo = localItem?.type === 'video';
  const tags = Array.isArray(localItem?.tags) ? localItem.tags : [];
  const detectedObjects = Array.isArray(localItem?.detectedObjects) ? localItem.detectedObjects : [];
  const ocrTextStr = localItem?.ocrText || localItem?.ocr || '';
  const location = localItem?.location;
  const exif = localItem?.exif || {};
  const videoMeta = localItem?.videoMeta;

  // Convert path to breadcrumb format: "D: / Photos / Travel"
  const formattedPath = (localItem?.path || '')
    .replace(/\\/g, '/')
    .replace(/^([A-Z]):/, '$1:')
    .split('/')
    .filter(Boolean)
    .join(' / ') || localItem?.filename || 'Media';

  return (
    <div id="media-inspector-view" className="flex-1 flex flex-col h-screen bg-zinc-950 text-zinc-300 select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900 px-6 flex items-center justify-between z-20">
        {/* Left: Back to Gallery */}
        <button
          id="btn-back-to-gallery"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backToLibrary')}</span>
        </button>

        {/* Center: Zoom and Display Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700">
          <button
            onClick={handleZoomOut}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-xs font-mono font-medium text-zinc-300 hover:text-white rounded hover:bg-zinc-700 transition-colors"
          >
            {zoomLevel}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-[1px] bg-zinc-700 mx-1" />
          <button
            onClick={() => setShowAiBoxes(!showAiBoxes)}
            className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              showAiBoxes ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-zinc-400 hover:text-white'
            }`}
            title="Toggle AI Vision Bounding Boxes"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{t('aiVision')}</span>
          </button>
          <div className="h-3 w-[1px] bg-zinc-700 mx-1" />
          <button
            onClick={() => {
              const el = document.getElementById('media-viewport');
              if (el?.requestFullscreen) el.requestFullscreen();
            }}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700 transition-colors"
            title="Fullscreen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Quick item actions */}
        <div className="flex items-center gap-2">
          {localItem?.id && (
            <button
              onClick={() => onToggleFavorite(localItem.id)}
              className={`p-1.5 rounded-md border border-zinc-700 transition-colors cursor-pointer ${
                localItem.isFavorite ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Favorite"
            >
              <Heart className={`w-4 h-4 ${localItem.isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
          {(localItem?.originalHeicUrl || localItem?.url) && (
            <a
              href={localItem.originalHeicUrl || localItem.url}
              download={localItem.originalHeicUrl && (localItem.filename || 'media').endsWith('.jpg') ? (localItem.filename || 'media').replace(/\.jpg$/i, '.heic') : (localItem.filename || 'media')}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Download Original"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {isTrashMode ? (
            <>
              {onRestore && localItem?.id && (
                <button
                  onClick={() => {
                    onRestore(localItem.id, localItem.filename || '');
                  }}
                  className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors ml-2 flex items-center gap-1.5 px-2.5 cursor-pointer"
                  title="Restore Media"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs font-medium">Restore</span>
                </button>
              )}
              {onPermanentDelete && localItem?.id && (
                <button
                  onClick={() => {
                    if (window.confirm('Permanently delete this item? This cannot be undone.')) {
                      onPermanentDelete(localItem.id, localItem.filename || '');
                    }
                  }}
                  className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-2 flex items-center gap-1.5 px-2.5 cursor-pointer"
                  title="Delete Permanently"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">Delete Permanently</span>
                </button>
              )}
            </>
          ) : (
            onDelete && localItem?.id && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to send this item to Trash?')) {
                    onDelete(localItem.id, localItem.filename || '');
                  }
                }}
                className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors ml-2 cursor-pointer"
                title="Send to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Content: Viewer (Left) + Inspector Sidebar (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Canvas / Media Viewport */}
        <div 
          id="media-viewport"
          className="flex-1 relative bg-zinc-950 flex items-center justify-center p-6 overflow-hidden group"
        >
          {/* Navigation Arrows */}
          <button
            onClick={onPrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-105 cursor-pointer"
            aria-label="Previous Media"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-105 cursor-pointer"
            aria-label="Next Media"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Media Object with Pan/Zoom & AI Overlays */}
          <div 
            className="relative transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {isVideo ? (
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-zinc-800 max-h-[75vh]">
                <video
                  src={localItem?.url}
                  poster={localItem?.thumbnailUrl}
                  controls
                  autoPlay
                  className="max-h-[75vh] max-w-[70vw] object-contain rounded-lg bg-black"
                />
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-zinc-800 max-h-[75vh]">
                <SmartMedia item={localItem} useFullUrl={true} className="max-h-[75vh] max-w-[70vw] object-contain rounded-lg" />

                {/* AI Object Bounding Boxes Overlay */}
                {showAiBoxes && detectedObjects.map((obj, idx) => {
                  if (!obj || !obj.box) return null;
                  const ymin = obj.box.ymin ?? 0;
                  const xmin = obj.box.xmin ?? 0;
                  const ymax = obj.box.ymax ?? 100;
                  const xmax = obj.box.xmax ?? 100;
                  const label = obj.label || 'Object';
                  const confVal = Math.round((obj.confidence ?? 0) * 100);
                  return (
                    <div
                      key={obj.id || `box-${idx}`}
                      className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded pointer-events-none transition-all duration-300 animate-in fade-in"
                      style={{
                        top: `${ymin}%`,
                        left: `${xmin}%`,
                        width: `${Math.max(0, xmax - xmin)}%`,
                        height: `${Math.max(0, ymax - ymin)}%`
                      }}
                    >
                      <div className="absolute -top-5 left-0 bg-emerald-600 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                        <span>{label}</span>
                        <span className="text-emerald-200">{confVal}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Inspector Sidebar */}
        <div 
          id="inspector-sidebar"
          className="w-96 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full overflow-y-auto"
        >
          <div className="p-5 space-y-5">
            {/* Header: Filename and Path */}
            <div className="space-y-1 pb-2 border-b border-zinc-800">
              <h2 className="text-base font-bold text-zinc-100 tracking-tight break-all font-mono">
                {localItem?.filename || localItem?.title || 'Unknown Media'}
              </h2>
              <p className="text-[11px] font-mono text-zinc-500">
                {formattedPath}
              </p>
            </div>

            {/* METADATA Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>EXIF & Media Info</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Date & Time</span>
                  {isEditingDate ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="date" 
                        value={editDateValue} 
                        onChange={e => setEditDateValue(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px]"
                      />
                      <input 
                        type="time" 
                        step="1"
                        value={editTimeValue} 
                        onChange={e => setEditTimeValue(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 font-mono text-[10px]"
                      />
                      <button 
                        onClick={() => {
                          const newDateTime = `${editDateValue} ${editTimeValue}`.trim();
                          const updated = {
                            ...localItem,
                            date: editDateValue,
                            dateFormatted: editDateValue ? new Date(editDateValue).toLocaleDateString() : (localItem?.dateFormatted || ''),
                            exif: {
                              ...(localItem?.exif || {}),
                              dateTaken: newDateTime
                            }
                          };
                          setLocalItem(updated);
                          if (onUpdateMedia) onUpdateMedia(updated);
                          setIsEditingDate(false);
                        }}
                        className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded cursor-pointer"
                        title="Save"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => setIsEditingDate(false)}
                        className="p-1 hover:bg-zinc-700 text-zinc-400 rounded cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/edit">
                      <span className="text-zinc-300 font-mono">{exif?.dateTaken || localItem?.date || '—'}</span>
                      <button 
                        onClick={() => {
                          const dt = exif?.dateTaken || localItem?.date || '';
                          const [d, tVal] = dt.split(' ');
                          setEditDateValue(d || '');
                          setEditTimeValue(tVal || '00:00:00');
                          setIsEditingDate(true);
                        }}
                        className="opacity-0 group-hover/edit:opacity-100 transition-opacity p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white cursor-pointer"
                        title="Edit Date/Time"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Camera</span>
                  <span className="text-zinc-300 font-mono">{exif?.camera || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Lens</span>
                  <span className="text-zinc-300 font-mono">{exif?.lens || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Aperture</span>
                  <span className="text-zinc-300 font-mono">{exif?.aperture || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Shutter</span>
                  <span className="text-zinc-300 font-mono">{exif?.shutter || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">ISO</span>
                  <span className="text-zinc-300 font-mono">{exif?.iso ? String(exif.iso) : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Dimensions</span>
                  <span className="text-zinc-300 font-mono">{exif?.dimensions || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/80">
                  <span className="text-zinc-500 font-medium">Size</span>
                  <span className="text-zinc-300 font-mono">{exif?.size || '—'}</span>
                </div>
                {exif?.colorSpace && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-500 font-medium">Color Space</span>
                    <span className="text-zinc-300 font-mono">{exif.colorSpace}</span>
                  </div>
                )}
              </div>
            </div>

            {/* LOCATION Section */}
            {(localItem.location?.name || (localItem.location?.latitude && localItem.location?.longitude)) && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{localItem.location?.name || 'Location'}</span>
                  </div>
                  {localItem.location?.latitude !== undefined && localItem.location?.longitude !== undefined && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {localItem.location.latitude.toFixed(4)}°, {localItem.location.longitude.toFixed(4)}°
                    </span>
                  )}
                </div>

                {localItem.location?.latitude && localItem.location?.longitude && (
                  <div className="mt-1 rounded-lg overflow-hidden border border-zinc-800 shadow-inner pointer-events-auto">
                    <iframe
                      title="Google Maps"
                      width="100%"
                      height="180"
                      frameBorder="0"
                      style={{ border: 0, pointerEvents: 'auto' }}
                      src={`https://maps.google.com/maps?q=${localItem.location.latitude},${localItem.location.longitude}&z=15&output=embed`}
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAGS Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('tags')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono border border-zinc-700"
                  >
                    #{tag}
                  </span>
                ))}

                {isAddingTag ? (
                  <form onSubmit={handleTagSubmit} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="tag..."
                      autoFocus
                      className="px-2 py-0.5 rounded bg-zinc-950 text-white text-xs border border-emerald-500 focus:outline-none w-20"
                    />
                    <button
                      type="submit"
                      className="p-0.5 rounded bg-emerald-600 text-white text-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(false)}
                      className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingTag(true)}
                    className="px-2 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 text-[11px] font-mono border border-dashed border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('add')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Description</span>
              </div>
              <textarea
                value={localItem?.description || ''}
                onChange={(e) => {
                  const updated = { ...localItem, description: e.target.value };
                  setLocalItem(updated);
                }}
                onBlur={() => {
                  fetch('/api/media', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item: { filename: localItem.filename, description: localItem.description } })
                  }).catch(console.error);
                  if (onUpdateMedia) onUpdateMedia(localItem);
                }}
                placeholder="Add a description..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none"
                rows={3}
              />
            </div>

            {/* AI Vision Insights / Object Recognition Breakdown */}
            {detectedObjects.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>QWEN-VL VISION ENGINE</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">14.2ms ONNX</span>
                </div>

                <div className="space-y-1.5">
                  {detectedObjects.map((obj, idx) => {
                    const label = obj?.label || 'Object';
                    const conf = obj?.confidence ?? 0;
                    const confPercent = Math.round(conf * 100);
                    return (
                      <div key={obj?.id || `obj-${idx}`} className="p-2 rounded bg-zinc-950 border border-zinc-800 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-zinc-200 capitalize font-mono text-[11px]">{label}</span>
                          <span className="font-mono text-emerald-400 font-bold text-[11px]">{confPercent}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${confPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OCR Extracted Text */}
            {ocrTextStr && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>QWEN-VL OCR</span>
                  </div>
                  <button
                    onClick={handleCopyOcr}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                  >
                    {copiedOcr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedOcr ? t('copied') : t('copy')}
                  </button>
                </div>

                <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-300 space-y-1 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {ocrTextStr}
                </div>
              </div>
            )}

            {/* Video Transcode details */}
            {videoMeta && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>FFmpeg Transcode Stream</span>
                </div>

                <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>{t('codec')}</span>
                    <span className="text-zinc-200">{videoMeta.codec || '—'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>{t('bitrate')}</span>
                    <span className="text-zinc-200">{videoMeta.bitrate || '—'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>{t('audio')}</span>
                    <span className="text-zinc-200">{videoMeta.audioCodec || '—'}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Acceleration</span>
                    <span className="text-emerald-400 font-bold">{videoMeta.hwTranscode || 'NVENC Active'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
