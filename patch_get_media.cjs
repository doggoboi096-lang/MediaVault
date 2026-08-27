const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
`      const allItems = [...mediaItems, ...indexedItems].map(item => {
        if (trashedItems.includes(item.filename)) {
          return { ...item, isDeleted: true };
        }
        return item;
      });`,
`      const allItemsMap = new Map();
      
      // Default items from directory scan
      mediaItems.forEach(item => {
        allItemsMap.set(item.filename, item);
      });
      
      // Merge indexed items (which might have rich AI metadata or manual edits)
      indexedItems.forEach(item => {
        if (allItemsMap.has(item.filename)) {
          // Merge with priority to indexedItem
          const existing = allItemsMap.get(item.filename);
          allItemsMap.set(item.filename, { ...existing, ...item, id: existing.id });
        } else {
          allItemsMap.set(item.filename, item);
        }
      });
      
      const allItems = Array.from(allItemsMap.values()).map(item => {
        if (trashedItems.includes(item.filename)) {
          return { ...item, isDeleted: true };
        }
        return item;
      });`
);

fs.writeFileSync('server.ts', server);
