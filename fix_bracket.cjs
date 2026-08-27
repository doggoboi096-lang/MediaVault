const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(
  "      ]);\n\n      clearTimeout(timeoutId!);",
  "      ]);\n      }\n      clearTimeout(timeoutId!);"
);
fs.writeFileSync('server.ts', server);
