const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace('let timeoutId;', 'let timeoutId: NodeJS.Timeout | undefined;');
code = code.replace('const timeoutPromise = new Promise((_, reject) => {', 'const timeoutPromise = new Promise<any>((_, reject) => {');
fs.writeFileSync('server.ts', code);
