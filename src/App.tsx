import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { translations, Lang } from './lib/i18n';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TimelineView } from './components/TimelineView';
import { ExplorerView } from './components/ExplorerView';
import { SettingsView } from './components/SettingsView';
import { MediaInspector } from './components/MediaInspector';
import { OnboardingModal } from './components/OnboardingModal';
import { UploadModal } from './components/UploadModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginScreen } from './components/LoginScreen';
import { 
  SMART_COLLECTIONS, 
  INDEXING_ACTIVITIES, 
  DEFAULT_HARDWARE_STATUS 
} from './data/mockMedia';
import { 
  MediaItem, 
  SmartCollection, 
  IndexingActivity, 
  SystemHardwareStatus, 
  LibraryScanProgress 
} from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'timeline' | 'explorer' | 'settings' | 'trash'>('timeline');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  
  // Modals state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showUpload, setShowUpload] = useState<boolean>(false);
  const [showArchitecture, setShowArchitecture] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);

  // System & Scan state
  const [lang, setLang] = useState<Lang>('vi');
  const [currentLibraryPath, setCurrentLibraryPath] = useState<string>('D:\\GiaDinh\\HinhAnh');
  const [hwStatus, setHwStatus] = useState<SystemHardwareStatus>(DEFAULT_HARDWARE_STATUS);
  const [collections] = useState<SmartCollection[]>(SMART_COLLECTIONS);
  const [activities, setActivities] = useState<IndexingActivity[]>(INDEXING_ACTIVITIES);
  const [scanProgress, setScanProgress] = useState<LibraryScanProgress>({
    isScanning: false,
    stage: 'idle',
    currentFile: '',
    scannedCount: 0,
    totalFiles: 0,
    percentage: 0,
    logMessages: []
  });

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch real telemetry
  useEffect(() => {
    async function fetchSystem() {
      try {
        const res = await fetch('/api/system');
        const data = await res.json();
        if (data.success && data.data) {
          setHwStatus(prev => ({
            ...prev,
            cpuModel: data.data.cpuModel,
            cpuCores: data.data.cpuCores,
            ramAppBytes: data.data.ramAppBytes,
            ramSystemUsedBytes: data.data.ramSystemUsedBytes,
            ramSystemTotalBytes: data.data.ramSystemTotalBytes,
            gpuModel: data.data.gpuModel,
            gpuName: data.data.gpuName,
            cpuUsagePercent: data.data.cpuUsagePercent,
            hwAccelEngine: data.data.hwAccelEngine,
            storageDrive: data.data.storageDrive,
            storageTotal: data.data.storageTotal,
            storageUsed: data.data.storageUsed,
            storagePercent: typeof data.data.storagePercent === 'number' ? data.data.storagePercent : 0
          }));
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Failed to fetch')) return;
        console.error('Failed to fetch system data:', err);
      }
    }
    fetchSystem();
    const interval = setInterval(fetchSystem, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real media from backend
  useEffect(() => {
    async function fetchMedia() {
      try {
        const res = await fetch('/api/media');
        const data = await res.json();
        if (data.success && data.data) {
          setMediaList(data.data);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Failed to fetch')) return;
        console.error('Failed to fetch media:', err);
      } finally {
        setIsLoadingMedia(false);
      }
    }
    fetchMedia();
  }, []);

  // Global key listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter media based on search query and current view
  const searchedMedia = mediaList.filter((item) => {
    if (currentView === 'trash') {
      if (!item.isDeleted) return false;
    } else {
      if (item.isDeleted) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.filename.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      item.location?.name?.toLowerCase().includes(q) ||
      item.location?.city?.toLowerCase().includes(q) ||
      item.location?.country?.toLowerCase().includes(q) ||
      item.exif?.camera?.toLowerCase().includes(q) ||
      item.detectedObjects?.some((obj) => obj.label.toLowerCase().includes(q)) ||
      item.ocrData?.extractedText?.some((text) => text.toLowerCase().includes(q))
    );
  });

  // Toggle favorite
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMediaList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleTrashMedia = async (filenames: string[]) => {
    try {
      const res = await fetch('/api/media/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames })
      });
      if (res.ok) {
        setMediaList(prev => prev.map(m => filenames.includes(m.filename) ? { ...m, isDeleted: true } : m));
        if (selectedMedia && filenames.includes(selectedMedia.filename)) {
          setSelectedMedia(null);
        }
      }
    } catch (e) {
      console.error('Failed to trash media', e);
    }
  };

  const handleRestoreMedia = async (filenames: string[]) => {
    try {
      const res = await fetch('/api/media/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames })
      });
      if (res.ok) {
        setMediaList(prev => prev.map(m => filenames.includes(m.filename) ? { ...m, isDeleted: false } : m));
        if (selectedMedia && filenames.includes(selectedMedia.filename)) {
          setSelectedMedia(prev => prev ? { ...prev, isDeleted: false } : null);
        }
      }
    } catch (e) {
      console.error('Failed to restore media', e);
    }
  };

  const handlePermanentlyDeleteMedia = async (filenames: string[]) => {
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames })
      });
      if (res.ok) {
        setMediaList(prev => prev.filter(m => !filenames.includes(m.filename)));
        if (selectedMedia && filenames.includes(selectedMedia.filename)) {
          setSelectedMedia(null);
        }
      }
    } catch (e) {
      console.error('Failed to permanently delete media', e);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const res = await fetch('/api/media/trash/empty', { method: 'DELETE' });
      if (res.ok) {
        setMediaList(prev => prev.filter(m => !m.isDeleted));
        setSelectedMedia(null);
      }
    } catch (e) {
      console.error('Failed to empty trash', e);
    }
  };

  const handleDeleteMedia = async (id: string, filename: string) => {
    if (currentView === 'trash') {
      handlePermanentlyDeleteMedia([filename]);
    } else {
      handleTrashMedia([filename]);
    }
  };

  const handleUpdateMedia = async (updatedItem: MediaItem) => {
    setMediaList(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
    setSelectedMedia(prev => (prev && prev.id === updatedItem.id ? updatedItem : prev));
    try {
      await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: updatedItem })
      });
    } catch(e) {
      console.error('Failed to persist update', e);
    }
  };

  const handleAddTag = (id: string, newTag: string) => {
    setMediaList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, tags: [...item.tags, newTag] } : item
      )
    );
    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia((prev) =>
        prev ? { ...prev, tags: [...prev.tags, newTag] } : null
      );
    }
  };

  const handleUploadSuccess = (newItems: MediaItem[]) => {
    setMediaList((prev) => {
      let updatedList = [...prev];
      newItems.forEach(newItem => {
        if (updatedList.some(item => item.id === newItem.id || item.filename === newItem.filename)) {
          updatedList = updatedList.map(item => (item.id === newItem.id || item.filename === newItem.filename) ? newItem : item);
        } else {
          updatedList = [newItem, ...updatedList];
        }
      });
      return updatedList;
    });

    const newActivity: IndexingActivity = {
      id: `act-${Date.now()}`,
      title: `Ingested ${newItems.length} file(s)`,
      description: `Bulk Upload processed.`,
      timeAgo: 'Just now',
      timestamp: Date.now(),
      icon: 'Upload',
      status: 'completed',
      details: {
        itemsCount: newItems.length
      }
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  // Start scanning directory
  const handleStartScan = (path: string) => {
    setCurrentLibraryPath(path);
    setScanProgress({
      isScanning: true,
      stage: 'discovering',
      currentFile: 'Traversing filesystem directory tree...',
      scannedCount: 0,
      totalFiles: 140,
      percentage: 10,
      logMessages: [`[SCAN_INIT] Target physical mount: ${path}`]
    });

    const pipelineSteps = [
      { pct: 25, stage: 'discovering', msg: `Found 140 media files in ${path}` },
      { pct: 50, stage: 'exif_parsing', msg: 'Extracted GPS geotags & EXIF metadata via libexif' },
      { pct: 75, stage: 'yolo_inference', msg: 'Local YOLOv8-nano inference complete: 320 objects detected' },
      { pct: 90, stage: 'ffmpeg_transcoding', msg: 'NVENC generated 1080p preview streams & WebP thumbnails' },
      { pct: 100, stage: 'completed', msg: 'Ingestion complete. SQLite FTS5 database updated.' }
    ];

    pipelineSteps.forEach((step, idx) => {
      setTimeout(() => {
        setScanProgress((prev) => ({
          ...prev,
          percentage: step.pct,
          stage: step.stage,
          isScanning: step.pct < 100,
          scannedCount: Math.floor((step.pct / 100) * 140),
          logMessages: [...prev.logMessages, step.msg]
        }));

        if (step.pct === 100) {
          setTimeout(() => {
            setShowOnboarding(false);
          }, 800);
        }
      }, (idx + 1) * 600);
    });
  };

  // Inspector next / prev navigation
  const currentIndex = selectedMedia
    ? searchedMedia.findIndex((m) => m.id === selectedMedia.id)
    : -1;

  const handlePrevMedia = () => {
    if (currentIndex > 0) {
      setSelectedMedia(searchedMedia[currentIndex - 1]);
    } else if (searchedMedia.length > 0) {
      setSelectedMedia(searchedMedia[searchedMedia.length - 1]);
    }
  };

  const handleNextMedia = () => {
    if (currentIndex >= 0 && currentIndex < searchedMedia.length - 1) {
      setSelectedMedia(searchedMedia[currentIndex + 1]);
    } else if (searchedMedia.length > 0) {
      setSelectedMedia(searchedMedia[0]);
    }
  };

  // Smart collection click handler
  const handleSelectCollection = (col: SmartCollection) => {
    if (col.id === 'col-id') {
      setSearchQuery('Passport');
    } else if (col.id === 'col-doc') {
      setSearchQuery('Invoice');
    } else if (col.id === 'col-vid') {
      setSearchQuery('mp4');
    }
    setCurrentView('timeline');
  };

  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} lang={lang} setLang={setLang} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* If media inspector is open, render full inspector */}
      {selectedMedia ? (
        <MediaInspector
          item={selectedMedia}
          onBack={() => setSelectedMedia(null)}
          onPrev={handlePrevMedia}
          onNext={handleNextMedia}
          onToggleFavorite={handleToggleFavorite}
          onAddTag={handleAddTag}
          onDelete={handleDeleteMedia}
          onRestore={(id, filename) => handleRestoreMedia([filename])}
          onPermanentDelete={(id, filename) => handlePermanentlyDeleteMedia([filename])}
          onUpdateMedia={handleUpdateMedia}
          currentView={currentView}
          lang={lang}
        />
      ) : (
        <>
          {/* Left Navigation Sidebar */}
          <Sidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            onOpenUpload={() => setShowUpload(true)}
            onOpenArchitecture={() => setShowArchitecture(true)}
            hwStatus={hwStatus}
            lang={lang}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden bg-zinc-950">
            {/* Top Search & Controls Header */}
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenCommandPalette={() => setShowCommandPalette(true)}
              onOpenUpload={() => setShowUpload(true)}
              activities={activities}
              hwStatus={hwStatus}
              lang={lang}
              setLang={setLang}
            />

            {/* Viewport Router */}
            <div className="flex-1 overflow-y-auto">
              {(currentView === 'timeline' || currentView === 'trash') && (
                <TimelineView
                  media={searchedMedia}
                  onSelectMedia={setSelectedMedia}
                  onToggleFavorite={handleToggleFavorite}
                  hwStatus={hwStatus}
                  lang={lang}
                  currentView={currentView}
                  onTrash={handleTrashMedia}
                  onRestore={handleRestoreMedia}
                  onPermanentDelete={handlePermanentlyDeleteMedia}
                  onEmptyTrash={handleEmptyTrash}
                  onUpdateMedia={handleUpdateMedia}
                />
              )}

              {currentView === 'explorer' && (
                <ExplorerView
                  activities={activities}
                  mediaItems={searchedMedia}
                  onQuickFilter={(q) => {
                    setSearchQuery(q);
                    setCurrentView('timeline');
                  }}
                  lang={lang}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  hwStatus={hwStatus}
                  currentLibraryPath={currentLibraryPath}
                  onUpdateLibraryPath={setCurrentLibraryPath}
                  onTriggerScan={() => setShowOnboarding(true)}
                  lang={lang}
                />
              )}
            </div>
          </main>
        </>
      )}

      {/* Modals & Overlays */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onStartScan={handleStartScan}
        scanProgress={scanProgress}
        lang={lang}
      />

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadSuccess={handleUploadSuccess}
        lang={lang}
      />

      <ArchitectureModal
        isOpen={showArchitecture}
        onClose={() => setShowArchitecture(false)}
        lang={lang}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        media={mediaList}
        collections={collections}
        onSelectMedia={(item) => setSelectedMedia(item)}
        onSelectCollection={handleSelectCollection}
        onNavigateView={(view) => setCurrentView(view)}
        lang={lang}
      />
    </div>
  );
}
