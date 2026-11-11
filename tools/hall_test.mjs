// Walks into Kuige Hall with an over-levelled Ling (this tests the flow, not the balance): gets spotted by both
// students, beats the Master, checks the ending and the save file.
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 760 } }); const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
const url = 'file://' + path.resolve('dist/index.html') + '?debug';
await pg.goto(url); await pg.waitForTimeout(300);
const st = () => pg.evaluate(() => { const g = window.__game; return { mode: g.S.mode, map: g.S.map && g.S.map.id, y: g.S.player.y, flags: g.G.flags, bag: g.G.bag }; });
const step = (keys, frames = 1) => pg.evaluate(([keys, frames]) => { const g = window.__game; for (const k of keys) g.press(k); for (let i = 0; i < frames; i++) g.update(); g.draw(); }, [keys, frames]);
await step(['A'], 5); await pg.locator('#game').screenshot({ path: 'shots/g_seed.png' }); await step(['S'], 40);
await pg.evaluate(() => { const g = window.__game; g.G.party.push(g.makeMon(g.G.dex, 1, 30)); g.G.flags.starter = true; g.G.flags.marketCleared = true; g.loadMap('kuige', 6, 10, 'up'); g.S.mode = 'play'; g.keys.up = true; });
let battles = 0, shots = 0;
for (let i = 0; i < 3000; i++) {
  const s = await st();
  if (s.mode === 'end') break;
  if (s.mode === 'alert' && shots === 0) { shots++; await pg.locator('#game').screenshot({ path: 'shots/g_alert.png' }); }
  if (s.mode === 'battle') { if (shots === 1) { shots++; await step([], 50); await pg.locator('#game').screenshot({ path: 'shots/g_trainer.png' }); } await step(['A'], 10); }
  else if (s.mode === 'dialog') await step(['A'], 8);
  else if (s.mode === 'play' && s.y === 3) { await pg.evaluate(() => { window.__game.keys.up = false; }); await step(['A'], 4); }
  else await step([], 6);
}
await step([], 130); await pg.locator('#game').screenshot({ path: 'shots/g_end.png' });
let failed = 0; const check = (name, ok) => { console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) failed++; };
let s = await st(); check('both students and the Master beaten, seal awarded', s.mode === 'end' && s.flags.t_kuige_3_8 && s.flags.t_kuige_9_5 && s.flags.t_kuige_6_2 && s.flags.seal);
await step(['A'], 30); await pg.evaluate(() => window.__game.save());
await pg.reload(); await pg.waitForTimeout(300); await pg.locator('#game').screenshot({ path: 'shots/g_title.png' });
await step(['A'], 40); s = await st(); check('CONTINUE restores the save', s.map === 'kuige' && s.flags.seal === true && (await pg.evaluate(() => window.__game.G.party.length)) === 1);
await b.close(); check('no page errors', !errs.length); if (errs.length) console.log(errs); process.exit(failed ? 1 : 0);
