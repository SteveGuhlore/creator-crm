import { writeFileSync } from 'node:fs';

// ---- palette ----
const BG = '#0b0e14', PANEL = '#141a24', PANEL2 = '#1b2230', GRID = '#26303f';
const TX = '#e6e9ef', MUT = '#93a0b4', FAINT = '#5f6c80';
const PURP = '#8b5cf6', PINK = '#ec4899', TEAL = '#2dd4bf', AMBER = '#f59e0b', BLUE = '#60a5fa';
const F = 'DejaVu Sans, sans-serif';
const W = 1600, H = 2040;
let s = '';
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const txt = (x, y, t, { size = 26, fill = TX, w = 'normal', anchor = 'start', ls = 0, op = 1 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" fill="${fill}" font-weight="${w}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(t)}</text>`;
const rect = (x, y, w, h, { fill = PANEL, rx = 18, op = 1, stroke = 'none', sw = 0 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="${op}" stroke="${stroke}" stroke-width="${sw}"/>`;

// ---- defs (gradients) ----
s += `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
s += `<defs>
<linearGradient id="bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1018"/><stop offset="1" stop-color="#080b11"/></linearGradient>
<linearGradient id="purp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#a855f7"/></linearGradient>
<linearGradient id="pink" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#db2777"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
<linearGradient id="ofArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.55"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0.02"/></linearGradient>
<linearGradient id="fvArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2dd4bf" stop-opacity="0.5"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0.02"/></linearGradient>
<pattern id="hatch" width="10" height="10" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#3b4757"/><line x1="0" y1="0" x2="0" y2="10" stroke="#566375" stroke-width="4"/></pattern>
</defs>`;
s += `<rect width="${W}" height="${H}" fill="url(#bgg)"/>`;

// ===== Header =====
s += txt(70, 92, 'THE CREATOR‑SUBSCRIPTION MARKET', { size: 50, w: 'bold', ls: 1 });
s += txt(70, 140, 'Adult creator platforms by scale, growth & API reachability · figures as of mid‑2026', { size: 26, fill: MUT });
s += rect(70, 168, 360, 8, { fill: 'url(#purp)', rx: 4 });

// ===== Panel 1: GMV scale bars =====
let y0 = 220;
s += rect(70, y0, W - 140, 470, { fill: PANEL });
s += txt(110, y0 + 56, 'Annual gross volume (fan spend)', { size: 34, w: 'bold' });
s += txt(110, y0 + 92, 'OnlyFans dwarfs every rival — but it is the one with no official API.', { size: 24, fill: MUT });

const plats = [
  { n: 'OnlyFans', v: 7.22, c: 'url(#purp)', tag: 'audited', api: 'gateway only' },
  { n: 'Fansly', v: 2.5, c: 'url(#hatch)', tag: 'est. $1–4B', api: 'gateway only' },
  { n: 'Fanvue', v: 1.0, c: 'url(#pink)', tag: 'derived', api: 'OFFICIAL API' },
  { n: 'MYM', v: 0.10, c: '#3f8cff', tag: 'reported', api: 'no API' },
  { n: 'ManyVids', v: 0.02, c: '#3f8cff', tag: 'est.', api: 'no API' },
];
const bx = 320, bw = 1080, maxv = 7.22;
let by = y0 + 132;
const rowh = 60, gap = 8;
for (const p of plats) {
  const w = Math.max(6, (p.v / maxv) * bw);
  s += txt(290, by + 38, p.n, { size: 27, w: 'bold', anchor: 'end' });
  s += rect(bx, by, bw, 44, { fill: PANEL2, rx: 10 });
  s += rect(bx, by, w, 44, { fill: p.c, rx: 10 });
  const label = p.v >= 1 ? `$${p.v.toFixed(2).replace(/\.00$/, '')}B` : `$${(p.v * 1000).toFixed(0)}M`;
  const inside = w > 150;
  s += txt(inside ? bx + w - 16 : bx + w + 16, by + 30, label, { size: 24, w: 'bold', anchor: inside ? 'end' : 'start', fill: inside ? '#fff' : TX });
  s += txt(bx + bw + 30, by + 20, p.tag, { size: 17, fill: FAINT });
  const apiCol = p.api.includes('OFFICIAL') ? TEAL : p.api.includes('gateway') ? AMBER : FAINT;
  s += txt(bx + bw + 30, by + 42, p.api, { size: 17, fill: apiCol, w: 'bold' });
  by += rowh + gap;
}

// ===== Panel 2: OnlyFans GMV + creators trend =====
let p2 = y0 + 500;
s += rect(70, p2, (W - 160) / 2, 560, { fill: PANEL });
const cw = (W - 160) / 2;
s += txt(110, p2 + 52, 'OnlyFans growth', { size: 32, w: 'bold' });
s += txt(110, p2 + 84, 'GMV (bars, $B) · registered fans (line, M) · FY2019–FY2024', { size: 21, fill: MUT });
// chart area
const ax = 150, ay = p2 + 130, aw = cw - 200, ah = 330;
s += `<line x1="${ax}" y1="${ay + ah}" x2="${ax + aw}" y2="${ay + ah}" stroke="${GRID}" stroke-width="2"/>`;
const ofY = [ ['FY19', 0.27, 13.5], ['FY20', 2.2, 82.3], ['FY21', 4.796, 188], ['FY22', 5.55, 238.9], ['FY23', 6.63, 305.1], ['FY24', 7.22, 377.5] ];
const maxG = 8, maxFans = 400;
const n = ofY.length, slot = aw / n;
ofY.forEach((d, i) => {
  const bh = (d[1] / maxG) * ah;
  const x = ax + i * slot + slot * 0.22, w = slot * 0.56;
  s += rect(x, ay + ah - bh, w, bh, { fill: 'url(#purp)', rx: 8 });
  s += txt(x + w / 2, ay + ah - bh - 12, `$${d[1].toFixed(d[1] < 1 ? 2 : 1)}`, { size: 18, anchor: 'middle', fill: TX, w: 'bold' });
  s += txt(x + w / 2, ay + ah + 30, d[0], { size: 19, anchor: 'middle', fill: MUT });
});
// fans line
let path = '';
ofY.forEach((d, i) => {
  const x = ax + i * slot + slot * 0.5, yv = ay + ah - (d[2] / maxFans) * ah;
  path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yv.toFixed(1) + ' ';
});
s += `<path d="${path}" fill="none" stroke="${PINK}" stroke-width="4"/>`;
ofY.forEach((d, i) => {
  const x = ax + i * slot + slot * 0.5, yv = ay + ah - (d[2] / maxFans) * ah;
  s += `<circle cx="${x}" cy="${yv}" r="6" fill="${PINK}"/>`;
});
s += txt(ax, p2 + 540, '● fans reached 377.5M in FY24 (+24% YoY)', { size: 19, fill: PINK });

// ===== Panel 3: Fanvue ARR hockey stick =====
const px3 = 70 + cw + 20;
s += rect(px3, p2, cw, 560, { fill: PANEL });
s += txt(px3 + 40, p2 + 52, 'Fanvue growth', { size: 32, w: 'bold' });
s += txt(px3 + 40, p2 + 84, 'Annual recurring revenue (≈ net) · late 2023 → May 2026', { size: 21, fill: MUT });
const fx = px3 + 90, fy = p2 + 130, fw = cw - 170, fh = 330;
s += `<line x1="${fx}" y1="${fy + fh}" x2="${fx + fw}" y2="${fy + fh}" stroke="${GRID}" stroke-width="2"/>`;
const fv = [ ['Late 23', 3.6], ['2024', 40], ['Apr 25', 65], ['Jan 26', 100], ['May 26', 200] ];
const maxA = 210, fn = fv.length, fslot = fw / (fn - 1);
let fpath = '', farea = `M ${fx} ${fy + fh} `;
fv.forEach((d, i) => {
  const x = fx + i * fslot, yv = fy + fh - (d[1] / maxA) * fh;
  fpath += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yv.toFixed(1) + ' ';
  farea += `L ${x.toFixed(1)} ${yv.toFixed(1)} `;
});
farea += `L ${fx + fw} ${fy + fh} Z`;
s += `<path d="${farea}" fill="url(#fvArea)"/>`;
s += `<path d="${fpath}" fill="none" stroke="${TEAL}" stroke-width="5"/>`;
fv.forEach((d, i) => {
  const x = fx + i * fslot, yv = fy + fh - (d[1] / maxA) * fh;
  s += `<circle cx="${x}" cy="${yv}" r="7" fill="${TEAL}" stroke="${BG}" stroke-width="2"/>`;
  s += txt(x, yv - 18, `$${d[1]}M`, { size: 19, anchor: 'middle', w: 'bold', fill: TX });
  s += txt(x, fy + fh + 30, d[0], { size: 19, anchor: 'middle', fill: MUT });
});
s += txt(fx, p2 + 540, '↗ ~55× in 30 months — fastest grower, AI‑creator niche', { size: 19, fill: TEAL });

// ===== Panel 4: where money is vs reachable =====
let p4 = p2 + 600;
s += rect(70, p4, W - 140, 300, { fill: PANEL });
s += txt(110, p4 + 52, 'Where the money is  vs.  what we can build', { size: 32, w: 'bold' });
const cells = [
  ['OnlyFans', '$7.2B GMV', 'Gateway only — your ToS/ban risk', AMBER],
  ['Fansly', '~$1–4B est.', 'Gateway only — your ToS/ban risk', AMBER],
  ['Fanvue', '$200M ARR', 'OFFICIAL API — build first, zero risk', TEAL],
  ['Reddit', 'traffic', 'OFFICIAL API — posts + DMs', TEAL],
  ['MYM · ManyVids · Hidden · others', 'small / n/a', 'No API — CSV / manual import', FAINT],
];
let cy = p4 + 92;
cells.forEach((c) => {
  s += `<circle cx="128" cy="${cy + 12}" r="7" fill="${c[3]}"/>`;
  s += txt(150, cy + 20, c[0], { size: 24, w: 'bold' });
  s += txt(640, cy + 20, c[1], { size: 23, fill: MUT });
  s += txt(860, cy + 20, c[2], { size: 23, fill: c[3] });
  cy += 40;
});

// ===== Footer =====
const fyy = H - 70;
s += `<line x1="70" y1="${fyy - 26}" x2="${W - 70}" y2="${fyy - 26}" stroke="${GRID}" stroke-width="1.5"/>`;
s += txt(70, fyy, 'Sources: Fenix Intl statutory accounts via Variety (FY19–24) · Sacra & Fortune (Fanvue) · Goldman Sachs (TAM). Hatched = unverified estimate.', { size: 19, fill: FAINT });
s += txt(W - 70, fyy, 'Creator CRM · research brief', { size: 19, fill: FAINT, anchor: 'end' });

s += `</svg>`;
writeFileSync('assets/research/market-overview.svg', s);
console.log('wrote market-overview.svg', s.length, 'bytes');
