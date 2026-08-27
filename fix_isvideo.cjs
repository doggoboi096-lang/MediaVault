const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(
  "      const isVideo = file.mimetype && file.mimetype.startsWith('video');\n      \n      let response = { text: '{}' };",
  "      let response: any = { text: '{}' };"
);
fs.writeFileSync('server.ts', server);
