import { writeFileSync } from 'node:fs';

const BG = '#0b0e14', PANEL = '#141a24', PANEL2 = '#1b2230', GRID = '#26303f';
const TX = '#e6e9ef', MUT = '#93a0b4', FAINT = '#66real'.replace('real','7280');
const PURP = '#a855f7', PINK = '#ec4899', TEAL = '#2dd4bf', AMBER = '#f59e0b', GREEN = '#34d399';
const F = 'DejaVu Sans, sans-serif';
const W = 1600, H = 1980;
let s = '';
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const txt = (x, y, t, { size = 26, fill = TX, w = 'normal', anchor = 'start', ls = 0, op = 1 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" fill="${fill}" font-weight="${w}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(t)}</text>`;
const rect = (x, y, w, h, { fill = PANEL, rx = 18, op = 1, stroke = 'none', sw = 0 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="${op}" stroke="${stroke}" stroke-width="${sw}"/>`;

s += `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
s += `<defs>
<linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1019"/><stop offset="1" stop-color="#0a0710"/></linearGradient>
<linearGradient id="brand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/></linearGradient>
<linearGradient id="arr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ec4899" stop-opacity="0.55"/><stop offset="1" stop-color="#a855f7" stop-opacity="0.03"/></linearGradient>
</defs>`;
s += `<rect width="${W}" height="${H}" fill="url(#bgg)"/>`;

// Header
s += `<circle cx="92" cy="84" r="26" fill="url(#brand)"/>`;
s += txt(83, 95, 'F', { size: 38, w: 'bold', fill: '#fff' });
s += txt(135, 78, 'FANVUE', { size: 50, w: 'bold', ls: 2 });
s += txt(137, 116, 'The AI‑creator platform — deep dive · mid‑2026', { size: 25, fill: MUT });
s += txt(W - 70, 78, 'OnlyFans alternative', { size: 22, fill: MUT, anchor: 'end' });
s += txt(W - 70, 110, 'London · founded 2020', { size: 22, fill: FAINT, anchor: 'end' });
s += rect(70, 140, 300, 7, { fill: 'url(#brand)', rx: 4 });

// Stat cards 3x2
const stats = [
  ['$200M', 'ARR (May 2026, est.)', PINK],
  ['17M', 'monthly active users', PURP],
  ['325K', 'creators', TEAL],
  ['~15%', 'of GMV from AI creators', AMBER],
  ['93%', 'of creators use an AI tool', GREEN],
  ['80–85%', 'creator payout rate', '#60a5fa'],
];
const cw = (W - 140 - 40) / 3, ch = 118;
let sx = 70, sy = 180;
stats.forEach((st, i) => {
  const col = i % 3, row = Math.floor(i / 3);
  const x = 70 + col * (cw + 20), y = sy + row * (ch + 18);
  s += rect(x, y, cw, ch, { fill: PANEL });
  s += rect(x, y, 8, ch, { fill: st[2], rx: 4 });
  s += txt(x + 34, y + 66, st[0], { size: 52, w: 'bold', fill: st[2] });
  s += txt(x + 36, y + 98, st[1], { size: 23, fill: MUT });
});

// Panel A: ARR growth chart
let pa = sy + 2 * ch + 18 + 36;
const aW = 920;
s += rect(70, pa, aW, 470, { fill: PANEL });
s += txt(108, pa + 52, 'Revenue growth (ARR)', { size: 32, w: 'bold' });
s += txt(108, pa + 84, 'late 2023 → May 2026 · ~55× in 30 months', { size: 22, fill: MUT });
const ax = 150, ay = pa + 130, awid = aW - 210, ah = 270;
s += `<line x1="${ax}" y1="${ay + ah}" x2="${ax + awid}" y2="${ay + ah}" stroke="${GRID}" stroke-width="2"/>`;
[0, 50, 100, 150, 200].forEach((g) => {
  const yy = ay + ah - (g / 210) * ah;
  s += `<line x1="${ax}" y1="${yy}" x2="${ax + awid}" y2="${yy}" stroke="${GRID}" stroke-width="1" opacity="0.5"/>`;
  s += txt(ax - 14, yy + 6, `$${g}M`, { size: 16, fill: FAINT, anchor: 'end' });
});
const fv = [['Late 23', 3.6], ['2024', 40], ['Apr 25', 65], ['Jan 26', 100], ['May 26', 200]];
const slot = awid / (fv.length - 1);
let line = '', area = `M ${ax} ${ay + ah} `;
fv.forEach((d, i) => {
  const x = ax + i * slot, y = ay + ah - (d[1] / 210) * ah;
  line += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  area += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
});
area += `L ${ax + awid} ${ay + ah} Z`;
s += `<path d="${area}" fill="url(#arr)"/>`;
s += `<path d="${line}" fill="none" stroke="url(#brand)" stroke-width="6"/>`;
fv.forEach((d, i) => {
  const x = ax + i * slot, y = ay + ah - (d[1] / 210) * ah;
  s += `<circle cx="${x}" cy="${y}" r="8" fill="${PINK}" stroke="${BG}" stroke-width="3"/>`;
  s += txt(x, y - 20, `$${d[1]}M`, { size: 20, anchor: 'middle', w: 'bold' });
  s += txt(x, ay + ah + 32, d[0], { size: 20, anchor: 'middle', fill: MUT });
});

// Panel B: why it matters for us
const pbx = 70 + aW + 20, pbw = W - 140 - aW - 20;
s += rect(pbx, pa, pbw, 470, { fill: PANEL });
s += txt(pbx + 36, pa + 52, 'Why it matters for us', { size: 30, w: 'bold' });
const whys = [
  ['Only major platform', 'with an official OAuth2 API + App Store'],
  ['Zero ToS / ban risk', 'sanctioned — unlike OnlyFans/Fansly gateways'],
  ['85% → 80% payouts', '85% first 12 mo, then 80% (OF is flat 80%)'],
  ['7‑day payouts', 'vs OnlyFans 21–30 days'],
  ['Read + write', 'DMs, posts, vault, earnings, scheduling'],
];
let wy = pa + 96;
whys.forEach((w2) => {
  s += `<circle cx="${pbx + 44}" cy="${wy - 8}" r="6" fill="${TEAL}"/>`;
  s += txt(pbx + 66, wy, w2[0], { size: 24, w: 'bold' });
  s += txt(pbx + 66, wy + 28, w2[1], { size: 19, fill: MUT });
  wy += 74;
});

// Panel C: AI creators
let pc = pa + 500;
s += rect(70, pc, W - 140, 420, { fill: PANEL });
s += txt(108, pc + 52, 'AI creators — Fanvue’s signature bet', { size: 32, w: 'bold' });
s += `<rect x="${W-360}" y="${pc+26}" width="290" height="44" rx="22" fill="#1f2a1f" stroke="${GREEN}" stroke-width="1.5"/>`;
s += txt(W - 215, pc + 55, 'AI creators ALLOWED', { size: 21, w: 'bold', fill: GREEN, anchor: 'middle' });

// three columns
const colW = (W - 140 - 80) / 3;
const colX = (i) => 108 + i * (colW + 40);
let ccy = pc + 110;
// col 1 native tools
s += txt(colX(0), ccy, 'Native AI tooling', { size: 24, w: 'bold', fill: PINK });
[['AI Messages', '24/7 persona chat trained on the creator'],
 ['AI Voice Notes', 'voice‑clone replies (ElevenLabs)'],
 ['Analytics AI', 'timing & earnings optimization']].forEach((t, i) => {
  const y = ccy + 44 + i * 70;
  s += txt(colX(0), y, '› ' + t[0], { size: 22, w: 'bold' });
  s += txt(colX(0), y + 26, t[1], { size: 18, fill: MUT });
});
// col 2 Miss AI
s += txt(colX(1), ccy, 'Miss AI / WAICAs', { size: 24, w: 'bold', fill: PURP });
[['1,500+ AI entrants', 'world’s first AI beauty pageant (2024)'],
 ['$90K+ prize pool', '"AI Personality of the Year" 2026'],
 ['Global press', 'Time, CNN, Forbes, NPR, Guardian']].forEach((t, i) => {
  const y = ccy + 44 + i * 70;
  s += txt(colX(1), y, '› ' + t[0], { size: 22, w: 'bold' });
  s += txt(colX(1), y + 26, t[1], { size: 18, fill: MUT });
});
// col 3 guardrails
s += txt(colX(2), ccy, 'Guardrails', { size: 24, w: 'bold', fill: AMBER });
[['Mandatory labels', 'every AI post tagged "AI‑Generated"'],
 ['No deepfakes/minors', 'consent + ID verification required'],
 ['~15% of GMV', 'top AI creators earn $10–20K+/mo']].forEach((t, i) => {
  const y = ccy + 44 + i * 70;
  s += txt(colX(2), y, '› ' + t[0], { size: 22, w: 'bold' });
  s += txt(colX(2), y + 26, t[1], { size: 18, fill: MUT });
});

// Panel D: milestones timeline
let pd = pc + 450;
s += rect(70, pd, W - 140, 300, { fill: PANEL });
s += txt(108, pd + 52, 'Milestones', { size: 32, w: 'bold' });
const ms = [
  ['2020', 'Founded in London', 'COVID lockdown'],
  ['2021', '$1M angel', '~$30M valuation'],
  ['2024', '$40M ARR', 'Miss AI launches'],
  ['2025', '$65M ARR', 'Official API opens'],
  ['Jan 26', '$22M Series A', '$100M ARR · 17M MAU'],
  ['May 26', '$200M ARR', 'fastest‑growing'],
];
const tlx = 150, tlw = W - 140 - 160, tly = pd + 150;
s += `<line x1="${tlx}" y1="${tly}" x2="${tlx + tlw}" y2="${tly}" stroke="${GRID}" stroke-width="3"/>`;
const mslot = tlw / (ms.length - 1);
ms.forEach((m, i) => {
  const x = tlx + i * mslot;
  s += `<circle cx="${x}" cy="${tly}" r="11" fill="url(#brand)" stroke="${BG}" stroke-width="3"/>`;
  const up = i % 2 === 0;
  const yy = up ? tly - 30 : tly + 44;
  s += txt(x, up ? tly - 78 : tly + 40, m[0], { size: 23, w: 'bold', anchor: 'middle', fill: PINK });
  s += txt(x, up ? tly - 50 : tly + 68, m[1], { size: 20, anchor: 'middle', w: 'bold' });
  s += txt(x, up ? tly - 26 : tly + 92, m[2], { size: 16, anchor: 'middle', fill: MUT });
});

// Footer
const fyy = H - 50;
s += `<line x1="70" y1="${fyy - 26}" x2="${W - 70}" y2="${fyy - 26}" stroke="${GRID}" stroke-width="1.5"/>`;
s += txt(70, fyy, 'Sources: Fanvue press/help/legal · Sacra · Fortune · BusinessWire · Wikipedia · Newsweek. ARR points $65M/$200M are Sacra estimates; $100M company‑reported.', { size: 17, fill: FAINT });
s += txt(W - 70, fyy, 'Creator CRM · research brief', { size: 17, fill: FAINT, anchor: 'end' });

s += `</svg>`;
writeFileSync('assets/research/fanvue-profile.svg', s);
console.log('wrote fanvue-profile.svg', s.length);
