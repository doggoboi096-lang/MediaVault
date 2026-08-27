const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
`  const handleUpdateMedia = (updatedItem: MediaItem) => {
    setMediaList(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
    setSelectedMedia(updatedItem);
  };`,
`  const handleUpdateMedia = async (updatedItem: MediaItem) => {
    setMediaList(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
    setSelectedMedia(updatedItem);
    try {
      await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: updatedItem })
      });
    } catch(e) {
      console.error('Failed to persist update', e);
    }
  };`
);

fs.writeFileSync('src/App.tsx', app);
