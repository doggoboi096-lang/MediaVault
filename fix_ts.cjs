const fs = require('fs');

let cp = fs.readFileSync('src/components/CommandPalette.tsx', 'utf-8');
cp = cp.replace("t('explorer')", "'Explorer'");
cp = cp.replace("t('settings')", "'Settings'");
fs.writeFileSync('src/components/CommandPalette.tsx', cp);

let mi = fs.readFileSync('src/components/MediaInspector.tsx', 'utf-8');
mi = mi.replace("t('confirmDelete')", "('confirmDelete' as any)");
mi = mi.replace("t('acceleration')", "('acceleration' as any)");
fs.writeFileSync('src/components/MediaInspector.tsx', mi);

