const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
`  const searchedMedia = mediaList.filter((item) => {
    if (!searchQuery.trim()) return true;`,
`  const searchedMedia = mediaList.filter((item) => {
    if (currentView === 'trash') {
      if (!item.isDeleted) return false;
    } else {
      if (item.isDeleted) return false;
    }

    if (!searchQuery.trim()) return true;`
);

app = app.replace(
`  const handleDeleteMedia = async (id: string, filename: string) => {
    try {
      const res = await fetch(\`/api/media/\${filename}\`, { method: 'DELETE' });
      if (res.ok) {
        setMediaList((prev) => prev.filter((item) => item.id !== id));
        setSelectedMedia(null);
      } else {
        console.error('Failed to delete media');
      }
    } catch (err) {
      console.error('Error deleting media:', err);
    }
  };`,
`  const handleDeleteMedia = async (id: string, filename: string) => {
    if (currentView === 'trash') {
      handlePermanentlyDeleteMedia([filename]);
    } else {
      handleTrashMedia([filename]);
    }
  };`
);

fs.writeFileSync('src/App.tsx', app);
