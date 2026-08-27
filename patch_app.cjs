const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  '          onDelete={handleDeleteMedia}',
  '          onDelete={handleDeleteMedia}\n          onRestore={(id, filename) => handleRestoreMedia([filename])}\n          onPermanentDelete={(id, filename) => handlePermanentlyDeleteMedia([filename])}'
);

fs.writeFileSync('src/App.tsx', content);
