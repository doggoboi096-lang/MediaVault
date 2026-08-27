const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "const imgWidth = realExif.ExifImageWidth || realExif.ImageWidth || 1920;",
  "const imgWidth = realExif.ExifImageWidth || realExif.ImageWidth || null;"
);
code = code.replace(
  "const imgHeight = realExif.ExifImageHeight || realExif.ImageHeight || 1080;",
  "const imgHeight = realExif.ExifImageHeight || realExif.ImageHeight || null;"
);
code = code.replace(
  "dimensions: `${imgWidth} x ${imgHeight}`,",
  "dimensions: imgWidth && imgHeight ? `${imgWidth} x ${imgHeight}` : '',"
);

fs.writeFileSync('server.ts', code);
