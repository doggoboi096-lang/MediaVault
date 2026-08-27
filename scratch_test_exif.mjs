import exifr from 'exifr';
import fs from 'fs';
import heicConvert from 'heic-convert';

// Patch exifr for modern Apple HEIC
const heicParser = exifr.fileParsers.get('heic');
if (heicParser) {
  const originalCanHandle = heicParser.canHandle;
  heicParser.canHandle = function(chunk, ...args) {
    if (chunk && chunk.byteLength >= 12) {
      const str = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength).toString('latin1');
      if (str.includes('ftypheic') || str.includes('ftypmif1') || str.includes('ftypmsf1') || str.includes('ftyphevc') || str.includes('ftypheix')) return true;
    }
    return originalCanHandle.call(this, chunk, ...args);
  };
}

export async function convertHeicToJpegWithExif(heicBufferOrPath, quality = 0.88) {
  const heicBuf = typeof heicBufferOrPath === 'string' ? fs.readFileSync(heicBufferOrPath) : heicBufferOrPath;

  // 1. Extract raw metadata segments (TIFF/EXIF, ICC, XMP)
  let rawTiff = null;
  let rawIcc = null;
  try {
    const ex = new exifr.Exifr({ tiff: true, xmp: true, icc: true, gps: true, raw: true });
    await ex.read(heicBuf);
    await ex.parse();
    if (ex.parsers?.tiff?.chunk) {
      const ch = ex.parsers.tiff.chunk;
      rawTiff = Buffer.from(ch.buffer, ch.byteOffset, ch.byteLength);
    }
    if (ex.parsers?.icc?.chunk) {
      const ch = ex.parsers.icc.chunk;
      rawIcc = Buffer.from(ch.buffer, ch.byteOffset, ch.byteLength);
    }
  } catch (err) {
    console.warn('Could not extract raw metadata segments from HEIC:', err.message);
  }

  // 2. Convert HEIC to raw JPEG buffer
  const rawJpg = Buffer.from(await heicConvert({ buffer: heicBuf, format: 'JPEG', quality }));

  if (rawJpg.length < 2 || rawJpg[0] !== 0xFF || rawJpg[1] !== 0xD8) {
    return rawJpg;
  }

  const extraSegments = [];

  // 3. Construct APP1 (EXIF) segment
  if (rawTiff) {
    const app1Header = Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // 'Exif\0\0'
    const app1Length = 2 + app1Header.length + rawTiff.length;
    const app1Marker = Buffer.alloc(4);
    app1Marker[0] = 0xFF;
    app1Marker[1] = 0xE1;
    app1Marker.writeUInt16BE(app1Length, 2);
    extraSegments.push(Buffer.concat([app1Marker, app1Header, rawTiff]));
  }

  // 4. Construct APP2 (ICC Profile) segment
  if (rawIcc) {
    const app2Header = Buffer.from('ICC_PROFILE\0\x01\x01', 'latin1');
    const app2Length = 2 + app2Header.length + rawIcc.length;
    const app2Marker = Buffer.alloc(4);
    app2Marker[0] = 0xFF;
    app2Marker[1] = 0xE2;
    app2Marker.writeUInt16BE(app2Length, 2);
    extraSegments.push(Buffer.concat([app2Marker, app2Header, rawIcc]));
  }

  if (extraSegments.length === 0) {
    return rawJpg;
  }

  // 5. Combine JPEG SOI (0xFF 0xD8) + extra metadata segments + rest of JPEG
  return Buffer.concat([
    rawJpg.subarray(0, 2),
    ...extraSegments,
    rawJpg.subarray(2)
  ]);
}

async function run() {
  const jpgWithExif = await convertHeicToJpegWithExif('test.heic');
  fs.writeFileSync('test_converted_full.jpg', jpgWithExif);
  
  const parsed = await exifr.parse('test_converted_full.jpg', { tiff: true, xmp: true, icc: true, gps: true });
  console.log('\n--- VERIFICATION OF FULL CONVERTED JPEG FILE ---');
  console.log('Camera:', parsed.Make, parsed.Model);
  console.log('Lens:', parsed.LensModel);
  console.log('DateTimeOriginal:', parsed.DateTimeOriginal);
  console.log('ISO:', parsed.ISO, 'Aperture:', parsed.FNumber, 'Shutter:', parsed.ExposureTime);
  console.log('GPS Latitude & Longitude:', parsed.latitude, parsed.longitude);
  console.log('ProfileDescription (ICC):', parsed.ProfileDescription);
  console.log('ExifImageWidth x Height:', parsed.ExifImageWidth, 'x', parsed.ExifImageHeight);
}

run().catch(console.error);
