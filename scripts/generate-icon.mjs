/**
 * Generates public/icon.png + build/icon.png from scripts/icon.svg
 *
 * Both outputs use the same squircle artwork (rx=230, fills full 1024×1024).
 * Squircle is baked in because macOS does NOT auto-apply it to sideloaded apps.
 * Accurate size comparison vs Chrome/VS Code requires installing from DMG.
 */
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIZE = 1024

const svgSrc = readFileSync(resolve(__dirname, 'icon.svg'), 'utf-8')

// Squircle at 95% of canvas with padding to match macOS App Store icon visual size
const SQ = Math.round(SIZE * 0.80)          // 819
const SO = Math.round((SIZE - SQ) / 2)      // 102
const SR = Math.round(230 * 0.80)           // 184

const svgWithSquircle = svgSrc
  .replace('</defs>', `
    <clipPath id="squircle">
      <rect x="${SO}" y="${SO}" width="${SQ}" height="${SQ}" rx="${SR}" ry="${SR}"/>
    </clipPath>
  </defs>`)
  .replace(
    /(<\/defs>\s*)([\s\S]+?)(<\/svg>)/,
    (_, defsEnd, content, svgEnd) =>
      `${defsEnd}<g clip-path="url(#squircle)">${content}</g>${svgEnd}`
  )

const png = await sharp(Buffer.from(svgWithSquircle)).resize(SIZE, SIZE).png().toBuffer()

for (const p of [
  resolve(__dirname, '../public/icon.png'),
  resolve(__dirname, '../build/icon.png'),
]) {
  mkdirSync(resolve(p, '..'), { recursive: true })
  await sharp(png).toFile(p)
}

console.log(`✓ Icon generated: ${SIZE}×${SIZE} → public/ + build/ (squircle rx=230)`)
