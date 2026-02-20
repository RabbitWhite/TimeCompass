/**
 * 1. Loads app-icon.png (which has transparent padding + transparent rounded corners).
 * 2. Crops to the tight bounding box of all opaque pixels (removes padding).
 * 3. Fills every remaining transparent pixel with the colour of its nearest
 *    opaque neighbour (BFS distance transform) — naturally extends the dark
 *    border colour into the rounded corners without hard edges.
 * 4. Saves the result back to app-icon.png as a fully opaque RGBA image.
 *
 * Run this BEFORE resize-icon.cjs.
 * No external dependencies — uses only built-in `zlib`.
 */

const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// ─── PNG helpers ──────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td  = Buffer.concat([Buffer.from(type), data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crcBuf]);
}

function encodePNG(pixels, w, h) {
  const rawRows = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawRows[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4;
      const dst = y * (1 + w * 4) + 1 + x * 4;
      rawRows[dst]     = pixels[src];
      rawRows[dst + 1] = pixels[src + 1];
      rawRows[dst + 2] = pixels[src + 2];
      rawRows[dst + 3] = pixels[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rawRows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function decodePNG(buf) {
  let pos = 8;
  function ru() { const v = buf.readUInt32BE(pos); pos += 4; return v; }
  let W, H, ct;
  const idatChunks = [];
  while (pos < buf.length) {
    const len  = ru();
    const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = buf.slice(pos, pos + len);                 pos += len;
    pos += 4;
    if (type === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); ct = data[9]; }
    if (type === 'IDAT') idatChunks.push(data);
    if (type === 'IEND') break;
  }
  const ch  = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = 1 + W * ch;
  const pixels = new Uint8Array(W * H * 4);
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  const recon = new Uint8Array(H * W * ch);
  for (let y = 0; y < H; y++) {
    const filter = raw[y * stride];
    const rowSrc = y * stride + 1, rowDst = y * W * ch;
    const prevRow = y > 0 ? recon.subarray((y - 1) * W * ch) : null;
    for (let i = 0; i < W * ch; i++) {
      const x = raw[rowSrc + i];
      const a = i >= ch ? recon[rowDst + i - ch] : 0;
      const b = prevRow ? prevRow[i] : 0;
      const c = (prevRow && i >= ch) ? prevRow[i - ch] : 0;
      switch (filter) {
        case 0: recon[rowDst+i] = x; break;
        case 1: recon[rowDst+i] = (x+a)&0xff; break;
        case 2: recon[rowDst+i] = (x+b)&0xff; break;
        case 3: recon[rowDst+i] = (x+Math.floor((a+b)/2))&0xff; break;
        case 4: recon[rowDst+i] = (x+paeth(a,b,c))&0xff; break;
      }
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (ch === 4) {
      pixels[i*4]=recon[i*4]; pixels[i*4+1]=recon[i*4+1];
      pixels[i*4+2]=recon[i*4+2]; pixels[i*4+3]=recon[i*4+3];
    } else if (ch === 3) {
      pixels[i*4]=recon[i*3]; pixels[i*4+1]=recon[i*3+1];
      pixels[i*4+2]=recon[i*3+2]; pixels[i*4+3]=255;
    } else {
      const v=recon[i]; pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=v; pixels[i*4+3]=255;
    }
  }
  return { pixels, width: W, height: H };
}

// ─── Step 1: find bounding box of opaque pixels ───────────────────────────────

const iconPath = path.join(publicDir, 'app-icon.png');
const { pixels, width: W, height: H } = decodePNG(fs.readFileSync(iconPath));
console.log(`Loaded ${W}x${H}`);

const ALPHA_THRESHOLD = 128;

let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (pixels[(y * W + x) * 4 + 3] >= ALPHA_THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log(`Opaque bounding box: (${minX},${minY}) → (${maxX},${maxY})`);

const cW = maxX - minX + 1;
const cH = maxY - minY + 1;

// ─── Step 2: crop to bounding box ────────────────────────────────────────────

const cropped = new Uint8Array(cW * cH * 4);
for (let y = 0; y < cH; y++) {
  for (let x = 0; x < cW; x++) {
    const src = ((y + minY) * W + (x + minX)) * 4;
    const dst = (y * cW + x) * 4;
    cropped[dst]     = pixels[src];
    cropped[dst + 1] = pixels[src + 1];
    cropped[dst + 2] = pixels[src + 2];
    cropped[dst + 3] = pixels[src + 3];
  }
}
console.log(`Cropped to ${cW}x${cH}`);

// ─── Step 2b: pad to square (centre the content) ─────────────────────────────

const side = Math.max(cW, cH);
const padX  = Math.floor((side - cW) / 2);
const padY  = Math.floor((side - cH) / 2);

let square = cropped;
let sW = cW, sH = cH;

if (cW !== cH) {
  square = new Uint8Array(side * side * 4); // all zeros = transparent
  for (let y = 0; y < cH; y++) {
    for (let x = 0; x < cW; x++) {
      const src = (y * cW + x) * 4;
      const dst = ((y + padY) * side + (x + padX)) * 4;
      square[dst]     = cropped[src];
      square[dst + 1] = cropped[src + 1];
      square[dst + 2] = cropped[src + 2];
      square[dst + 3] = cropped[src + 3];
    }
  }
  sW = sH = side;
  console.log(`Padded to ${side}x${side} (offset ${padX},${padY})`);
}

// ─── Step 3: BFS nearest-opaque-neighbour fill ────────────────────────────────
//
// Starting from every opaque pixel, expand outward (BFS) into transparent
// pixels, colouring each one with the colour of whichever opaque pixel reaches
// it first (= nearest opaque pixel).  Because the fill colour comes from the
// actual dark-blue edges of the rounded shape, the corners blend in naturally.

const filled  = new Uint8Array(square);   // copy
const visited = new Uint8Array(sW * sH);  // 0 = not yet settled

// Int32 queue (pixel indices) — pre-allocate generously
const queue = new Int32Array(sW * sH);
let head = 0, tail = 0;

// Seed: all opaque pixels are already "settled"
for (let i = 0; i < sW * sH; i++) {
  if (filled[i * 4 + 3] >= ALPHA_THRESHOLD) {
    visited[i] = 1;
    queue[tail++] = i;
    filled[i * 4 + 3] = 255; // ensure fully opaque
  }
}

while (head < tail) {
  const idx = queue[head++];
  const x = idx % sW, y = (idx / sW) | 0;
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= sW || ny < 0 || ny >= sH) continue;
    const ni = ny * sW + nx;
    if (visited[ni]) continue;
    visited[ni] = 1;
    // Copy colour from current settled pixel, make fully opaque
    filled[ni * 4]     = filled[idx * 4];
    filled[ni * 4 + 1] = filled[idx * 4 + 1];
    filled[ni * 4 + 2] = filled[idx * 4 + 2];
    filled[ni * 4 + 3] = 255;
    queue[tail++] = ni;
  }
}

console.log('BFS fill complete');

// ─── Save ─────────────────────────────────────────────────────────────────────

const png = encodePNG(filled, sW, sH);
fs.writeFileSync(iconPath, png);
console.log(`Saved ${iconPath} (${sW}x${sH}, fully opaque, ${png.length} bytes)`);
