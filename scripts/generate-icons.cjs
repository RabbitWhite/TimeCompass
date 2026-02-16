const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crcVal]);
}

function createPNG(size, drawFn) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const color = drawFn(x, y, width, height);
      rawData[px] = color[0];
      rawData[px + 1] = color[1];
      rawData[px + 2] = color[2];
      rawData[px + 3] = color[3];
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

const purple = [108, 99, 255, 255];
const white = [255, 255, 255, 255];
const transparent = [0, 0, 0, 0];

function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.43;

  // Rounded square (superellipse) check
  const nx = Math.abs((x - cx) / radius);
  const ny = Math.abs((y - cy) / radius);
  const n = 4; // roundedness exponent
  const dist = Math.pow(nx, n) + Math.pow(ny, n);

  if (dist > 1.0) return transparent;

  // Anti-alias the edge
  const edgeDist = 1.0 - dist;
  const aa = Math.min(1, edgeDist * radius * 0.5);

  // Relative position inside shape
  const relX = (x - cx) / radius;
  const relY = (y - cy) / radius;

  // Draw "L" letter
  const barW = 0.16;
  const left = -0.30;
  const top = -0.42;
  const bottom = 0.42;
  const right = 0.30;

  let isLetter = false;
  // Vertical bar
  if (relX >= left && relX <= left + barW && relY >= top && relY <= bottom) {
    isLetter = true;
  }
  // Horizontal bar
  if (relX >= left && relX <= right && relY >= bottom - barW && relY <= bottom) {
    isLetter = true;
  }

  const color = isLetter ? white : purple;
  return [color[0], color[1], color[2], Math.round(aa * 255)];
}

// Maskable icon: full bleed purple with centered "L"
function drawMaskableIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.32; // smaller letter for safe zone

  const relX = (x - cx) / radius;
  const relY = (y - cy) / radius;

  const barW = 0.16;
  const left = -0.30;
  const top = -0.42;
  const bottom = 0.42;
  const right = 0.30;

  let isLetter = false;
  if (relX >= left && relX <= left + barW && relY >= top && relY <= bottom) {
    isLetter = true;
  }
  if (relX >= left && relX <= right && relY >= bottom - barW && relY <= bottom) {
    isLetter = true;
  }

  return isLetter ? white : purple;
}

const sizes = [192, 512];
const publicDir = __dirname + '/../public';

sizes.forEach(size => {
  const png = createPNG(size, drawIcon);
  fs.writeFileSync(`${publicDir}/icon-${size}x${size}.png`, png);
  console.log(`Generated icon-${size}x${size}.png (${png.length} bytes)`);
});

sizes.forEach(size => {
  const png = createPNG(size, drawMaskableIcon);
  fs.writeFileSync(`${publicDir}/icon-${size}x${size}-maskable.png`, png);
  console.log(`Generated icon-${size}x${size}-maskable.png (${png.length} bytes)`);
});

console.log('Done!');
