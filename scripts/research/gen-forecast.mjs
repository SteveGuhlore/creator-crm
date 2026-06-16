import { writeFileSync } from 'node:fs';
const BG='#0b0e14',PANEL='#141a24',PANEL2='#1b2230',GRID='#26303f';
const TX='#e6e9ef',MUT='#93a0b4',FAINT='#667280';
const PURP='#8b5cf6',PINK='#ec4899',TEAL='#2dd4bf',AMBER='#f59e0b',BLUE='#60a5fa',GREEN='#34d399';
const F='DejaVu Sans, sans-serif';
const W=1600,H=2010;let s='';
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const txt=(x,y,t,{size=26,fill=TX,w='normal',anchor='start',ls=0,op=1}={})=>`<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" fill="${fill}" font-weight="${w}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${op}">${esc(t)}</text>`;
const rect=(x,y,w,h,{fill=PANEL,rx=18,op=1,stroke='none',sw=0}={})=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="${op}" stroke="${stroke}" stroke-width="${sw}"/>`;

s+=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
s+=`<defs>
<linearGradient id="bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1018"/><stop offset="1" stop-color="#080b11"/></linearGradient>
<pattern id="hatch" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#2b6cb0"/><line x1="0" y1="0" x2="0" y2="9" stroke="#4a90d9" stroke-width="3"/></pattern>
<radialGradient id="tr" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#1b3a2a"/><stop offset="1" stop-color="#141a24"/></radialGradient>
</defs>`;
s+=`<rect width="${W}" height="${H}" fill="url(#bgg)"/>`;

// header
s+=txt(70,86,'MARKET FORECAST · 2024 → 2028',{size:48,w:'bold',ls:1});
s+=txt(70,130,'Where share is heading, by growth trajectory × API reachability',{size:25,fill:MUT});
s+=`<rect x="${W-430}" y="48" width="360" height="52" rx="26" fill="#2a1f0c" stroke="${AMBER}" stroke-width="1.5"/>`;
s+=txt(W-250,82,'SCENARIO MODEL — not a guarantee',{size:19,w:'bold',fill:AMBER,anchor:'middle'});

// ===== Panel 1: GMV projection =====
let p1=170;s+=rect(70,p1,W-140,520,{fill:PANEL});
s+=txt(108,p1+50,'Projected gross volume (GMV, $B)',{size:32,w:'bold'});
s+=txt(108,p1+82,'OnlyFans stays dominant but matures; Fanvue compounds toward Fansly',{size:21,fill:MUT});
const ax=160,ay=p1+120,aw=W-360,ah=320;
const yrs=['2024','2025','2026','2027','2028'];
const series=[
 {n:'OnlyFans',c:PURP,d:[7.22,7.9,8.7,9.6,10.5]},
 {n:'Fansly (est.)',c:BLUE,d:[2.2,2.5,2.8,3.2,3.6]},
 {n:'Fanvue',c:PINK,d:[0.2,0.5,1.3,2.4,3.6]},
];
const maxY=11;
s+=`<line x1="${ax}" y1="${ay+ah}" x2="${ax+aw}" y2="${ay+ah}" stroke="${GRID}" stroke-width="2"/>`;
[0,2,4,6,8,10].forEach(g=>{const yy=ay+ah-(g/maxY)*ah;s+=`<line x1="${ax}" y1="${yy}" x2="${ax+aw}" y2="${yy}" stroke="${GRID}" stroke-width="1" opacity="0.5"/>`;s+=txt(ax-12,yy+6,`$${g}B`,{size:16,fill:FAINT,anchor:'end'});});
const sx=aw/(yrs.length-1);
yrs.forEach((y,i)=>s+=txt(ax+i*sx,ay+ah+34,y,{size:20,anchor:'middle',fill:MUT}));
// projection marker (dashed after 2025 i>=1 boundary actually data known to ~2026)
s+=`<line x1="${ax+2*sx}" y1="${ay}" x2="${ax+2*sx}" y2="${ay+ah}" stroke="${AMBER}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.6"/>`;
s+=txt(ax+2*sx+10,ay+20,'forecast →',{size:17,fill:AMBER});
for(const se of series){
  let path='';se.d.forEach((v,i)=>{const x=ax+i*sx,yv=ay+ah-(v/maxY)*ah;path+=(i?'L':'M')+x.toFixed(1)+' '+yv.toFixed(1)+' ';});
  // solid to 2026 (i<=2), dashed after
  let solid='',dash='';se.d.forEach((v,i)=>{const x=ax+i*sx,yv=ay+ah-(v/maxY)*ah;const seg=(i?'L':'M')+x.toFixed(1)+' '+yv.toFixed(1)+' ';if(i<=2)solid+=seg;if(i>=2)dash+=(i===2?'M':'L')+x.toFixed(1)+' '+yv.toFixed(1)+' ';});
  s+=`<path d="${solid}" fill="none" stroke="${se.c}" stroke-width="5"/>`;
  s+=`<path d="${dash}" fill="none" stroke="${se.c}" stroke-width="5" stroke-dasharray="3 7" opacity="0.85"/>`;
  se.d.forEach((v,i)=>{const x=ax+i*sx,yv=ay+ah-(v/maxY)*ah;s+=`<circle cx="${x}" cy="${yv}" r="6" fill="${se.c}"/>`;});
  const lv=se.d[se.d.length-1];s+=txt(ax+aw+12,ay+ah-(lv/maxY)*ah+6,se.n,{size:20,w:'bold',fill:se.c});
}

// ===== Panel 2: quadrant access x growth =====
let p2=p1+550;s+=rect(70,p2,W-140,640,{fill:PANEL});
s+=txt(108,p2+50,'The strategic map: growth  ×  sanctioned access',{size:32,w:'bold'});
s+=txt(108,p2+82,'Bubble size ≈ GMV. Top‑right = fast‑growing AND officially integratable.',{size:21,fill:MUT});
const qx=220,qy=p2+120,qw=W-420,qh=420;
// quadrant tint top-right
s+=rect(qx+qw/2,qy,qw/2,qh/2,{fill:'url(#tr)',rx:0,op:0.8});
// axes
s+=`<line x1="${qx}" y1="${qy+qh}" x2="${qx+qw}" y2="${qy+qh}" stroke="${GRID}" stroke-width="2"/>`;
s+=`<line x1="${qx}" y1="${qy}" x2="${qx}" y2="${qy+qh}" stroke="${GRID}" stroke-width="2"/>`;
s+=`<line x1="${qx+qw/2}" y1="${qy}" x2="${qx+qw/2}" y2="${qy+qh}" stroke="${GRID}" stroke-width="1" stroke-dasharray="5 5"/>`;
s+=`<line x1="${qx}" y1="${qy+qh/2}" x2="${qx+qw}" y2="${qy+qh/2}" stroke="${GRID}" stroke-width="1" stroke-dasharray="5 5"/>`;
s+=txt(qx+qw/2,qy+qh+40,'projected annual growth  →',{size:20,fill:MUT,anchor:'middle'});
s+=`<text x="${qx-44}" y="${qy+qh/2}" font-family="${F}" font-size="20" fill="${MUT}" text-anchor="middle" transform="rotate(-90 ${qx-44} ${qy+qh/2})">sanctioned API access  →</text>`;
// quadrant labels
s+=txt(qx+qw-16,qy+30,'BUILDABLE & GROWING',{size:18,w:'bold',fill:GREEN,anchor:'end'});
s+=txt(qx+16,qy+30,'buildable, slow',{size:18,fill:FAINT});
s+=txt(qx+16,qy+qh-16,'slow & gated',{size:18,fill:FAINT});
s+=txt(qx+qw-16,qy+qh-16,'growing, gated',{size:18,fill:AMBER,anchor:'end'});
// bubbles: [name, growth%, access0-10, gmv, color, note]
const sxg=g=>qx+(g/80)*qw, syg=a=>qy+qh-(a/10)*qh, rg=v=>Math.max(12,Math.sqrt(v)*16);
const bub=[
 ['OnlyFans',10,1.2,8.7,PURP,'gateway only'],
 ['Fansly',22,1.6,2.8,BLUE,'gateway only'],
 ['Fanvue',58,9,1.3,PINK,'official API'],
 ['Reddit',14,8.2,0.4,TEAL,'official API'],
 ['MYM',6,0.6,0.4,'#7c8aa0','no API'],
 ['Hidden',55,0.5,0.05,'#7c8aa0','no API'],
];
for(const b of bub){const x=sxg(b[1]),y=syg(b[2]),r=rg(b[3]);
 s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${b[4]}" opacity="0.28"/>`;
 s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${b[4]}" stroke-width="2.5"/>`;
 s+=txt(x,y- r-12,b[0],{size:21,w:'bold',anchor:'middle',fill:b[4]});
 s+=txt(x,y- r+10,b[5],{size:15,anchor:'middle',fill:MUT});
}
s+=`<circle cx="${sxg(58)}" cy="${syg(9)}" r="${rg(1.3)+14}" fill="none" stroke="${GREEN}" stroke-width="2" stroke-dasharray="4 5"/>`;
s+=txt(sxg(58),syg(9)+rg(1.3)+40,'← our build target',{size:18,fill:GREEN,anchor:'middle'});

// ===== Panel 3: share shift bars (left) + takeaways (right) =====
let p3=p2+670;const halfW=(W-160)/2;
s+=rect(70,p3,halfW,360,{fill:PANEL});
s+=txt(104,p3+48,'Share of tracked GMV',{size:30,w:'bold'});
const segs2026=[['OnlyFans',64,PURP],['Fansly',21,BLUE],['Fanvue',10,PINK],['Others',5,'#5f6c80']];
const segs2028=[['OnlyFans',56,PURP],['Fansly',19,BLUE],['Fanvue',19,PINK],['Others',6,'#5f6c80']];
const drawBar=(y,label,segs)=>{let r='';const bx=200,bw=halfW-260;let cx=bx;r+=txt(180,y+34,label,{size:22,w:'bold',anchor:'end'});segs.forEach(sg=>{const w=(sg[1]/100)*bw;r+=rect(cx,y,w,46,{fill:sg[2],rx:6});if(w>54)r+=txt(cx+w/2,y+30,sg[1]+'%',{size:18,anchor:'middle',fill:'#fff',w:'bold'});cx+=w+2;});return r;};
s+=drawBar(p3+90,'2026',segs2026);
s+=drawBar(p3+170,'2028',segs2028);
// legend
let lx=200;[['OnlyFans',PURP],['Fansly',BLUE],['Fanvue',PINK],['Others','#5f6c80']].forEach(l=>{s+=`<rect x="${lx}" y="${p3+250}" width="20" height="20" rx="4" fill="${l[1]}"/>`;s+=txt(lx+28,p3+267,l[0],{size:19,fill:MUT});lx+=l[0].length*13+70;});
s+=txt(104,p3+322,'Fanvue ~10% → ~19%; OnlyFans slips 64% → 56% but stays #1.',{size:19,fill:TEAL});

// takeaways right
const tx2=70+halfW+20;s+=rect(tx2,p3,halfW,360,{fill:PANEL});
s+=txt(tx2+34,p3+48,'What the model implies',{size:30,w:'bold'});
const tk=[
 ['OnlyFans = the cash, not the bet','dominant but matured (~10%/yr) and only reachable via gateways'],
 ['Fanvue = the asymmetric bet','compounding ~60–70%/yr AND officially integratable — our first adapter'],
 ['Fansly = optional gateway add‑on','steady, but same ToS/ban posture as OnlyFans'],
 ['Reddit = sanctioned top‑of‑funnel','official API for promo posts + DMs'],
];
let ty=p3+92;tk.forEach(t=>{s+=`<circle cx="${tx2+44}" cy="${ty-8}" r="6" fill="${PINK}"/>`;s+=txt(tx2+66,ty,t[0],{size:23,w:'bold'});s+=txt(tx2+66,ty+27,t[1],{size:18,fill:MUT});ty+=72;});

// footer / assumptions
const fyy=H-46;
s+=`<line x1="70" y1="${fyy-26}" x2="${W-70}" y2="${fyy-26}" stroke="${GRID}" stroke-width="1.5"/>`;
s+=txt(70,fyy,'Model assumptions: OnlyFans ~10%/yr, Fansly ~14%, Fanvue decel 150%→50% (GMV≈5× net ARR). Illustrative projection from public figures — high uncertainty, not advice.',{size:16,fill:FAINT});
s+=txt(W-70,fyy,'Creator CRM · research brief',{size:16,fill:FAINT,anchor:'end'});
s+=`</svg>`;
writeFileSync('assets/research/market-forecast.svg',s);
console.log('wrote market-forecast.svg',s.length);
