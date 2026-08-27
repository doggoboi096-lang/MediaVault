const fs = require('fs');

let mi = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');
mi = mi.replace("if (window.confirm(('confirmDelete' as any) || 'Are you sure you want to delete this item?')) {", "if (window.confirm('Are you sure you want to delete this item?')) {");
fs.writeFileSync('src/components/MediaInspector.tsx', mi);

