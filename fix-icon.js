/**
 * Generates app icons from logo.png:
 *  - icon.png        → 1024×1024, white background (iOS + general)
 *  - adaptive-icon.png → 1024×1024, transparent bg, content in center 66%
 *
 * Run: node fix-icon.js
 */

const Jimp = require("jimp");
const path = require("path");

async function generateIcons() {
  const srcPath = path.join(__dirname, "assets", "logo.png");

  console.log("📸 Loading logo.png...");
  const logo = await Jimp.read(srcPath);

  // ── 1. icon.png (1024×1024, white bg, no transparency — required for iOS) ───
  const ICON_SIZE = 1024;
  const iconCanvas = new Jimp(ICON_SIZE, ICON_SIZE, 0xffffffff); // white
  const logoScaled = logo
    .clone()
    .resize(ICON_SIZE, ICON_SIZE, Jimp.RESIZE_LANCZOS);
  iconCanvas.composite(logoScaled, 0, 0);
  await iconCanvas.writeAsync(path.join(__dirname, "assets", "icon.png"));
  console.log(`✅ icon.png → ${ICON_SIZE}×${ICON_SIZE} (white background)`);

  // ── 2. adaptive-icon.png (1024×1024, transparent bg, content in safe zone) ──
  // Android crops adaptive icons with a circle/squircle mask that covers only
  // the center ~66% of the canvas ("safe zone"). Padding the content to 66%
  // ensures nothing gets clipped on any launcher shape.
  const ADAPTIVE_SIZE = 1024;
  const CONTENT_SIZE = Math.round(ADAPTIVE_SIZE * 0.66); // 676px
  const OFFSET = Math.round((ADAPTIVE_SIZE - CONTENT_SIZE) / 2); // 174px

  const adaptiveCanvas = new Jimp(ADAPTIVE_SIZE, ADAPTIVE_SIZE, 0x00000000); // transparent
  const adaptiveScaled = logo
    .clone()
    .resize(CONTENT_SIZE, CONTENT_SIZE, Jimp.RESIZE_LANCZOS);
  adaptiveCanvas.composite(adaptiveScaled, OFFSET, OFFSET);
  await adaptiveCanvas.writeAsync(
    path.join(__dirname, "assets", "adaptive-icon.png"),
  );
  console.log(
    `✅ adaptive-icon.png → ${ADAPTIVE_SIZE}×${ADAPTIVE_SIZE} (content ${CONTENT_SIZE}px centered, ${OFFSET}px inset)`,
  );
}

generateIcons().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
