const fs = require('fs');

let content = fs.readFileSync('src/components/TimelineView.tsx', 'utf-8');

if (!content.includes('import { SmartMedia }')) {
  content = content.replace(
    "import { MediaItem, SystemHardwareStatus } from '../types';",
    "import { MediaItem, SystemHardwareStatus } from '../types';\nimport { SmartMedia } from './SmartMedia';"
  );
}

fs.writeFileSync('src/components/TimelineView.tsx', content);
