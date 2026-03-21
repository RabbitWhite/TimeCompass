/**
 * Pure Node.js PNG decoder + area-averaging downscaler.
 * No external dependencies — uses only built-in `zlib`.
 *
 * Reads public/app-icon.png (any size) and writes:
 *   public/icon-512x512.png
 *   public/icon-192x192.png
 *   public/icon-180x180.png   (iOS apple-touch-icon)
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// ─── PNG encoder (same helper as generate-icons.cjs) ─────────────────────────

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
  // pixels: Uint8Array of RGBA, row-major
  const rawRows = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    rawRows[y * (1 + w * 4)] = 0; // filter: None
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
  ihdrData[8] = 8; ihdrData[9] = 6; // RGBA
  const compressed = zlib.deflateSync(rawRows, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── PNG decoder ─────────────────────────────────────────────────────────────

function decodePNG(buf) {
  let pos = 8; // skip signature

  function readUint32() { const v = buf.readUInt32BE(pos); pos += 4; return v; }
  function readBytes(n) { const s = buf.slice(pos, pos + n); pos += n; return s; }

  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (pos < buf.length) {
    const length = readUint32();
    const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = buf.slice(pos, pos + length); pos += length;
    pos += 4; // skip CRC

    if (type === 'IHDR') {
      width     = data.readUInt32BE(0);
      height    = data.readUInt32BE(4);
      bitDepth  = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error('Only 8-bit PNG supported, got ' + bitDepth);

  // channels per pixel
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : null;
  if (!channels) throw new Error('Unsupported color type: ' + colorType);

  const compressed = Buffer.concat(idatChunks);
  const raw = zlib.inflateSync(compressed);

  const stride = 1 + width * channels; // filter byte + row bytes
  const pixels = new Uint8Array(width * height * 4);

  // Paeth predictor
  function paeth(a, b, c) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  // Reconstruct rows (defilter)
  const recon = new Uint8Array(height * width * channels);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    const rowSrc = y * stride + 1;
    const rowDst = y * width * channels;
    const prevRow = y > 0 ? recon.subarray((y - 1) * width * channels) : null;

    for (let i = 0; i < width * channels; i++) {
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
        default: throw new Error('Unknown filter type: ' + filter);
      }
    }
  }

  // Convert to RGBA
  for (let i = 0; i < width * height; i++) {
    if (channels === 4) {
      pixels[i * 4]     = recon[i * 4];
      pixels[i * 4 + 1] = recon[i * 4 + 1];
      pixels[i * 4 + 2] = recon[i * 4 + 2];
      pixels[i * 4 + 3] = recon[i * 4 + 3];
    } else if (channels === 3) {
      pixels[i * 4]     = recon[i * 3];
      pixels[i * 4 + 1] = recon[i * 3 + 1];
      pixels[i * 4 + 2] = recon[i * 3 + 2];
      pixels[i * 4 + 3] = 255;
    } else { // grayscale
      const v = recon[i];
      pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = v;
      pixels[i * 4 + 3] = 255;
    }
  }

  return { pixels, width, height };
}

// ─── Area-averaging downscale (premultiplied alpha) ───────────────────────────
//
// Averaging straight (non-premultiplied) RGBA with transparent pixels causes
// colour bleeding: e.g. a transparent-white corner averaged with an opaque dark
// edge produces a grey/white fringe. Fix: premultiply RGB by A before averaging,
// then un-premultiply afterwards so only opaque pixels contribute colour.

function resize(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const x0 = dx * scaleX, x1 = x0 + scaleX;
      const y0 = dy * scaleY, y1 = y0 + scaleY;

      // Accumulate in premultiplied space
      let pr = 0, pg = 0, pb = 0, pa = 0, weight = 0;

      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
          const w = wx * wy;
          const idx = (Math.min(sy, srcH - 1) * srcW + Math.min(sx, srcW - 1)) * 4;
          const alpha = src[idx + 3] / 255;
          pr += src[idx]     * alpha * w;
          pg += src[idx + 1] * alpha * w;
          pb += src[idx + 2] * alpha * w;
          pa += src[idx + 3]         * w;
          weight += w;
        }
      }

      const out = (dy * dstW + dx) * 4;
      const avgA = pa / weight;
      if (avgA < 1) {
        // Nearly transparent — write transparent black to avoid any fringe
        dst[out] = dst[out + 1] = dst[out + 2] = dst[out + 3] = 0;
      } else {
        // Un-premultiply
        const invA = 255 / avgA;
        dst[out]     = Math.min(255, Math.round(pr / weight * invA));
        dst[out + 1] = Math.min(255, Math.round(pg / weight * invA));
        dst[out + 2] = Math.min(255, Math.round(pb / weight * invA));
        dst[out + 3] = Math.min(255, Math.round(avgA));
      }
    }
  }
  return dst;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const src = decodePNG(fs.readFileSync(path.join(publicDir, 'app-icon.png')));
console.log(`Source: ${src.width}x${src.height}`);

const targets = [
  { size: 512, name: 'icon-512x512.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 180, name: 'icon-180x180.png' },
];

for (const { size, name } of targets) {
  const pixels = resize(src.pixels, src.width, src.height, size, size);
  const png = encodePNG(pixels, size, size);
  fs.writeFileSync(path.join(publicDir, name), png);
  console.log(`Written ${name} (${png.length} bytes)`);
}

console.log('Done.');
