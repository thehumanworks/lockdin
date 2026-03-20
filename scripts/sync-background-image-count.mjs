import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = path.join(root, "assets", "images");
const contentPath = path.join(root, "content.js");

const nums = fs
  .readdirSync(imagesDir)
  .map((f) => /^photo_(\d+)\.jpe?g$/i.exec(f))
  .filter(Boolean)
  .map((m) => Number(m[1], 10));

if (!nums.length) {
  throw new Error(`No photo_*.jpg in ${imagesDir}`);
}

const count = Math.max(...nums) + 1;
for (let i = 0; i < count; i++) {
  if (!nums.includes(i)) {
    console.warn(`warning: missing photo_${i}.jpg (expected 0..${count - 1})`);
  }
}

let source = fs.readFileSync(contentPath, "utf8");

const pattern =
  /const\s+BACKGROUND_IMAGES\s*=\s*Array\.from\(\{\s*length:\s*(\d+)\s*\}\s*,/;

const match = source.match(pattern);
if (!match) {
  throw new Error(
    "Could not find `const BACKGROUND_IMAGES = Array.from({ length: N }, ...)` in content.js — restore that shape or update this script."
  );
}

const current = Number(match[1], 10);
if (current === count) {
  console.log(`BACKGROUND_IMAGES length already ${count} (photo_0 … photo_${count - 1})`);
  process.exit(0);
}

const patched = source.replace(pattern, `const BACKGROUND_IMAGES = Array.from({ length: ${count} },`);

fs.writeFileSync(contentPath, patched);
console.log(`BACKGROUND_IMAGES length set to ${count} (photo_0 … photo_${count - 1})`);
