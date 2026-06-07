import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(dir, "../public/icon.svg"));

await sharp(svg).resize(512).png().toFile(join(dir, "../public/icon-512.png"));
console.log("✓ public/icon-512.png");

await sharp(svg).resize(192).png().toFile(join(dir, "../public/icon-192.png"));
console.log("✓ public/icon-192.png");

await sharp(svg).resize(180).png().toFile(join(dir, "../public/apple-touch-icon.png"));
console.log("✓ public/apple-touch-icon.png");
