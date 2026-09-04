// One-off asset pipeline: turns the two supplied brand source images into
// every icon size dayli needs for the manifest, Apple touch icon and favicon.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const brand = path.join(root, "public", "brand");
const icons = path.join(root, "public", "icons");

const ICON_SOURCE = path.join(brand, "icon-source.png");
const LOGO_SOURCE = path.join(brand, "logo-source.png");

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

async function main() {
  await mkdir(icons, { recursive: true });

  for (const size of sizes) {
    await sharp(ICON_SOURCE)
      .resize(size, size, { fit: "cover" })
      .png({ quality: 92 })
      .toFile(path.join(icons, `icon-${size}.png`));
  }

  // Apple touch icon (no alpha, iOS applies its own rounding).
  await sharp(ICON_SOURCE)
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: "#080A13" })
    .png()
    .toFile(path.join(root, "public", "apple-touch-icon.png"));

  // Maskable icon: pad so the logo sits inside Android's ~80% safe zone.
  await sharp(ICON_SOURCE)
    .resize(410, 410, { fit: "cover" })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: "#080A13",
    })
    .png()
    .toFile(path.join(icons, "icon-maskable-512.png"));

  // Favicon-sized PNGs (browsers accept PNG favicons via manifest link).
  await sharp(ICON_SOURCE)
    .resize(32, 32, { fit: "cover" })
    .png()
    .toFile(path.join(root, "public", "favicon-32.png"));
  await sharp(ICON_SOURCE)
    .resize(16, 16, { fit: "cover" })
    .png()
    .toFile(path.join(root, "public", "favicon-16.png"));

  // Trim the transparent header logo to its visible bounding box so it sits
  // tight against surrounding UI instead of carrying empty padding.
  const trimmed = sharp(LOGO_SOURCE).trim({ threshold: 10 });
  await trimmed.png().toFile(path.join(brand, "logo.png"));
  const meta = await sharp(path.join(brand, "logo.png")).metadata();

  // A couple of pre-scaled raster fallbacks for <img> srcset use.
  for (const w of [240, 480, 960]) {
    const h = Math.round((meta.height / meta.width) * w);
    await sharp(path.join(brand, "logo.png"))
      .resize(w, h)
      .png()
      .toFile(path.join(brand, `logo-${w}.png`));
  }

  console.log("Icons generated. Logo aspect:", meta.width, "x", meta.height);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
