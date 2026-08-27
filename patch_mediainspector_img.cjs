const fs = require('fs');

let content = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');

if (!content.includes('import { SmartMedia }')) {
  content = content.replace(
    "import { MediaItem } from '../types';",
    "import { MediaItem } from '../types';\nimport { SmartMedia } from './SmartMedia';"
  );
}

const mainImgRegex = /<img\s*src=\{localItem\.url\}\s*alt=\{localItem\.title\}\s*className="max-h-\[75vh\] max-w-\[70vw\] object-contain rounded-lg"\s*draggable=\{false\}\s*\/>/g;
const newMainImg = `<SmartMedia item={localItem} useFullUrl={true} className="max-h-[75vh] max-w-[70vw] object-contain rounded-lg" />`;
content = content.replace(mainImgRegex, newMainImg);

fs.writeFileSync('src/components/MediaInspector.tsx', content);
