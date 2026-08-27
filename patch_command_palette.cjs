const fs = require('fs');
let content = fs.readFileSync('src/components/CommandPalette.tsx', 'utf-8');

if (!content.includes('import { SmartMedia }')) {
  content = content.replace(
    "import { MediaItem } from '../types';",
    "import { MediaItem } from '../types';\nimport { SmartMedia } from './SmartMedia';"
  );
}

const imgRegex = /<img\s*src=\{item\.thumbnailUrl\}\s*alt=\{item\.title\}\s*className="w-8 h-8 rounded object-cover flex-shrink-0 border border-zinc-800"\s*\/>/g;
const newImg = `<SmartMedia item={item} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-zinc-800" />`;

content = content.replace(imgRegex, newImg);
fs.writeFileSync('src/components/CommandPalette.tsx', content);
