/**
 * Removes the white background from app-icon.png by flood-filling from the
 * four corners and making all connected near-white pixels transparent.
 * Writes the result back to app-icon.png so resize-icon.cjs picks it up.
 *
 * No external dependencies — uses only built-in `zlib`.
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// ─── PNG helpers (shared with generate-icons / resize-icon) ──────────────────

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
  const td = Buffer.concat([Buffer.from(type), data]);
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
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0); ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; ihdrData[9] = 6;
  const compressed = zlib.deflateSync(rawRows, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function decodePNG(buf) {
  let pos = 8;
  function ru() { const v = buf.readUInt32BE(pos); pos += 4; return v; }
  let W, H, bitDepth, colorType;
  const idatChunks = [];
  while (pos < buf.length) {
    const length = ru();
    const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = buf.slice(pos, pos + length); pos += length;
    pos += 4;
    if (type === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    if (type === 'IDAT') idatChunks.push(data);
    if (type === 'IEND') break;
  }
  if (bitDepth !== 8) throw new Error('Only 8-bit PNG supported');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = 1 + W * channels;
  const pixels = new Uint8Array(W * H * 4);
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }
  const recon = new Uint8Array(H * W * channels);
  for (let y = 0; y < H; y++) {
    const filter = raw[y * stride];
    const rowSrc = y * stride + 1;
    const rowDst = y * W * channels;
    const prevRow = y > 0 ? recon.subarray((y - 1) * W * channels) : null;
    for (let i = 0; i < W * channels; i++) {
      const x = raw[rowSrc + i];
      const a = i >= channels ? recon[rowDst + i - channels] : 0;
      const b = prevRow ? prevRow[i] : 0;
      const c = (prevRow && i >= channels) ? prevRow[i - channels] : 0;
      switch (filter) {
        case 0: recon[rowDst + i] = x; break;
        case 1: recon[rowDst + i] = (x + a) & 0xff; break;
        case 2: recon[rowDst + i] = (x + b) & 0xff; break;
        case 3: recon[rowDst + i] = (x + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: recon[rowDst + i] = (x + paeth(a, b, c)) & 0xff; break;
      }
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (channels === 4) {
      pixels[i*4]=recon[i*4]; pixels[i*4+1]=recon[i*4+1]; pixels[i*4+2]=recon[i*4+2]; pixels[i*4+3]=recon[i*4+3];
    } else if (channels === 3) {
      pixels[i*4]=recon[i*3]; pixels[i*4+1]=recon[i*3+1]; pixels[i*4+2]=recon[i*3+2]; pixels[i*4+3]=255;
    } else {
      const v=recon[i]; pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=v; pixels[i*4+3]=255;
    }
  }
  return { pixels, width: W, height: H };
}

// ─── Background removal via BFS flood-fill from corners ──────────────────────

const BG_THRESHOLD = 235; // pixels with R,G,B all >= this are "near-white background"

function isBackground(r, g, b) {
  return r >= BG_THRESHOLD && g >= BG_THRESHOLD && b >= BG_THRESHOLD;
}

function removeBg(pixels, W, H) {
  const visited = new Uint8Array(W * H);
  // Use a flat array as BFS queue for speed
  const queue = [];
  function enqueue(x, y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = y * W + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (!isBackground(pixels[p], pixels[p+1], pixels[p+2])) return;
    visited[idx] = 1;
    queue.push(idx);
  }
  // Seed from all 4 corners
  enqueue(0, 0); enqueue(W-1, 0); enqueue(0, H-1); enqueue(W-1, H-1);

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % W, y = (idx / W) | 0;
    // Make this pixel transparent black (avoids any fringe colour contribution)
    pixels[idx*4] = pixels[idx*4+1] = pixels[idx*4+2] = pixels[idx*4+3] = 0;
    enqueue(x-1, y); enqueue(x+1, y); enqueue(x, y-1); enqueue(x, y+1);
  }

  // Second pass: soften any remaining near-white edge pixels adjacent to
  // transparent pixels (clean up antialiased fringe).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (visited[idx]) continue; // already transparent
      const p = idx * 4;
      const r = pixels[p], g = pixels[p+1], b = pixels[p+2];
      if (!isBackground(r, g, b)) continue; // not near-white, keep as-is

      // Near-white pixel NOT reached by flood fill = inside the icon content.
      // Check if any neighbour is transparent (i.e., we're on the fringe).
      let adjacentToTransparent = false;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx = x+dx, ny = y+dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (visited[ny*W+nx]) { adjacentToTransparent = true; break; }
      }
      if (adjacentToTransparent) {
        // White matte removal: alpha = 1 - brightness
        // For a pixel blended over white: pixel = content*a + 255*(1-a)
        // → a = (255 - min(r,g,b)) / 255
        const alpha = Math.round((1 - Math.min(r, g, b) / 255) * 255);
        if (alpha < 32) {
          pixels[p] = pixels[p+1] = pixels[p+2] = pixels[p+3] = 0;
        } else {
          // Un-premultiply: recover original content colour
          const a = alpha / 255;
          pixels[p]   = Math.min(255, Math.round((r - 255 * (1 - a)) / a));
          pixels[p+1] = Math.min(255, Math.round((g - 255 * (1 - a)) / a));
          pixels[p+2] = Math.min(255, Math.round((b - 255 * (1 - a)) / a));
          pixels[p+3] = alpha;
        }
        visited[idx] = 1; // mark as processed
      }
    }
  }

  console.log(`Removed ${queue.length} background pixels`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const iconPath = path.join(publicDir, 'app-icon.png');
const { pixels, width, height } = decodePNG(fs.readFileSync(iconPath));
console.log(`Loaded ${width}x${height} icon`);

removeBg(pixels, width, height);

const png = encodePNG(pixels, width, height);
fs.writeFileSync(iconPath, png);
console.log(`Saved app-icon.png (${png.length} bytes, now RGBA with transparent bg)`);
