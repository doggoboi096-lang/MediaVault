const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

const targetDelete = `    // We should delete from mediaDir, and also from INDEX_FILE
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
    }`;

const newDelete = `    let indexedItems = [];
    if (fs.existsSync(INDEX_FILE)) {
      try {
        indexedItems = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      } catch (e) {}
    }

    let deletedCount = 0;
    for (const f of filenames) {
      const item = indexedItems.find(i => i.filename === f);
      if (item && item.path && fs.existsSync(item.path)) {
        try {
          fs.unlinkSync(item.path);
          deletedCount++;
        } catch (e) {
          console.error('Failed to unlink:', item.path, e);
        }
      } else {
        const p = path.join(mediaDir, f);
        if (fs.existsSync(p) && p.startsWith(mediaDir)) {
          fs.unlinkSync(p);
          deletedCount++;
        }
      }
    }
    
    if (indexedItems.length > 0) {
      const newIndexed = indexedItems.filter(item => !filenames.includes(item.filename));
      fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndexed, null, 2));
    }`;

code = code.replace(targetDelete, newDelete);
fs.writeFileSync('server.ts', code);
