const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "console.error('Gemini error:', err);",
  "console.warn('Gemini fallback triggered (expected on timeout):', err.message || err);"
);

fs.writeFileSync('server.ts', code);
