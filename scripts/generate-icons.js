import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync('public/icon.svg');

const sizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192
};

async function run() {
  for (const [folder, size] of Object.entries(sizes)) {
    const targetDir = path.join('android', 'app', 'src', 'main', 'res', `mipmap-${folder}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetDir, 'ic_launcher.png'));
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(targetDir, 'ic_launcher_round.png'));
    const fgSize = Math.round(size * 108 / 48);
    await sharp(svgBuffer).resize(fgSize, fgSize).png().toFile(path.join(targetDir, 'ic_launcher_foreground.png'));
    console.log(`Generated Android icons for mipmap-${folder} (${size}x${size})`);
  }

  // Also generate PWA icons
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join('public', 'pwa-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join('public', 'pwa-512x512.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join('public', 'apple-touch-icon.png'));
  console.log('Generated PWA icons (192, 512, apple-touch-icon)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
