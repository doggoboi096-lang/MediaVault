import React, { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { translations, Lang, fill } from './lib/i18n';
import { apiFetch, UNAUTHORIZED_EVENT } from './lib/api';
import {
  ViewId,
  Collection,
  albumCollections,
  documentCollections,
  peopleCollections,
  placeCollections,
  isScreenshot,
  exampleSearchTerm,
} from './lib/collections';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TimelineView } from './components/TimelineView';
import { SettingsView } from './components/SettingsView';
import {
  AlbumsView,
  DocumentsView,
  PeopleView,
  PlacesView,
  CollectionDetail,
  ActivityView,
} from './components/CollectionViews';
import { EmptyState, PageHeader, PillButton, TextButton } from './components/ui';
import { MediaInspector } from './components/MediaInspector';
import { OnboardingModal } from './components/OnboardingModal';
import { UploadModal } from './components/UploadModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { CommandPalette } from './components/CommandPalette';
import { LoginScreen } from './components/LoginScreen';
import { SMART_COLLECTIONS, INDEXING_ACTIVITIES, DEFAULT_HARDWARE_STATUS } from './data/mockMedia';
import { MediaItem, SmartCollection, IndexingActivity, SystemHardwareStatus, LibraryScanProgress, QueueProgress } from './types';

export default function App() {
  // The server session (httpOnly cookie) is the source of truth; /api/auth/me tells us if it is valid.
  const [authState, setAuthState] = useState<'checking' | 'in' | 'out'>('checking');
  const [userEmail, setUserEmail] = useState<string>('');
  const isAuthenticated = authState === 'in';
  const [view, setView] = useState<ViewId>('photos');
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<'hardware' | 'ai' | undefined>(undefined);
  const [queue, setQueue] = useState<QueueProgress | null>(null);

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

  const t = (key: keyof typeof translations.en) => translations[lang][key] || key;

  // Session check on load, and back to the sign-in screen whenever an API call returns 401
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async res => {
        if (!res.ok) return setAuthState('out');
        const data = await res.json();
        setUserEmail(data.email || '');
        setAuthState('in');
      })
      .catch(() => setAuthState('out'));

    const onUnauthorized = () => {
      setAuthState('out');
      setSelectedMedia(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Failed to sign out', e);
    }
    setAuthState('out');
    setUserEmail('');
    setSelectedMedia(null);
    setMediaList([]);
    setIsLoadingMedia(true);
  };

  // Real host telemetry (CPU, GPU, drives) for the sidebar storage meter and settings
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchSystem() {
      try {
        const res = await apiFetch('/api/system');
        const data = await res.json();
        if (data.success && data.data) {
          setHwStatus(prev => ({
            ...prev,
            cpuModel: data.data.cpuModel,
            cpuCores: data.data.cpuCores,
            gpuName: data.data.gpuName,
            hwAccelEngine: data.data.hwAccelEngine,
            drives: data.data.drives || prev.drives
          }));
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Failed to fetch')) return;
        console.error('Failed to fetch system data:', err);
      }
    }
    fetchSystem();
    const interval = setInterval(fetchSystem, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fetch real media from backend
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchMedia() {
      try {
        const res = await apiFetch('/api/media');
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
  }, [isAuthenticated]);

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

  // Live updates from the background AI queue (Server-Sent Events)
  useEffect(() => {
    if (!isAuthenticated) return;
    const source = new EventSource('/api/events', { withCredentials: true });
    source.addEventListener('media.updated', e => {
      const item: MediaItem = JSON.parse((e as MessageEvent).data);
      setMediaList(prev => (prev.some(m => m.id === item.id) ? prev.map(m => (m.id === item.id ? item : m)) : [item, ...prev]));
      setSelectedMedia(prev => (prev && prev.id === item.id ? item : prev));
    });
    source.addEventListener('queue.progress', e => setQueue(JSON.parse((e as MessageEvent).data)));
    return () => source.close();
  }, [isAuthenticated]);

  // ── Derived media sets ────────────────────────────────────────────────────
  const libraryMedia = mediaList.filter(m => !m.isDeleted);
  const trashMedia = mediaList.filter(m => m.isDeleted);

  const query = searchQuery.trim().toLowerCase();
  const searchResults = query
    ? libraryMedia.filter((item) =>
        item.title.toLowerCase().includes(query) ||
        item.filename.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        item.location?.name?.toLowerCase().includes(query) ||
        item.location?.city?.toLowerCase().includes(query) ||
        item.location?.country?.toLowerCase().includes(query) ||
        item.exif?.camera?.toLowerCase().includes(query) ||
        item.detectedObjects?.some((obj) => obj.label.toLowerCase().includes(query)) ||
        item.ocrData?.extractedText?.some((text) => text.toLowerCase().includes(query)) ||
        item.ocrText?.toLowerCase().includes(query)
      )
    : [];

  const allCollections: Collection[] = [
    ...albumCollections(libraryMedia, lang),
    ...documentCollections(libraryMedia, lang),
    ...peopleCollections(libraryMedia, lang),
    ...placeCollections(libraryMedia),
  ];
  const openCollection = openCollectionId ? allCollections.find(c => c.id === openCollectionId) || null : null;

  const screenshots = libraryMedia.filter(isScreenshot);
  const favorites = libraryMedia.filter(m => m.isFavorite);

  // The list the inspector's previous / next buttons walk through.
  const currentList: MediaItem[] = query
    ? searchResults
    : openCollection
      ? openCollection.items
      : view === 'trash'
        ? trashMedia
        : view === 'favorites'
          ? favorites
          : view === 'screenshots'
            ? screenshots
            : libraryMedia;

  const example = exampleSearchTerm(libraryMedia);
  const searchPlaceholder = example ? fill(t('searchExample'), { term: example }) : t('searchGeneric');

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (next: ViewId) => {
    setView(next);
    setOpenCollectionId(null);
    setSearchQuery('');
    if (next !== 'settings') setSettingsFocus(undefined);
  };

  const openSettings = (focus?: 'hardware' | 'ai') => {
    goTo('settings');
    setSettingsFocus(focus);
  };

  // Queue a photo for another AI pass; the result arrives over /api/events.
  const handleReanalyze = async (id: string) => {
    try {
      const res = await apiFetch(`/api/media/${encodeURIComponent(id)}/reanalyze`, { method: 'POST' });
      const data = await res.json();
      if (data.item) {
        setMediaList(prev => prev.map(m => (m.id === id ? data.item : m)));
        setSelectedMedia(prev => (prev && prev.id === id ? data.item : prev));
      }
    } catch (e) {
      console.error('Failed to queue re-analysis', e);
    }
  };

  // ── Media actions ─────────────────────────────────────────────────────────
  const handleUpdateMedia = async (updatedItem: MediaItem) => {
    setMediaList(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
    setSelectedMedia(prev => (prev && prev.id === updatedItem.id ? updatedItem : prev));
    try {
      await apiFetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: updatedItem })
      });
    } catch (e) {
      console.error('Failed to persist update', e);
    }
  };

  // Favorites are persisted so the Favorites collection survives a reload.
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = mediaList.find(m => m.id === id);
    if (item) handleUpdateMedia({ ...item, isFavorite: !item.isFavorite });
  };

  const handleTrashMedia = async (filenames: string[]) => {
    try {
      const res = await apiFetch('/api/media/trash', {
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
      const res = await apiFetch('/api/media/restore', {
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
      const res = await apiFetch('/api/media', {
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
      const res = await apiFetch('/api/media/trash/empty', { method: 'DELETE' });
      if (res.ok) {
        setMediaList(prev => prev.filter(m => !m.isDeleted));
        setSelectedMedia(null);
      }
    } catch (e) {
      console.error('Failed to empty trash', e);
    }
  };

  const handleDeleteMedia = async (id: string, filename: string) => {
    if (view === 'trash') {
      handlePermanentlyDeleteMedia([filename]);
    } else {
      handleTrashMedia([filename]);
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
          stage: step.stage as LibraryScanProgress['stage'],
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
    ? currentList.findIndex((m) => m.id === selectedMedia.id)
    : -1;

  const handlePrevMedia = () => {
    if (currentIndex > 0) {
      setSelectedMedia(currentList[currentIndex - 1]);
    } else if (currentList.length > 0) {
      setSelectedMedia(currentList[currentList.length - 1]);
    }
  };

  const handleNextMedia = () => {
    if (currentIndex >= 0 && currentIndex < currentList.length - 1) {
      setSelectedMedia(currentList[currentIndex + 1]);
    } else if (currentList.length > 0) {
      setSelectedMedia(currentList[0]);
    }
  };

  // Smart collection click handler (command palette)
  const handleSelectCollection = (col: SmartCollection) => {
    goTo('photos');
    if (col.id === 'col-id') {
      setSearchQuery('Passport');
    } else if (col.id === 'col-doc') {
      setSearchQuery('Invoice');
    } else if (col.id === 'col-vid') {
      setSearchQuery('mp4');
    }
  };

  if (authState === 'checking') {
    return <div className="h-screen w-screen bg-shell" aria-busy="true" />;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={(email) => {
          setUserEmail(email);
          setAuthState('in');
        }}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  // ── Page rendering ────────────────────────────────────────────────────────
  const grid = (items: MediaItem[], emptyState: React.ReactNode, opts: { showFilters?: boolean; mode?: 'library' | 'trash' } = {}) => (
    <TimelineView
      media={items}
      onSelectMedia={setSelectedMedia}
      onToggleFavorite={handleToggleFavorite}
      lang={lang}
      mode={opts.mode}
      showFilters={opts.showFilters}
      emptyState={emptyState}
      onTrash={handleTrashMedia}
      onRestore={handleRestoreMedia}
      onPermanentDelete={handlePermanentlyDeleteMedia}
      onUpdateMedia={handleUpdateMedia}
    />
  );

  const uploadButton = (
    <PillButton variant="filled" onClick={() => setShowUpload(true)}>{t('uploadPhotos')}</PillButton>
  );

  const renderPage = (): React.ReactNode => {
    if (isLoadingMedia) {
      return (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      );
    }

    if (query) {
      return (
        <>
          <PageHeader
            title={fill(t('searchResultsFor'), { q: searchQuery.trim() })}
            onBack={() => setSearchQuery('')}
            backLabel={t('clearSearch')}
          />
          {grid(searchResults, <EmptyState illustration="search" title={t('searchEmptyTitle')} description={t('searchEmptyDesc')} />)}
        </>
      );
    }

    if (openCollection) {
      return (
        <CollectionDetail title={openCollection.title} badge={t('autoAlbum')} onBack={() => setOpenCollectionId(null)} lang={lang}>
          {grid(
            openCollection.items,
            <EmptyState illustration={openCollection.illustration} title={t('collectionEmptyTitle')} description={t('collectionEmptyDesc')} />
          )}
        </CollectionDetail>
      );
    }

    const openById = (c: Collection) => setOpenCollectionId(c.id);

    switch (view) {
      case 'photos':
        return grid(
          libraryMedia,
          <EmptyState illustration="photos" title={t('photosEmptyTitle')} description={t('photosEmptyDesc')} action={uploadButton} />,
          { showFilters: true }
        );
      case 'activity':
        return <ActivityView activities={activities} lang={lang} />;
      case 'albums':
        return <AlbumsView media={libraryMedia} lang={lang} onOpen={openById} onUpload={() => setShowUpload(true)} />;
      case 'documents':
        return <DocumentsView media={libraryMedia} lang={lang} onOpen={openById} />;
      case 'screenshots':
        return (
          <CollectionDetail title={t('navScreenshots')} badge={t('autoAlbum')} lang={lang}>
            {grid(screenshots, <EmptyState illustration="screenshot" title={t('collectionEmptyTitle')} description={t('collectionEmptyDesc')} />)}
          </CollectionDetail>
        );
      case 'favorites':
        return (
          <CollectionDetail title={t('navFavorites')} lang={lang}>
            {grid(favorites, <EmptyState illustration="favorites" title={t('favoritesEmptyTitle')} description={t('favoritesEmptyDesc')} />)}
          </CollectionDetail>
        );
      case 'people':
        return <PeopleView media={libraryMedia} lang={lang} onOpen={openById} />;
      case 'places':
        return <PlacesView media={libraryMedia} lang={lang} onOpen={openById} />;
      case 'trash':
        return (
          <>
            <PageHeader
              title={t('navTrash')}
              actions={
                trashMedia.length > 0 && (
                  <TextButton
                    tone="danger"
                    icon={<Trash2 className="w-[18px] h-[18px]" />}
                    onClick={() => {
                      if (window.confirm(t('confirmEmptyTrash'))) handleEmptyTrash();
                    }}
                  >
                    {t('emptyTrash')}
                  </TextButton>
                )
              }
            />
            {grid(trashMedia, <EmptyState illustration="trash" title={t('trashEmptyTitle')} description={t('trashEmptyDesc')} />, { mode: 'trash' })}
          </>
        );
      case 'settings':
        return (
          <SettingsView
            hwStatus={hwStatus}
            currentLibraryPath={currentLibraryPath}
            onUpdateLibraryPath={setCurrentLibraryPath}
            onTriggerScan={() => setShowOnboarding(true)}
            onOpenProjectInfo={() => setShowArchitecture(true)}
            lang={lang}
            setLang={setLang}
            initialOpen={settingsFocus}
            queue={queue}
          />
        );
    }
  };

  const pageKey = query ? 'search' : openCollection ? `c:${openCollection.id}` : view;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-shell text-ink font-sans antialiased">
      {/* The photo inspector keeps its own full-screen layout */}
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
          onReanalyze={handleReanalyze}
          currentView={view}
          lang={lang}
        />
      ) : (
        <>
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={searchPlaceholder}
            onOpenUpload={() => setShowUpload(true)}
            onOpenSettings={() => openSettings()}
            onOpenProjectInfo={() => setShowArchitecture(true)}
            onToggleSidebar={() => setSidebarOpen(v => !v)}
            onLogout={handleLogout}
            userEmail={userEmail}
            queue={queue}
            onOpenAiSettings={() => openSettings('ai')}
            lang={lang}
            setLang={setLang}
          />
          <div className="flex flex-1 min-h-0">
            <Sidebar
              currentView={view}
              onViewChange={goTo}
              onManageStorage={() => openSettings('hardware')}
              hwStatus={hwStatus}
              lang={lang}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
            <main className="flex-1 min-w-0 mx-2 mb-2 lg:ml-0 lg:mr-4 lg:mb-4 rounded-3xl bg-panel overflow-hidden flex flex-col">
              <div key={pageKey} className="flex-1 overflow-y-auto">
                {renderPage()}
              </div>
            </main>
          </div>
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
        media={libraryMedia}
        collections={collections}
        onSelectMedia={(item) => setSelectedMedia(item)}
        onSelectCollection={handleSelectCollection}
        onNavigateView={goTo}
        lang={lang}
      />
    </div>
  );
}
