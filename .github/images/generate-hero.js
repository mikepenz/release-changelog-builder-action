#!/usr/bin/env node
// Generates light + dark hero SVGs for the three action repos from one source,
// so the two themes cannot drift. Output: <out>/hero-light.svg, <out>/hero-dark.svg
const fs = require('fs')
const path = require('path')

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"

const W = 1200

const themes = {
  dark: {
    bg: '#0D1117',
    panel: '#161B22',
    panelAlt: '#0D1117',
    border: '#30363D',
    fg: '#E6EDF3',
    muted: '#8B949E',
    faint: '#6E7681',
    purple: '#A371F7',
    green: '#3FB950',
    red: '#F85149',
    blue: '#58A6FF',
    yellow: '#D29922'
  },
  light: {
    bg: '#FFFFFF',
    panel: '#F6F8FA',
    panelAlt: '#FFFFFF',
    border: '#D0D7DE',
    fg: '#1F2328',
    muted: '#656D76',
    faint: '#8C959F',
    purple: '#8250DF',
    green: '#1A7F37',
    red: '#CF222E',
    blue: '#0969DA',
    yellow: '#9A6700'
  }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const text = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${o.size || 20}"` +
  ` font-weight="${o.weight || 400}" fill="${o.fill}"` +
  (o.spacing ? ` letter-spacing="${o.spacing}"` : '') +
  (o.anchor ? ` text-anchor="${o.anchor}"` : '') +
  `>${esc(s)}</text>`

const rect = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx === undefined ? 10 : o.rx}"` +
  ` fill="${o.fill || 'none'}"` +
  (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 1}"` : '') + `/>`

const dot = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`

// right-pointing arrow, from x to x+len at y
const arrow = (x, y, len, color) =>
  `<path d="M${x} ${y} H${x + len - 7}" stroke="${color}" stroke-width="2" fill="none"/>` +
  `<path d="M${x + len - 8} ${y - 5} l8 5 l-8 5 z" fill="${color}"/>`

// mono chip sized to its label
function chip(t, x, y, label, o = {}) {
  const w = 10.2 * label.length + 28
  return {
    w,
    svg:
      rect(x, y, w, o.h || 36, { fill: t.panel, stroke: o.stroke || t.border, rx: 8 }) +
      text(x + 14, y + (o.h || 36) / 2 + 6, label, { size: o.size || 17, mono: true, fill: o.fill || t.muted })
  }
}

// Shared title block: eyebrow / name / description lines / meta chips.
// `nameSize` and the y-rhythm shift for the stacked layout used by the
// project whose name is too long for a side-by-side split.
function titleBlock(t, { eyebrow, name, desc, meta, accent, nameSize = 46, metaY = 276 }) {
  const x = 64
  let s = ''
  s += text(x, 92, eyebrow, { size: 18, mono: true, spacing: 2.4, fill: accent, weight: 600 })
  s += text(x, 152, name, { size: nameSize, weight: 700, fill: t.fg })
  s += text(x, 196, desc[0], { size: 22, fill: t.muted })
  if (desc[1]) s += text(x, 226, desc[1], { size: 22, fill: t.muted })
  let mx = x
  meta.forEach(m => {
    const c = chip(t, mx, metaY, m)
    s += c.svg
    mx += c.w + 10
  })
  return `<g id="title-block">${s}</g>`
}

function frame(t, body, { title, desc, height }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>
  ${rect(0, 0, W, height, { fill: t.bg, stroke: t.border, rx: 24 })}
${body}
</svg>
`
}

/* ------------------------------------------------------------------ *
 * release-changelog-builder-action
 * Proof: the artifact it produces — a categorised changelog, fed by a
 * tag range and the merged pull requests in between.
 * ------------------------------------------------------------------ */
function changelog(t) {
  const Y = 222, H = 152
  let s = ''
  const step = (x, w, n, label) =>
    rect(x, Y, w, H, { fill: t.panel, stroke: t.border, rx: 12 }) +
    text(x + 20, Y + 32, n + '  ' + label, { size: 17, mono: true, spacing: 1.4, fill: t.purple, weight: 600 })

  // 1 — the range the action collects
  s += step(64, 236, '1', 'collect')
  s += text(84, Y + 78, 'v1.4.0 -> v1.5.0', { size: 19, mono: true, fill: t.fg })
  s += text(84, Y + 112, '47 merged PRs', { size: 19, mono: true, fill: t.muted })
  s += arrow(316, Y + H / 2, 40, t.purple)

  // 2 — labels decide the category
  s += step(356, 236, '2', 'categorise')
  const labels = [
    { l: 'feature', c: t.green },
    { l: 'bug', c: t.red },
    { l: 'dependencies', c: t.blue }
  ]
  labels.forEach((o, i) => {
    const y = Y + 58 + i * 32
    s += dot(378, y, 5, o.c)
    s += text(394, y + 6, o.l, { size: 19, mono: true, fill: t.muted })
  })
  s += arrow(608, Y + H / 2, 40, t.purple)

  // 3 — the artifact it writes
  const CX = 648, CW = 488
  s += rect(CX, Y, CW, H, { fill: t.panel, stroke: t.border, rx: 12 })
  s += `<path d="M${CX} ${Y + 40} H${CX + CW}" stroke="${t.border}" stroke-width="1"/>`
  s += dot(CX + 22, Y + 20, 5, t.red)
  s += dot(CX + 40, Y + 20, 5, t.yellow)
  s += dot(CX + 58, Y + 20, 5, t.green)
  s += text(CX + 82, Y + 26, 'CHANGELOG.md', { size: 17, mono: true, fill: t.muted })
  const rows = [
    { head: '## Features', color: t.green },
    { line: '- Parallel release support   #1042' },
    { head: '## Fixes', color: t.red },
    { line: '- Respect fromTag override   #1051' }
  ]
  let y = Y + 66
  rows.forEach(r => {
    if (r.head) {
      s += dot(CX + 24, y - 6, 5, r.color)
      s += text(CX + 40, y, r.head, { size: 20, mono: true, weight: 600, fill: t.fg })
    } else {
      s += text(CX + 40, y, r.line, { size: 19, mono: true, fill: t.muted })
    }
    y += 26
  })
  return s
}

/* ------------------------------------------------------------------ *
 * action-junit-report
 * Proof: what lands on the pull request — a check summary and an inline
 * annotation on the failing line.
 * ------------------------------------------------------------------ */
function junit(t) {
  const PX = 620, PY = 56, PW = 516
  let s = ''
  // source chip -> parse
  s += rect(PX, PY, 250, 34, { fill: t.panel, stroke: t.border, rx: 8 })
  s += text(PX + 14, PY + 23, 'TEST-*.xml', { size: 17, mono: true, fill: t.muted })
  s += arrow(PX + 262, PY + 17, 40, t.green)
  s += text(PX + 314, PY + 23, 'PR check', { size: 18, fill: t.muted })

  // check summary strip
  const SY = PY + 56
  s += rect(PX, SY, PW, 62, { fill: t.panel, stroke: t.border, rx: 12 })
  const counts = [
    { n: '128', l: 'passed', c: t.green },
    { n: '2', l: 'failed', c: t.red },
    { n: '3', l: 'skipped', c: t.muted }
  ]
  let cx = PX + 24
  counts.forEach(c => {
    s += text(cx, SY + 40, c.n, { size: 28, weight: 700, fill: c.c })
    s += text(cx + 16 * c.n.length + 8, SY + 39, c.l, { size: 19, fill: t.muted })
    cx += 16 * c.n.length + 20 * c.l.length * 0.55 + 34
  })

  // annotation card
  const AY = SY + 78
  s += rect(PX, AY, PW, 116, { fill: t.panel, stroke: t.border, rx: 12 })
  s += `<path d="M${PX + 1} ${AY + 12} v92" stroke="${t.red}" stroke-width="4" stroke-linecap="round"/>`
  s += text(PX + 24, AY + 34, 'ParserTest.kt:42', { size: 19, mono: true, fill: t.blue })
  s += text(PX + 24, AY + 66, 'AssertionError: expected 3', { size: 20, mono: true, fill: t.fg })
  s += text(PX + 24, AY + 94, 'to equal 4', { size: 20, mono: true, fill: t.fg })
  return s
}

/* ------------------------------------------------------------------ *
 * xray-action
 * Proof: many report formats funnelling into one Xray test execution.
 * ------------------------------------------------------------------ */
function xray(t) {
  const PX = 620, PY = 52
  let s = ''
  const formats = ['junit', 'cucumber', 'testng', 'xunit', 'robot']
  formats.forEach((f, i) => {
    const y = PY + i * 48
    s += rect(PX, y, 148, 38, { fill: t.panel, stroke: t.border, rx: 8 })
    s += text(PX + 16, y + 25, f, { size: 19, mono: true, fill: t.muted })
    // funnel line into the hub
    const yc = y + 19
    s += `<path d="M${PX + 156} ${yc} C ${PX + 200} ${yc}, ${PX + 200} 175, ${PX + 236} 175" stroke="${t.border}" stroke-width="2" fill="none"/>`
  })
  s += arrow(PX + 236, 175, 44, t.blue)

  const CX = PX + 292, CY = 100, CW = 224
  s += rect(CX, CY, CW, 150, { fill: t.panel, stroke: t.blue, sw: 2, rx: 12 })
  s += text(CX + 20, CY + 34, 'TEST-1', { size: 26, weight: 700, mono: true, fill: t.blue })
  s += text(CX + 20, CY + 60, 'Test Execution', { size: 18, fill: t.muted })
  s += `<path d="M${CX + 20} ${CY + 78} H${CX + CW - 20}" stroke="${t.border}" stroke-width="1"/>`
  s += text(CX + 20, CY + 104, 'project  TEST', { size: 18, mono: true, fill: t.fg })
  s += text(CX + 20, CY + 130, 'imported 133', { size: 18, mono: true, fill: t.fg })
  return s
}

const projects = {
  'release-changelog-builder-action': {
    eyebrow: 'GITHUB ACTION / RELEASE NOTES',
    name: 'release-changelog-builder-action',
    desc: ['Builds your release notes from the pull requests merged between two tags.'],
    meta: [],
    nameSize: 44,
    height: 400,
    accent: t => t.purple,
    proof: changelog,
    alt: 'release-changelog-builder-action: a tag range and its merged pull requests are turned into a categorised CHANGELOG.md'
  },
  'action-junit-report': {
    eyebrow: 'GITHUB ACTION / TEST REPORTING',
    name: 'action-junit-report',
    desc: ['Turns JUnit XML into a pull request check,', 'inline annotations and a job summary.'],
    meta: ['JUnit XML', 'checks + annotations', 'v6'],
    accent: t => t.green,
    proof: junit,
    alt: 'action-junit-report: JUnit XML reports become a pull request check with pass/fail counts and an inline annotation on the failing line'
  },
  'xray-action': {
    eyebrow: 'GITHUB ACTION / TEST MANAGEMENT',
    name: 'xray-action',
    desc: ['Imports CI test results into Xray,', 'the test management app for Jira.'],
    meta: ['9 formats', 'Cloud + Server/DC', 'v4'],
    accent: t => t.blue,
    proof: xray,
    alt: 'xray-action: junit, cucumber, testng, xunit and robot reports funnel into a single Xray test execution issue'
  }
}

const out = process.argv[2]
const key = process.argv[3]
if (!out || !projects[key]) {
  console.error('usage: hero.js <outDir> <' + Object.keys(projects).join('|') + '>')
  process.exit(1)
}
const p = projects[key]
for (const [name, t] of Object.entries(themes)) {
  const body = titleBlock(t, { ...p, accent: p.accent(t) }) + `\n  <g id="proof">${p.proof(t)}</g>`
  const svg = frame(t, body, { title: p.name, desc: p.alt, height: p.height || 360 })
  const file = path.join(out, `hero-${name}.svg`)
  fs.writeFileSync(file, svg)
  console.log('wrote', file)
}
