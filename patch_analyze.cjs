const fs = require('fs');

const original = fs.readFileSync('original_analyze.ts', 'utf-8');
const serverCode = fs.readFileSync('server.ts', 'utf-8');

const newCode = `  app.post('/api/analyze-media', upload.array('files'), async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    const file = req.files[0];
    const filenames = req.files.map(f => f.filename);
    const filePath = file.path;

    try {
      let base64Data = '';
      const isVideo = file.mimetype && file.mimetype.startsWith('video');
      
      if (!isVideo) {
        base64Data = fs.readFileSync(filePath).toString('base64');
      } else {
        // Skip base64 generation for videos to prevent crashes
        console.log('Skipping Gemini base64 analysis for video file to prevent timeout/OOM');
      }
      
      let realExif = null;
      try {
        realExif = await exifr.parse(filePath);
      } catch (exifErr) {
        console.log('Failed to parse EXIF:', exifErr);
      }

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Gemini API timeout')), 25000);
      });

      const ai = getAi();
      let response = { text: '{}' };
      const AI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-1.5-flash'];
      
      if (!isVideo && base64Data.trim() !== '') {
        const mimeType = file.mimetype || 'image/jpeg';
        
        response = await Promise.race([
          (async () => {
            for (const model of AI_MODELS) {
              try {
                const res = await ai.models.generateContent({
                  model: model,
                  contents: {
                    parts: [
                      { text: 'You are a Media Metadata Analyzer. Analyze this image and extract metadata. Type must be one of: "image", "document", or "id_card". Identify specific objects in the image (e.g., "laptop", "face", "keyboard") rather than generic terms. If EXIF/Camera details cannot be reliably determined from the image content, leave these fields empty or null. Do not hallucinate data like "Sony A7R IV" unless it is clearly a photo taken by that camera.' },
                      { inlineData: { data: base64Data, mimeType: mimeType } }
                    ]
                  },
                  config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        type: { type: Type.STRING, description: "Must be 'image', 'document', or 'id_card'" },
                        detectedObjects: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              confidence: { type: Type.NUMBER },
                              category: { type: Type.STRING }
                            }
                          }
                        },
                        ocrData: {
                          type: Type.OBJECT,
                          properties: {
                            extractedText: { type: Type.ARRAY, items: { type: Type.STRING } },
                            documentType: { type: Type.STRING }
                          }
                        },
                        exif: {
                          type: Type.OBJECT,
                          properties: {
                            camera: { type: Type.STRING, nullable: true },
                            lens: { type: Type.STRING, nullable: true },
                            aperture: { type: Type.STRING, nullable: true },
                            shutter: { type: Type.STRING, nullable: true },
                            iso: { type: Type.INTEGER, nullable: true }
                          }
                        }
                      }
                    }
                  }
                });
                return res;
              } catch (modelErr) {
                console.log(\`[Fallback] \${model} failed, trying next...\`, modelErr.message || modelErr);
              }
            }
            throw new Error('All AI models failed');
          })(),
          timeoutPromise
        ]);
      }
      if (timeoutId) clearTimeout(timeoutId);
      
      let metadata = {};
      try {
        metadata = JSON.parse(response.text || '{}');
      } catch (parseErr) {
        console.error('Failed to parse AI response JSON:', parseErr);
        metadata = {
          tags: ['uploaded', 'parse-error'],
          type: isVideo ? 'video' : 'image',
          detectedObjects: [],
          ocrData: { extractedText: [], documentType: '' },
          exif: { camera: null, lens: null, aperture: null, shutter: null, iso: null }
        };
      }
      
      // Save metadata to INDEX_FILE for persistence
      let indexedItems = [];
      if (fs.existsSync(INDEX_FILE)) {
          try { indexedItems = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')); } catch(e){}
      }
      
      const fName = filenames[0];
      indexedItems = indexedItems.filter(item => item.filename !== fName);
      
      const newItem = {
          filename: fName,
          title: fName,
          ...metadata
      };
      indexedItems.push(newItem);
      fs.writeFileSync(INDEX_FILE, JSON.stringify(indexedItems, null, 2));

      res.json({ success: true, filenames, metadata, realExif });
    } catch (err) {
      console.error('Gemini error:', err);
      // Fallback
      res.json({
        success: true,
        filenames,
        metadata: {
          tags: ['uploaded', 'fallback'],
          type: 'image',
          detectedObjects: [],
          ocrData: { extractedText: [], documentType: '' },
          exif: { camera: null, lens: null, aperture: null, shutter: null, iso: null }
        },
        realExif: null,
        error: 'AI analysis failed'
      });
    }
  });`;

if (serverCode.includes(original)) {
  fs.writeFileSync('server.ts', serverCode.replace(original, newCode));
  console.log('Successfully patched server.ts');
} else {
  console.error('Original code not found in server.ts');
}
