import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Contact, 
  FileText, 
  PlayCircle, 
  Plane, 
  Clock, 
  MapPin, 
  FileCheck, 
  HardDrive, 
  CheckCircle2, 
  Cpu, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { SmartCollection, IndexingActivity, MediaItem } from '../types';
import { translations, Lang } from '../lib/i18n';

interface ExplorerViewProps {
  activities: IndexingActivity[];
  mediaItems: MediaItem[];
  onQuickFilter: (query: string) => void;
  lang: Lang;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  activities,
  mediaItems,
  onQuickFilter,
  lang
}) => {
  const [explorerSearch, setExplorerSearch] = useState('');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  const quickFilters = [
    { label: 'Last 30 Days', query: '2026', icon: Clock },
    { label: 'PDF Receipts', query: 'Invoice', icon: FileCheck },
    { label: 'Passports', query: 'Passport', icon: Contact }
  ];

  const videoCount = mediaItems.filter(m => m.type === 'video').length;
  const ocrCount = mediaItems.filter(m => m.ocrData && m.ocrData.extractedText && m.ocrData.extractedText.length > 0).length;
  const totalCount = mediaItems.length;

  const realCollections = [
    { id: 'all', title: 'All Media', description: 'Everything in your library', itemsCount: totalCount, storageSize: 'Dynamic', icon: 'Sparkles', query: '' },
    { id: 'video', title: 'Videos', description: 'Hardware transcoded streams', itemsCount: videoCount, storageSize: 'Dynamic', icon: 'PlayCircle', query: 'video' },
    { id: 'ocr', title: 'OCR Documents', description: 'Text extracted from images', itemsCount: ocrCount, storageSize: 'Dynamic', icon: 'FileText', query: 'document' },
  ];

  const locationCounts = mediaItems.reduce((acc, item) => {
    if (item.location?.name && item.location.name !== "Unknown Location") {
      acc[item.location.name] = (acc[item.location.name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const uniqueLocations = Object.entries(locationCounts).sort((a, b) => Number(b[1]) - Number(a[1]));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (explorerSearch.trim()) {
      onQuickFilter(explorerSearch.trim());
    }
  };

  const getCollectionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Contact':
        return <Contact className="w-4 h-4 text-emerald-400" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'PlayCircle':
        return <PlayCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getActivityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Plane':
        return <Plane className="w-3.5 h-3.5 text-sky-400" />;
      case 'FileText':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'Cpu':
        return <Cpu className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div id="explorer-container" className="p-6 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Top Search Bar & Quick Filters */}
      <div className="space-y-3 max-w-4xl">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-explorer-search"
            type="text"
            value={explorerSearch}
            onChange={(e) => setExplorerSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-zinc-900 hover:bg-zinc-800/80 focus:bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-lg pl-10 pr-14 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
              ⌘ K
            </kbd>
          </div>
        </form>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickFilters.map((chip, idx) => {
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                onClick={() => onQuickFilter(chip.query)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <Icon className="w-3 h-3 text-zinc-500" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Smart Collections Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-100 tracking-tight">{t('smartCollections')}</h2>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('aiAutomated')}</span>
          </div>
        </div>

        {/* 3 Main Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {realCollections.map((col) => (
            <div
              key={col.id}
              id={`collection-card-${col.id}`}
              onClick={() => onQuickFilter(col.query)}
              className="group bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/50 rounded-lg p-5 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-sm"
            >
              <div className="space-y-3">
                {/* Icon box */}
                <div className="w-9 h-9 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  {getCollectionIcon(col.icon)}
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors font-mono">
                    {col.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                    {col.description}
                  </p>
                </div>
              </div>

              {/* Bottom Metrics: Items & Storage */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between mt-3">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase block font-mono">
                    {t('itemsMetric')}
                  </span>
                  <span className="text-sm font-mono font-bold text-zinc-200">
                    {col.itemsCount.toLocaleString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase block font-mono">
                    {t('storageMetric')}
                  </span>
                  <span className="text-sm font-mono font-bold text-zinc-200">
                    {col.storageSize}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Indexing Activity Section */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('recentActivity')}</h2>
          <button
            onClick={() => setShowAllLogs(!showAllLogs)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer font-mono"
          >
            {showAllLogs ? t('collapse') : t('viewAll')}
          </button>
        </div>

        {/* Indexing Logs Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800/80 overflow-hidden shadow-sm">
          {(showAllLogs ? activities : activities.slice(0, 3)).map((act) => (
            <div
              key={act.id}
              className="px-4 py-2.5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Icon box */}
                <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  {getActivityIcon(act.icon)}
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-xs font-medium text-zinc-200">{act.title}</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{act.description}</p>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span>{act.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Extra Smart Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Geo-Locations Cluster */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('autoGeocoded')}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">5 {t('clusters')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {uniqueLocations.length > 0 ? (
              uniqueLocations.slice(0, 4).map(([locName, count]) => (
                <button
                  key={locName}
                  onClick={() => onQuickFilter(locName)}
                  className="p-2.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-zinc-200 text-xs truncate" title={locName}>{locName}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{count} {t('itemsCount')}</p>
                </button>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic col-span-2">No locations detected yet</p>
            )}
          </div>
        </div>

        {/* Security & Private Mesh Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('securityTitle')}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
              TLS 1.3 / E2EE
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {t('securityDesc')}
          </p>

          <div className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-300">
            <span className="text-zinc-400">{t('tailnetNode')} media.tailnet.ts.net</span>
            <span className="text-emerald-400 font-bold">100.84.192.42</span>
          </div>
        </div>
      </div>
    </div>
  );
};
