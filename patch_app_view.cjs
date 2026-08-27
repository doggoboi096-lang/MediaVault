const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const searchedMediaOld = `
  const searchedMedia = mediaList.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q)) ||
      m.location?.name.toLowerCase().includes(q) ||
      m.location?.city.toLowerCase().includes(q)
    );
  });
`;

const searchedMediaNew = `
  const searchedMedia = mediaList.filter((m) => {
    if (currentView === 'trash') {
      if (!m.isDeleted) return false;
    } else {
      if (m.isDeleted) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q)) ||
      m.location?.name.toLowerCase().includes(q) ||
      m.location?.city.toLowerCase().includes(q)
    );
  });
`;

content = content.replace(searchedMediaOld, searchedMediaNew);

const renderOld = `              {currentView === 'timeline' && (
                <TimelineView
                  media={searchedMedia}
                  onSelectMedia={setSelectedMedia}
                  onToggleFavorite={handleToggleFavorite}
                  hwStatus={hwStatus}
                  lang={lang}
                />
              )}`;

const renderNew = `              {(currentView === 'timeline' || currentView === 'trash') && (
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
                />
              )}`;

content = content.replace(renderOld, renderNew);
fs.writeFileSync('src/App.tsx', content);
