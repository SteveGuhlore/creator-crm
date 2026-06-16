// Rasterize an SVG file to a high-res PNG via sharp (store path).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharpPath = require.resolve('sharp', {
  paths: ['node_modules/.pnpm/sharp@0.33.5/node_modules'],
});
const sharp = require(sharpPath);
const [, , inFile, outFile, scaleArg] = process.argv;
const scale = Number(scaleArg ?? 2);
const svg = readFileSync(inFile);
await sharp(svg, { density: 96 * scale })
  .png()
  .toFile(outFile);
console.log('rendered', outFile);
