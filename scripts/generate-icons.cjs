// PWA icon generator — sakura gradient + cherry blossom + Lughati text
// Requires: sharp  (npm install --save-dev sharp)
// Usage:    node scripts/generate-icons.cjs

'use strict'
const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

// ── SVG builder ───────────────────────────────────────────────────────────────

function buildSVG(size) {
  const cx = size / 2
  const cy = size / 2

  // Petal: egg-shaped, pointing up from (cx, cy - offset)
  // Makes a wide, rounded cherry-blossom petal with a small notch at the tip
  function petalPath(halfW, len, notch) {
    // base at (0,0), tip at (0,-len)
    const tipIndent = notch   // notch depth at tip
    return [
      `M 0 0`,
      // right curve out to widest point then up to near tip
      `C ${halfW} ${-len * 0.1},  ${halfW * 1.05} ${-len * 0.55},  ${halfW * 0.3} ${-len * 0.88}`,
      // right side of notch
      `C ${halfW * 0.12} ${-len * 0.96},  ${tipIndent * 0.5} ${-len},  0 ${-(len - tipIndent)}`,
      // left side of notch
      `C ${-tipIndent * 0.5} ${-len},  ${-halfW * 0.12} ${-len * 0.96},  ${-halfW * 0.3} ${-len * 0.88}`,
      // left curve back to base
      `C ${-halfW * 1.05} ${-len * 0.55},  ${-halfW} ${-len * 0.1},  0 0`,
      'Z',
    ].join(' ')
  }

  const petalLen    = size * 0.215
  const petalHalfW  = size * 0.085   // wider = rounder petal
  const petalNotch  = size * 0.012   // small notch at tip
  const petalOffset = size * 0.095   // gap between icon center and petal base
  const pd = petalPath(petalHalfW, petalLen, petalNotch)

  const petals = Array.from({ length: 5 }, (_, i) => {
    const deg = i * 72 - 90  // first petal points straight up
    // Translate petal base to distance `petalOffset` from center, then rotate
    const bx = cx
    const by = cy - petalOffset
    return `<g transform="rotate(${deg}, ${cx}, ${cy}) translate(${bx}, ${by})">
      <path d="${pd}" fill="white" fill-opacity="0.92"/>
      <line x1="0" y1="0" x2="0" y2="${-(petalLen * 0.75).toFixed(1)}"
            stroke="rgba(220,70,110,0.18)" stroke-width="${(size * 0.007).toFixed(1)}"
            stroke-linecap="round"/>
    </g>`
  }).join('\n    ')

  // Stamen: small yellow-white dots around the center
  const stamenR   = size * 0.052
  const dotR      = size * 0.013
  const stamenDots = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * Math.PI / 180
    const dx = cx + Math.cos(a) * stamenR
    const dy = cy + Math.sin(a) * stamenR
    return `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${dotR.toFixed(1)}"
              fill="#FFE4EE" fill-opacity="0.95"/>`
  }).join('\n    ')

  // Text
  const fontSize = size * 0.13
  const textY    = cy + size * 0.39
  const cornerR  = size * 0.22

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#E8567F"/>
      <stop offset="100%" stop-color="#F4A0B5"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.15"/>
      <stop offset="60%"  stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="rr">
      <rect width="${size}" height="${size}" rx="${cornerR}" ry="${cornerR}"/>
    </clipPath>
  </defs>

  <!-- Background gradient -->
  <rect width="${size}" height="${size}" rx="${cornerR}" ry="${cornerR}" fill="url(#bg)"/>

  <!-- Top highlight -->
  <rect width="${size}" height="${size * 0.6}" rx="${cornerR}" ry="${cornerR}"
        fill="url(#shine)" clip-path="url(#rr)"/>

  <!-- 5 cherry blossom petals -->
  ${petals}

  <!-- Center: outer ring + white dot -->
  <circle cx="${cx}" cy="${cy}" r="${(size * 0.065).toFixed(1)}"
          fill="#E8567F" fill-opacity="0.5"/>
  <circle cx="${cx}" cy="${cy}" r="${(size * 0.038).toFixed(1)}"
          fill="white" fill-opacity="0.90"/>

  <!-- Stamen dots -->
  ${stamenDots}

  <!-- Lughati text -->
  <text
    x="${cx}" y="${textY}"
    text-anchor="middle" dominant-baseline="middle"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="${fontSize.toFixed(1)}"
    font-weight="700"
    letter-spacing="${(size * 0.005).toFixed(1)}"
    fill="white"
    fill-opacity="0.97"
  >Lughati</text>
</svg>`
}

// ── Main ──────────────────────────────────────────────────────────────────────

;(async () => {
  const outDir = path.join(__dirname, '..', 'public', 'icons')
  fs.mkdirSync(outDir, { recursive: true })

  for (const size of [192, 512]) {
    const svg  = buildSVG(size)
    const dest = path.join(outDir, `icon-${size}.png`)
    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toFile(dest)
    console.log(`✓  icon-${size}.png`)
  }
  console.log('Done!')
})()
