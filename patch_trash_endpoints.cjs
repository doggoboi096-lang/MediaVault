const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const trashEndpoints = `
  const getTrashIndex = () => {
    if (fs.existsSync(TRASH_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(TRASH_FILE, 'utf-8'));
      } catch (e) {}
    }
    return [];
  };
  
  const saveTrashIndex = (arr) => {
    fs.writeFileSync(TRASH_FILE, JSON.stringify(arr, null, 2));
  };

  app.post('/api/media/trash', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!Array.isArray(filenames)) return res.status(400).json({ success: false, error: 'Expected array' });
    let trashed = getTrashIndex();
    for (const f of filenames) {
      if (!trashed.includes(f)) trashed.push(f);
    }
    saveTrashIndex(trashed);
    res.json({ success: true, message: 'Trashed' });
  });

  app.post('/api/media/restore', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!Array.isArray(filenames)) return res.status(400).json({ success: false, error: 'Expected array' });
    let trashed = getTrashIndex();
    trashed = trashed.filter(f => !filenames.includes(f));
    saveTrashIndex(trashed);
    res.json({ success: true, message: 'Restored' });
  });

  app.delete('/api/media', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!Array.isArray(filenames)) return res.status(400).json({ success: false, error: 'Expected array' });
    
    // We should delete from mediaDir, and also from INDEX_FILE
    let deletedCount = 0;
    for (const f of filenames) {
      const p = path.join(mediaDir, f);
      if (fs.existsSync(p) && p.startsWith(mediaDir)) {
        fs.unlinkSync(p);
        deletedCount++;
      }
    }
    
    let indexedItems = [];
    if (fs.existsSync(INDEX_FILE)) {
      try {
        indexedItems = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
        const newIndexed = indexedItems.filter(item => !filenames.includes(item.filename));
        fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndexed, null, 2));
      } catch (e) {}
    }
    
    let trashed = getTrashIndex();
    trashed = trashed.filter(f => !filenames.includes(f));
    saveTrashIndex(trashed);

    res.json({ success: true, deleted: deletedCount });
  });
`;

content = content.replace("app.delete('/api/media/:filename', (req, res) => {", trashEndpoints + "\n  app.delete('/api/media/:filename', (req, res) => {");
fs.writeFileSync('server.ts', content);
