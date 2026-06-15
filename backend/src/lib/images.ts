/**
 * Slår opp artsbilder lagt i backend/public/images/.
 *
 * Konvensjon: bildefilen navngis NØYAKTIG som artens navnNo
 * (f.eks. "Veggedyr.jpg"), med filendelse .jpg, .jpeg, .png eller .webp.
 * Filer leses inn ved oppstart - restart backend etter å ha lagt til bilder.
 */

import { readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, "../../public/images");
const EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i;

const imageByName = new Map<string, string>();

try {
  for (const filename of readdirSync(IMAGES_DIR)) {
    if (!EXTENSION_PATTERN.test(filename)) continue;
    const name = filename.replace(EXTENSION_PATTERN, "");
    imageByName.set(name.toLowerCase(), filename);
  }
} catch {
  // Mappen finnes ikke ennå - ingen artsbilder lagt til.
}

/** Returnerer URL-sti til artsbildet (f.eks. "/images/Veggedyr.jpg"), eller "" hvis ikke funnet. */
export function findImageUrl(navnNo: string): string {
  const filename = imageByName.get(navnNo.toLowerCase());
  return filename ? `/images/${encodeURIComponent(filename)}` : "";
}

/** Returnerer en kopi av arten med bildeUrl satt hvis et bilde finnes for navnNo. */
export function withImage<T extends { navnNo: string; bildeUrl: string }>(art: T): T {
  const bildeUrl = findImageUrl(art.navnNo);
  return bildeUrl ? { ...art, bildeUrl } : art;
}
