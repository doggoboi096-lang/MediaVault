const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
`    try {
      const base64Data = fs.readFileSync(filePath).toString('base64');`,
`    try {
      let base64Data = '';
      const isVideo = file.mimetype && file.mimetype.startsWith('video');
      
      if (!isVideo) {
        base64Data = fs.readFileSync(filePath).toString('base64');
      } else {
        // Skip base64 generation for videos to prevent crashes
        console.log('Skipping Gemini base64 analysis for video file to prevent timeout/OOM');
      }`
);

server = server.replace(
`      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: {
            parts: [
              { text: 'You are a Media Metadata Analyzer. Analyze this image and extract metadata. Type must be one of: "image", "document", or "id_card". Identify specific objects in the image (e.g., "laptop", "face", "keyboard") rather than generic terms. If EXIF/Camera details cannot be reliably determined from the image content, leave these fields empty or null. Do not hallucinate data like "Sony A7R IV" unless it is clearly a photo taken by that camera.' },
              { inlineData: { data: base64Data, mimeType: file.mimetype || 'image/jpeg' } }
            ]
          },`,
`      
      const isVideo = file.mimetype && file.mimetype.startsWith('video');
      
      let response = { text: '{}' };
      if (!isVideo) {
        response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: {
              parts: [
                { text: 'You are a Media Metadata Analyzer. Analyze this image and extract metadata. Type must be one of: "image", "document", or "id_card". Identify specific objects in the image (e.g., "laptop", "face", "keyboard") rather than generic terms. If EXIF/Camera details cannot be reliably determined from the image content, leave these fields empty or null. Do not hallucinate data like "Sony A7R IV" unless it is clearly a photo taken by that camera.' },
                { inlineData: { data: base64Data, mimeType: file.mimetype || 'image/jpeg' } }
              ]
            },`
);

server = server.replace(
`              }
            }
          }
        }),
        timeoutPromise
      ]);
      clearTimeout(timeoutId!);`,
`              }
            }
          }
        }),
        timeoutPromise
      ]);
      }
      clearTimeout(timeoutId!);`
);

fs.writeFileSync('server.ts', server);

let modal = fs.readFileSync('src/components/UploadModal.tsx', 'utf-8');
modal = modal.replace(
  `{...{ webkitdirectory: "true" }}`,
  `accept="image/*,video/*"`
);
fs.writeFileSync('src/components/UploadModal.tsx', modal);
