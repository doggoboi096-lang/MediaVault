const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const scanExifOld = `                if (!isVideo) {
                   try {
                     // Using dynamic import or waiting for exifr since it's already imported
                     // Note: app.post('/api/scan/start') is not async in the original code, but we can make it async
                     // Wait, in server.ts we should change app.post('/api/scan/start', (req, res) => ... to async (req, res) =>
                   } catch(e) {}
                }`;
const scanExifNew = `                if (!isVideo) {
                   try {
                     realExif = await exifr.parse(srcPath) || {};
                   } catch(e) {}
                }
                
                const imgWidth = realExif.ExifImageWidth || realExif.ImageWidth || 1920;
                const imgHeight = realExif.ExifImageHeight || realExif.ImageHeight || 1080;
                let realDate = stat.birthtime.toISOString();
                if (realExif.DateTimeOriginal) {
                  realDate = new Date(realExif.DateTimeOriginal).toISOString();
                } else if (realExif.CreateDate) {
                  realDate = new Date(realExif.CreateDate).toISOString();
                }

                if (realExif.latitude && realExif.longitude) {
                  lat = realExif.latitude;
                  lng = realExif.longitude;
                }`;

content = content.replace(scanExifOld, scanExifNew);

const objOld = `                  date: stat.birthtime.toISOString().split('T')[0],
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
                  location: undefined,`;
const objNew = `                  date: realDate.split('T')[0],
                  dateFormatted: new Date(realDate).toLocaleDateString(),
                  exif: {
                    camera: realExif.Make ? \`\${realExif.Make} \${realExif.Model || ''}\`.trim() : '',
                    lens: realExif.LensModel || '',
                    aperture: realExif.FNumber ? \`f/\${realExif.FNumber}\` : '',
                    shutter: realExif.ExposureTime ? \`1/\${Math.round(1/realExif.ExposureTime)}s\` : '',
                    iso: realExif.ISO || 0,
                    focalLength: realExif.FocalLength ? \`\${realExif.FocalLength}mm\` : '',
                    dimensions: \`\${imgWidth} x \${imgHeight}\`,
                    width: imgWidth,
                    height: imgHeight,
                    size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
                    sizeBytes: stat.size,
                    colorSpace: realExif.ColorSpace === 1 ? 'sRGB' : 'Uncalibrated',
                    dateTaken: realDate.replace('T', ' ').substring(0, 19),
                    format: ext.toUpperCase().replace('.', '')
                  },
                  location: lat && lng ? {
                    name: 'GPS Location',
                    city: '',
                    country: '',
                    latitude: lat,
                    longitude: lng
                  } : undefined,`;

content = content.replace(objOld, objNew);
fs.writeFileSync('server.ts', content);
