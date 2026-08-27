const fs = require('fs');

let content = fs.readFileSync('src/components/TimelineView.tsx', 'utf-8');

if (!content.includes('import { SmartMedia }')) {
  content = content.replace(
    "import { MediaItem, DateGroup } from '../types';",
    "import { MediaItem, DateGroup } from '../types';\nimport { SmartMedia } from './SmartMedia';"
  );
}

const imgRegex = /<img\s+src=\{item\.thumbnailUrl \|\| item\.url\}\s+alt=\{item\.title\}\s+className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"\s+loading="lazy"\s+\/>/g;
const newImg = `<SmartMedia item={item} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />`;

content = content.replace(imgRegex, newImg);

fs.writeFileSync('src/components/TimelineView.tsx', content);
