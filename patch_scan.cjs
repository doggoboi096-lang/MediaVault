const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const scanStartOld = `    try {
      if (fs.existsSync(currentLibraryPath) && currentLibraryPath !== mediaDir) {
        const files = fs.readdirSync(currentLibraryPath);
        scanProgress.totalFiles = files.length;
        
        let copiedCount = 0;
        files.forEach(file => {
          const srcPath = path.join(currentLibraryPath, file);
          const destPath = path.join(mediaDir, file);
          try {
            if (fs.statSync(srcPath).isFile()) {
              fs.copyFileSync(srcPath, destPath);
              copiedCount++;
              scanProgress.logMessages.push(\`[COPY] Copied \${file}\`);
            }
          } catch (e) {
            scanProgress.logMessages.push(\`[ERROR] Failed to copy \${file}\`);
          }
        });
        scanProgress.scannedCount = copiedCount;
        scanProgress.logMessages.push(\`[COMPLETE] Copied \${copiedCount} files to media_uploads\`);
      } else {
        scanProgress.logMessages.push(\`[WARNING] Path not found or is same as mediaDir: \${currentLibraryPath}\`);
      }
    } catch (e: any) {
      scanProgress.logMessages.push(\`[ERROR] Scan failed: \${e.message}\`);
    }`;

const scanStartNew = `    try {
      if (fs.existsSync(currentLibraryPath)) {
        const files = fs.readdirSync(currentLibraryPath);
        scanProgress.totalFiles = files.length;
        
        let indexedItems = [];
        if (fs.existsSync(INDEX_FILE)) {
          try {
             indexedItems = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
          } catch (e) {}
        }
        
        let indexedCount = 0;
        const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm', '.heic', '.webp'];

        for (const file of files) {
          const srcPath = path.join(currentLibraryPath, file);
          try {
            const stat = fs.statSync(srcPath);
            if (stat.isFile()) {
              const ext = path.extname(file).toLowerCase();
              if (supportedExts.includes(ext)) {
                const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
                let realExif = {};
                if (!isVideo) {
                   try {
                     // Using dynamic import or waiting for exifr since it's already imported
                     // Note: app.post('/api/scan/start') is not async in the original code, but we can make it async
                     // Wait, in server.ts we should change app.post('/api/scan/start', (req, res) => ... to async (req, res) =>
                   } catch(e) {}
                }
                
                indexedItems = indexedItems.filter(i => i.path !== srcPath);
                
                let lat = undefined;
                let lng = undefined;

                const newItem = {
                  id: \`media-idx-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`,
                  title: file,
                  filename: file,
                  path: srcPath,
                  url: \`/api/serve-media?path=\${encodeURIComponent(srcPath)}\`,
                  thumbnailUrl: \`/api/serve-media?path=\${encodeURIComponent(srcPath)}\`,
                  type: isVideo ? 'video' : 'image',
                  date: stat.birthtime.toISOString().split('T')[0],
                  dateFormatted: new Date(stat.birthtime.toISOString()).toLocaleDateString(),
                  exif: {
                    camera: '',
                    lens: '',
                    aperture: '',
                    shutter: '',
                    iso: 0,
                    focalLength: '',
                    dimensions: '1920 x 1080',
                    width: 1920,
                    height: 1080,
                    size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                    sizeBytes: stat.size,
                    colorSpace: 'sRGB',
                    dateTaken: stat.birthtime.toISOString().replace('T', ' ').substring(0, 19),
                    format: ext.toUpperCase().replace('.', '')
                  },
                  location: undefined,
                  tags: ['indexed', isVideo ? 'video' : 'image'],
                  detectedObjects: [],
                  isFavorite: false
                };
                
                indexedItems.push(newItem);
                indexedCount++;
                scanProgress.logMessages.push(\`[INDEX] Indexed \${file}\`);
              }
            }
          } catch (e) {
            scanProgress.logMessages.push(\`[ERROR] Failed to read \${file}\`);
          }
        }
        
        fs.writeFileSync(INDEX_FILE, JSON.stringify(indexedItems, null, 2));
        scanProgress.scannedCount = indexedCount;
        scanProgress.logMessages.push(\`[COMPLETE] Indexed \${indexedCount} files\`);
      } else {
        scanProgress.logMessages.push(\`[WARNING] Path not found: \${currentLibraryPath}\`);
      }
    } catch (e: any) {
      scanProgress.logMessages.push(\`[ERROR] Scan failed: \${e.message}\`);
    }`;

content = content.replace("app.post('/api/scan/start', (req, res) => {", "app.post('/api/scan/start', async (req, res) => {");
content = content.replace(scanStartOld, scanStartNew);

fs.writeFileSync('server.ts', content);
