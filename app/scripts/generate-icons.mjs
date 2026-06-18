/**
 * Genererer PWA-ikoner og favicon ved hjelp av sharp.
 * Kjør: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appIconSrc = join(__dirname, '../assets/images/app-icon-yellow.png');
const faviconSrc = join(__dirname, '../assets/images/favicon-beetle.png');
const assetsDir = join(__dirname, '../assets/images');
const iconsDir = join(__dirname, '../public/icons');
const pubDir   = join(__dirname, '../public');

mkdirSync(iconsDir, { recursive: true });

const appIconVariants = [
  { name: 'icon-512.png',         size: 512, dir: iconsDir },
  { name: 'icon-192.png',         size: 192, dir: iconsDir },
  { name: 'apple-touch-icon.png', size: 180, dir: iconsDir },
];

const faviconVariants = [
  { name: 'favicon-512.png',      size: 512, dir: iconsDir },
  { name: 'favicon-192.png',      size: 192, dir: iconsDir },
  { name: 'favicon.png',          size: 32,  dir: iconsDir },
  { name: 'favicon.png',          size: 512, dir: assetsDir },
];

for (const { name, size, dir } of appIconVariants) {
  await sharp(appIconSrc).resize(size, size).png().toFile(join(dir, name));
  console.log(`✓ ${name}  (${size}×${size})`);
}

for (const { name, size, dir } of faviconVariants) {
  await sharp(faviconSrc).resize(size, size).png().toFile(join(dir, name));
  console.log(`✓ ${name}  (${size}×${size})`);
}

// favicon.ico: 32×32 PNG embedded in ICO container (works in all modern browsers)
const png32 = await sharp(faviconSrc).resize(32, 32).png().toBuffer();
writeFileSync(join(pubDir, 'favicon.ico'), buildIco(png32));
console.log('✓ favicon.ico  (32×32)');

function buildIco(png) {
  const buf = Buffer.alloc(6 + 16 + png.length);
  let o = 0;
  // ICONDIR
  buf.writeUInt16LE(0, o); o += 2;   // reserved
  buf.writeUInt16LE(1, o); o += 2;   // type: 1 = icon
  buf.writeUInt16LE(1, o); o += 2;   // image count
  // ICONDIRENTRY
  buf.writeUInt8(32,  o); o += 1;    // width
  buf.writeUInt8(32,  o); o += 1;    // height
  buf.writeUInt8(0,   o); o += 1;    // colour count (0 = no palette)
  buf.writeUInt8(0,   o); o += 1;    // reserved
  buf.writeUInt16LE(1,          o); o += 2;   // planes
  buf.writeUInt16LE(32,         o); o += 2;   // bit count
  buf.writeUInt32LE(png.length, o); o += 4;   // bytes in resource
  buf.writeUInt32LE(22,         o); o += 4;   // offset to image data (6+16)
  png.copy(buf, o);
  return buf;
}
