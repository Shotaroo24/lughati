#!/usr/bin/env node
// Generates PWA icons (192px and 512px) as pure PNG using Node.js built-ins only.
// Design: sakura pink (#E8567F) rounded-rectangle with white Arabic letter ل (lam).

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// ── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(d.length)
  const crc = Buffer.allocUnsafe(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, d])))
  return Buffer.concat([len, t, d, crc])
}

// ── Pixel drawing ─────────────────────────────────────────────────────────────

// Returns [r, g, b, a] for pixel (x, y) in a size×size icon
function getPixel(x, y, size) {
  const nx = x / size  // normalized 0-1
  const ny = y / size

  // Rounded rectangle with ~22% corner radius
  const margin = 0.04
  const r = 0.20
  const left = margin, right = 1 - margin
  const top = margin, bottom = 1 - margin

  function inRR() {
    if (nx < left || nx > right || ny < top || ny > bottom) return false
    if (nx < left + r && ny < top + r)
      return Math.hypot(nx - (left + r), ny - (top + r)) <= r
    if (nx > right - r && ny < top + r)
      return Math.hypot(nx - (right - r), ny - (top + r)) <= r
    if (nx < left + r && ny > bottom - r)
      return Math.hypot(nx - (left + r), ny - (bottom - r)) <= r
    if (nx > right - r && ny > bottom - r)
      return Math.hypot(nx - (right - r), ny - (bottom - r)) <= r
    return true
  }

  if (!inRR()) return [0xff, 0xf7, 0xf9, 0]  // transparent (sakura-white bg)

  // Draw Arabic letter ل (lam) in white using simple bezier-free geometry
  // Scaled to fill ~50% of the icon height, centered
  const lx = 0.30  // left edge of glyph
  const ly = 0.22  // top edge
  const lw = 0.10  // stroke width
  const lh = 0.56  // total glyph height

  // Vertical stroke
  const inVert = nx >= lx && nx <= lx + lw && ny >= ly && ny <= ly + lh - lw * 1.5

  // Horizontal base
  const inBase = nx >= lx && nx <= lx + lw * 3.8 && ny >= ly + lh - lw && ny <= ly + lh

  // Curved hook on top-right of vertical stroke (small arc)
  const hookCx = lx + lw * 2.5
  const hookCy = ly + lw * 1.5
  const hookOuter = lw * 1.5
  const hookInner = lw * 0.5
  const dx = nx - hookCx, dy = ny - hookCy
  const dist = Math.hypot(dx, dy)
  const inHook = dist <= hookOuter && dist >= hookInner && dy < 0 && nx > lx + lw

  if (inVert || inBase || inHook) return [255, 255, 255, 255]  // white

  return [0xe8, 0x56, 0x7f, 255]  // #E8567F pink
}

// ── PNG builder ────────────────────────────────────────────────────────────────

function makePNG(size) {
  // Raw scanlines: filter-byte(0) + RGBA * width, one per row
  const rowBytes = 1 + size * 4
  const raw = Buffer.allocUnsafe(size * rowBytes)

  for (let y = 0; y < size; y++) {
    raw[y * rowBytes] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size)
      const off = y * rowBytes + 1 + x * 4
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a
    }
  }

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const compressed = zlib.deflateSync(raw, { level: 9 })

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Main ───────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const png = makePNG(size)
  const filepath = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(filepath, png)
  console.log(`Created icon-${size}.png  (${png.length} bytes)`)
}
