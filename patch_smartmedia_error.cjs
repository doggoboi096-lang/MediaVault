const fs = require('fs');
let code = fs.readFileSync('src/components/SmartMedia.tsx', 'utf-8');

code = code.replace(
  `        .catch((err) => {
          console.error("HEIC conversion error:", err);
          setError(true);
          setIsLoading(false);
        });`,
  `        .catch((err) => {
          // Fallback to original URL if conversion fails (might be a misnamed JPEG or browser might support it)
          setHeicUrl(url);
          setIsLoading(false);
        });`
);

fs.writeFileSync('src/components/SmartMedia.tsx', code);
