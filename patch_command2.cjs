const fs = require('fs');

let content = fs.readFileSync('src/components/CommandPalette.tsx', 'utf-8');

if (!content.includes('import { SmartMedia }')) {
  content = content.replace(
    "import { MediaItem, SmartCollection } from '../types';",
    "import { MediaItem, SmartCollection } from '../types';\nimport { SmartMedia } from './SmartMedia';"
  );
}

fs.writeFileSync('src/components/CommandPalette.tsx', content);
