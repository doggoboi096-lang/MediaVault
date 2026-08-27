const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const targetSingle = `  app.delete('/api/media/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    const filePath = path.join(mediaDir, filename);
    
    // Security check to ensure it doesn't leave mediaDir
    if (!filePath.startsWith(mediaDir)) {
      return res.status(403).json({ success: false, error: 'Invalid file path' });
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'File deleted' });
      } else {
        res.status(404).json({ success: false, error: 'File not found' });
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  });`;

const newSingle = `  app.delete('/api/media/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    
    let filePath = path.join(mediaDir, filename);
    let foundInIndex = false;
    
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const indexedItems = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
        const item = indexedItems.find(i => i.filename === filename);
        if (item && item.path) {
           filePath = item.path;
           foundInIndex = true;
           const newIndexed = indexedItems.filter(i => i.filename !== filename);
           fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndexed, null, 2));
        }
      } catch (e) {}
    }
    
    let trashed = getTrashIndex();
    if (trashed.includes(filename)) {
      trashed = trashed.filter(f => f !== filename);
      saveTrashIndex(trashed);
    }
    
    if (!foundInIndex && !filePath.startsWith(mediaDir)) {
      return res.status(403).json({ success: false, error: 'Invalid file path' });
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'File deleted' });
      } else {
        res.status(404).json({ success: false, error: 'File not found' });
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  });`;

code = code.replace(targetSingle, newSingle);
fs.writeFileSync('server.ts', code);
