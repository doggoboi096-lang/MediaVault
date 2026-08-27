const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  "// Silently ignore transient network errors during polling\\n        if (err instanceof Error && err.message.includes('Failed to fetch')) return;\\n        console.error('Failed to fetch system data:', err);",
  "// Silently ignore transient network errors during polling\n        if (err instanceof Error && err.message.includes('Failed to fetch')) return;\n        console.error('Failed to fetch system data:', err);"
);

app = app.replace(
  "// Silently ignore transient network errors\\n        if (err instanceof Error && err.message.includes('Failed to fetch')) return;\\n        console.error('Failed to fetch media:', err);",
  "// Silently ignore transient network errors\n        if (err instanceof Error && err.message.includes('Failed to fetch')) return;\n        console.error('Failed to fetch media:', err);"
);

fs.writeFileSync('src/App.tsx', app);
