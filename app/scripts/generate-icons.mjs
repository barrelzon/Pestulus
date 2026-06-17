/**
 * Genererer PWA-ikoner som ren PNG uten eksterne avhengigheter.
 * Bruker Node.js zlib for komprimering og manuell PNG-koding.
 *
 * Kjør: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG encoder ─────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

function createPNG(size, pixelBuf /* Uint8Array, RGBA, row-major */) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = 1 + x * 4;
      row[dst]     = pixelBuf[src];
      row[dst + 1] = pixelBuf[src + 1];
      row[dst + 2] = pixelBuf[src + 2];
      row[dst + 3] = pixelBuf[src + 3];
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────
function drawBeetle(size) {
  const buf = new Uint8Array(size * size * 4); // all transparent

  const BG  = [0x1a, 0x1a, 0x1a, 0xff];
  const FG  = [0xc9, 0xa2, 0x4b, 0xff]; // accent gold
  const FGD = [0x9a, 0x7a, 0x30, 0xff]; // darker gold for divider

  function set(x, y, c) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (Math.round(y) * size + Math.round(x)) * 4;
    buf[i] = c[0]; buf[i+1] = c[1]; buf[i+2] = c[2]; buf[i+3] = c[3];
  }

  function fillRect(x0, y0, w, h, c) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) set(x, y, c);
  }

  function fillRoundRect(x0, y0, w, h, r, c) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const dx = x < x0 + r ? x0 + r - x : x > x0 + w - r - 1 ? x - (x0 + w - r - 1) : 0;
        const dy = y < y0 + r ? y0 + r - y : y > y0 + h - r - 1 ? y - (y0 + h - r - 1) : 0;
        if (dx * dx + dy * dy <= r * r) set(x, y, c);
      }
    }
  }

  function fillEllipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if ((x-cx)*(x-cx)/(rx*rx) + (y-cy)*(y-cy)/(ry*ry) <= 1) set(x, y, c);
  }

  function fillCircle(cx, cy, r, c) { fillEllipse(cx, cy, r, r, c); }

  function strokeLine(x0, y0, x1, y1, thick, c) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const steps = Math.ceil(len * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x0 + dx * t, py = y0 + dy * t;
      for (let w = -thick / 2; w <= thick / 2; w += 0.5) {
        set(px + nx * w, py + ny * w, c);
      }
    }
  }

  const n = size;
  const cx = n / 2, cy = n / 2;

  // Background
  fillRoundRect(0, 0, n, n, n * 0.18, BG);

  // --- Beetle ---
  const bCY   = cy + n * 0.04;         // body centre Y (slightly below centre)
  const bRX   = n * 0.21;              // body half-width
  const bRY   = n * 0.30;             // body half-height
  const hR    = n * 0.095;            // head radius
  const hCY   = bCY - bRY - hR * 0.4; // head centre Y

  // Body (two wings as one ellipse)
  fillEllipse(cx, bCY, bRX, bRY, FG);

  // Wing-split divider
  const divThick = Math.max(2, n * 0.02);
  strokeLine(cx, bCY - bRY + n * 0.04, cx, bCY + bRY - n * 0.02, divThick, FGD);

  // Head
  fillCircle(cx, hCY, hR, FG);

  // Antennae
  const antT = Math.max(1, n * 0.013);
  const antL = n * 0.14;
  strokeLine(cx, hCY, cx - antL * 0.65, hCY - antL, antT, FG);
  strokeLine(cx, hCY, cx + antL * 0.65, hCY - antL, antT, FG);

  // Legs (3 pairs)
  const legT  = Math.max(1, n * 0.013);
  const legL  = n * 0.17;
  const legYs = [bCY - bRY * 0.4, bCY, bCY + bRY * 0.42];
  for (const legY of legYs) {
    const ox = bRX - n * 0.01;
    strokeLine(cx - ox, legY, cx - ox - legL, legY + legL * 0.35, legT, FG);
    strokeLine(cx + ox, legY, cx + ox + legL, legY + legL * 0.35, legT, FG);
  }

  return buf;
}

// ── Generate ────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '../public/icons');
mkdirSync(outDir, { recursive: true });

for (const { size, name } of [
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]) {
  const buf = drawBeetle(size);
  writeFileSync(join(outDir, name), createPNG(size, buf));
  console.log(`✓ ${name}  (${size}×${size})`);
}
