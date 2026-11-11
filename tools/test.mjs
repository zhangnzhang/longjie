// Smoke test: checks art row widths, that every map is fully connected through its warps,
// and takes screenshots of every map. Usage: node tools/test.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { MAPS, START, buildSolid } from '../src/maps.js';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
let fail = 0; const bad = (m) => { console.log('FAIL', m); fail++; };
// 1. reachability: flood from START across warps; every warp, npc-adjacent cell and door must be reachable
const seen = new Set(); const q = [[START.map, START.x, START.y]];
while (q.length) {
  const [id, x, y] = q.pop(); const k = id + ':' + x + ':' + y; if (seen.has(k)) continue; seen.add(k);
  const m = MAPS[id]; const s = buildSolid(m, false);
  const w = m.warps.find((w) => w.x === x && w.y === y);
  if (w) { if (!MAPS[w.to]) bad('warp to missing ' + w.to); else { const s2 = buildSolid(MAPS[w.to], false); if (s2[w.ty][w.tx]) bad(`warp ${id}->${w.to} lands in solid ${w.tx},${w.ty}`); if (MAPS[w.to].warps.some((v) => v.x === w.tx && v.y === w.ty)) bad(`warp ${id}->${w.to} lands on a warp`); q.push([w.to, w.tx, w.ty]); } continue; }
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || s[ny][nx]) continue; if (m.npcs.some((n) => n.x === nx && n.y === ny && n.market === undefined && !n.wander)) continue; q.push([id, nx, ny]); }
}
for (const id in MAPS) { const m = MAPS[id];
  for (const w of m.warps) if (!seen.has(`${id}:${w.x}:${w.y}`)) bad(`unreachable warp ${id} ${w.x},${w.y}`);
  for (const mk of [false, true]) { const s = buildSolid(m, mk);
    for (const n of m.npcs) { if (n.market !== undefined && n.market !== mk) continue; if (s[n.y][n.x]) bad(`npc in solid ${id} ${n.x},${n.y}`);
      if (![[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [0, -2]].some(([dx, dy]) => seen.has(`${id}:${n.x + dx}:${n.y + dy}`))) bad(`npc unreachable ${id} ${n.x},${n.y}`); } }
  for (const p of m.props) if (p.text && p.solid !== false && ![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(`${id}:${p.x + dx}:${p.y + dy}`))) bad(`sign unreachable ${id} ${p.x},${p.y}`);
}
console.log('reachable cells', seen.size);
// 2. screenshots
const out = process.argv[2] || 'shots'; mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('file://' + path.resolve('dist/index.html') + '?debug');
await pg.waitForTimeout(400); await pg.screenshot({ path: out + '/title.png' });
const shots = JSON.parse(process.argv[3] || '[]');
for (const [name, map, x, y, mk, dir] of shots) {
  await pg.evaluate(([map, x, y, mk, dir]) => { const G = window.__game; G.setMarket(mk); G.S.mode = 'play'; G.loadMap(map, x, y, dir || 'down'); G.S.banner = null; }, [map, x, y, !!mk, dir]);
  await pg.waitForTimeout(150); await pg.locator('#game').screenshot({ path: `${out}/${name}.png` });
}
// 3. whole-map overview renders
for (const id of Object.keys(MAPS)) {
  const url = await pg.evaluate((id) => { const G = window.__game; G.setMarket(true); G.S.mode = 'play'; const m = G.MAPS[id]; G.loadMap(id, 1, 1); const c = document.createElement('canvas'); c.width = m.w * 16; c.height = m.h * 16; const g = c.getContext('2d'); g.drawImage(G.S.ground[id], 0, 0); const l = []; for (const t of G.S.trees) l.push([(t.y + 1) * 16, t.cv, t.x * 16 + t.ox, t.y * 16 + t.oy]); for (const o of G.S.props) l.push([(o.p.y + o.p.h) * 16, o.cv, o.p.x * 16 + o.ox, o.p.y * 16 + o.oy]); l.sort((a, b) => a[0] - b[0]); for (const [, cv, x, y] of l) g.drawImage(cv, x, y); return c.toDataURL(); }, id);
  (await import('node:fs')).writeFileSync(`${out}/map_${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await b.close();
if (errs.length) { console.log('PAGE ERRORS', errs); fail++; }
console.log(fail ? `${fail} FAILURES` : 'ALL OK'); process.exit(fail ? 1 : 0);
