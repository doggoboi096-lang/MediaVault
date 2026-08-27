const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(
  "                let lat = undefined;\n                let lng = undefined;",
  "                let lat = undefined;\n                let lng = undefined;\n\n                if (realExif.latitude && realExif.longitude) {\n                  lat = realExif.latitude;\n                  lng = realExif.longitude;\n                }"
);

fs.writeFileSync('server.ts', content);
