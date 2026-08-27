const fs = require('fs');

let content = fs.readFileSync('src/components/TimelineView.tsx', 'utf-8');

// Increase clickable area of banner buttons
content = content.replace(
  'className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[11px] hover:bg-emerald-500/30"',
  'className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-xs font-medium cursor-pointer hover:bg-emerald-500/30 active:scale-95 transition-transform"'
);

content = content.replace(
  'className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[11px] hover:bg-red-500/30"',
  'className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-medium cursor-pointer hover:bg-red-500/30 active:scale-95 transition-transform"'
);

content = content.replace(
  'className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[11px] hover:bg-red-500/30"',
  'className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-medium cursor-pointer hover:bg-red-500/30 active:scale-95 transition-transform"'
);

// Fix 4k badge z-index and pointer-events
content = content.replace(
  'className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[9px] font-mono text-zinc-300"',
  'className="absolute top-2 left-2 z-0 pointer-events-none px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[9px] font-mono text-zinc-300"'
);

// Make Select checkbox have high z-index
content = content.replace(
  'className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${',
  'className={`w-6 h-6 rounded flex items-center justify-center relative z-20 cursor-pointer transition-colors ${'
);

// Implement LazyMediaCard at the top
const lazyCardCode = `
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
      id={\`media-card-\${item.id}\`}
      onClick={() => onSelectMedia(item)}
      className={\`group relative rounded-lg overflow-hidden cursor-pointer bg-zinc-900 border transition-all duration-150 select-none \${spanClass} \${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-md scale-[0.99]'
          : 'border-zinc-800 hover:border-emerald-500/80 hover:shadow-lg'
      }\`}
    >
      {inView ? (
        <SmartMedia item={item} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-zinc-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => toggleSelect(item.id, e)}
            className={\`w-6 h-6 rounded flex items-center justify-center relative z-20 cursor-pointer transition-colors \${
              isSelected
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 border border-zinc-700'
            }\`}
            title="Select"
          >
            <Check className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => onToggleFavorite(item.id, e)}
            className={\`w-6 h-6 rounded flex items-center justify-center transition-colors relative z-20 cursor-pointer \${
              item.isFavorite
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-900/80 text-zinc-300 hover:text-rose-400 hover:bg-zinc-800 border border-zinc-700'
            }\`}
            title="Favorite"
          >
            <Heart className={\`w-3.5 h-3.5 \${item.isFavorite ? 'fill-current' : ''}\`} />
          </button>
        </div>

        <div className="space-y-1 relative z-20">
          <p className="text-[11px] font-semibold text-zinc-100 truncate font-mono">
            {item.filename}
          </p>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>{item.exif?.dimensions}</span>
            <span>{item.exif?.size}</span>
          </div>
        </div>
      </div>

      {item.type === 'video' && item.videoMeta && (
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-zinc-800 text-zinc-200 text-[10px] font-mono flex items-center gap-1 z-0 pointer-events-none">
          <Play className="w-2.5 h-2.5 fill-current text-emerald-400" />
          <span>{item.videoMeta.duration}</span>
          <span className="text-[9px] text-zinc-500 ml-0.5">HEVC</span>
        </div>
      )}

      {item.videoMeta && (
        <div className="absolute top-2 left-2 z-0 pointer-events-none px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[9px] font-mono text-zinc-300">
          4K
        </div>
      )}

      {item.detectedObjects && item.detectedObjects.length > 0 && (
        <div className="absolute top-2 right-2 z-0 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded bg-zinc-950/90 text-emerald-400 border border-zinc-800 text-[9px] font-mono flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {item.detectedObjects[0].label.toUpperCase()}
          </span>
        </div>
      )}

      {(item.type === 'id_card' || item.type === 'document') && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-800/80 text-purple-300 text-[9px] font-mono font-bold z-0 pointer-events-none">
          {item.type === 'id_card' ? 'ID' : 'OCR'}
        </div>
      )}
    </div>
  );
};
`;

if (!content.includes('LazyMediaCard')) {
  content = content.replace('export const TimelineView', lazyCardCode + '\nexport const TimelineView');
}

const renderLoopRegex = /return \(\s*<div\s*key=\{item\.id\}[^]*?\{item\.type === 'id_card' \? 'ID' : 'OCR'\}\s*<\/div>\s*\)\s*\}\s*<\/div>\s*\);\s*\}/gm;

const newLoop = `return (
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
            }`;

content = content.replace(renderLoopRegex, newLoop);

fs.writeFileSync('src/components/TimelineView.tsx', content);
