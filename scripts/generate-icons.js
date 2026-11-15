// scripts/generate-icons.js
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createSolidPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Generate image data: draw dark background (#06080e) with a cyan circle (#00d4ff)
  const rowLen = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowLen);
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.35;
  const innerRadius = width * 0.16;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= innerRadius) {
        // Cyan core (#00d4ff)
        rawData[pxOffset] = 0x00;
        rawData[pxOffset + 1] = 0xd4;
        rawData[pxOffset + 2] = 0xff;
      } else if (dist <= radius && dist >= radius * 0.8) {
        // Cyan ring
        rawData[pxOffset] = 0x00;
        rawData[pxOffset + 1] = 0xd4;
        rawData[pxOffset + 2] = 0xff;
      } else {
        // Dark background (#06080e)
        rawData[pxOffset] = 0x06;
        rawData[pxOffset + 1] = 0x08;
        rawData[pxOffset + 2] = 0x0e;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), createSolidPNG(192, 192));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), createSolidPNG(512, 512));
fs.writeFileSync(path.join(__dirname, '..', 'favicon.png'), createSolidPNG(64, 64));
console.log('Generated PNG icons in assets/ successfully.');
