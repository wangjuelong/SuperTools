/**
 * Watches scripts/icon.svg and regenerates public/icon.png + build/icon.png on every save.
 * Run alongside `npm run dev` to see Dock icon update in real time.
 */
import { watch } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, 'icon.svg')
const genPath = resolve(__dirname, 'generate-icon.mjs')

let debounce = null
watch(svgPath, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    execFile('node', [genPath], (err, stdout) => {
      if (err) console.error('[icon-watch] error:', err.message)
      else process.stdout.write('[icon-watch] ' + stdout)
    })
  }, 100)
})

console.log(`[icon-watch] watching ${svgPath}`)
