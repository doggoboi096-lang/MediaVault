const fs = require('fs');

let content = fs.readFileSync('src/components/SmartMedia.tsx', 'utf-8');
content = content.replace(
  'className?: string;',
  'className?: string;\n  useFullUrl?: boolean;'
);
content = content.replace(
  'className = "" }) => {',
  'className = "", useFullUrl = false }) => {'
);
content = content.replace(
  'const url = item.thumbnailUrl || item.url;',
  'const url = useFullUrl ? item.url : (item.thumbnailUrl || item.url);'
);
fs.writeFileSync('src/components/SmartMedia.tsx', content);
