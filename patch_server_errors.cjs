const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Fix EXIF parsing log
serverCode = serverCode.replace(
  `      let realExif = null;
      try {
        realExif = await exifr.parse(filePath);
      } catch (exifErr) {
        console.log('Failed to parse EXIF:', exifErr);
      }`,
  `      let realExif = null;
      try {
        if (!isVideo) {
          realExif = await exifr.parse(filePath);
        }
      } catch (exifErr) {
        // Silently ignore EXIF parsing errors for unsupported formats
      }`
);

// Fix timeout
serverCode = serverCode.replace(
  `timeoutId = setTimeout(() => reject(new Error('Gemini API timeout')), 25000);`,
  `timeoutId = setTimeout(() => reject(new Error('Gemini API timeout')), 50000);`
);

fs.writeFileSync('server.ts', serverCode);
