import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BACKGROUND = "#070605";
const ACCENT = "#edca71";
const OUTPUT_DIR = new URL("../public/icons/", import.meta.url);

type IconOptions = {
  filename: string;
  size: number;
  textScale: number;
};

function iconSvg(size: number, textScale: number) {
  const fontSize = Math.round(size * textScale);

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${BACKGROUND}" />
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        fill="${ACCENT}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        letter-spacing="-0.04em"
        text-anchor="middle"
      >PN</text>
    </svg>
  `);
}

async function generateIcon({ filename, size, textScale }: IconOptions) {
  const outputPath = fileURLToPath(new URL(filename, OUTPUT_DIR));
  await sharp(iconSvg(size, textScale)).png().toFile(outputPath);
}

await mkdir(OUTPUT_DIR, { recursive: true });

await Promise.all([
  generateIcon({ filename: "icon-192.png", size: 192, textScale: 0.42 }),
  generateIcon({ filename: "icon-512.png", size: 512, textScale: 0.42 }),
  // Smaller artwork keeps the maskable icon comfortably inside the inner 80% safe zone.
  generateIcon({ filename: "icon-512-maskable.png", size: 512, textScale: 0.34 }),
]);
