// Verifies lantern capture, party growth, and the bag/party menus. Usage: node tools/capture_test.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
await pg.goto('file://' + path.resolve('dist/index.html') + '?debug'); await pg.waitForTimeout(300);
const step = (keys, frames = 1) => pg.evaluate(([keys, frames]) => { const g = window.__game; for (const k of keys) g.press(k); for (let i = 0; i < frames; i++) g.update(); g.draw(); }, [keys, frames]);
const menu = () => pg.evaluate(() => { const B = window.__game.battleState(); return B ? B.menu : 'none'; });
const toMenu = async () => { for (let i = 0; i < 200; i++) { const m = await menu(); if (m === 'main' || m === 'none') return m; await step(['A'], 8); } throw new Error('no menu'); };
await step(['A'], 5); await step(['S'], 40);
await pg.evaluate(() => { const g = window.__game; g.G.party.push(g.makeMon(g.G.dex, 0, 5)); g.G.bag.lantern = 30; g.loadMap('santai', 12, 27, 'down'); g.S.mode = 'play'; });
let caught = 0, tries = 0;
for (let round = 0; round < 3; round++) {
  await pg.evaluate((r) => { const g = window.__game; g.S.mode = 'play'; g.wildBattle(g.G.dex.wild[r], 3); }, round); await step([], 40);
  await toMenu(); await pg.evaluate(() => { window.__game.battleState().foe.hp = 1; window.__game.battleState().foe.dhp = 1; });
  for (;;) { const m = await toMenu(); if (m === 'none') break; tries++; await step(['right'], 1); await step(['A'], 1); if (round === 0 && tries === 1) await pg.locator('#game').screenshot({ path: 'shots/c_bag.png' }); await step(['A'], 1); if (tries === 1) { await step([], 70); await pg.locator('#game').screenshot({ path: 'shots/c_in.png' }); } }
  await step([], 40);
}
await step(['S'], 2); await pg.locator('#game').screenshot({ path: 'shots/c_party.png' });
const res = await pg.evaluate(() => ({ party: window.__game.G.party.length, lantern: window.__game.G.bag.lantern }));
let failed = 0; const check = (name, ok) => { console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) failed++; };
check('three weakened Lings were befriended', res.party === 4); check('each throw spends one lantern', res.lantern === 30 - tries);
// switch test
await step(['S'], 2); await pg.evaluate(() => { const g = window.__game; g.S.mode = 'play'; g.wildBattle(g.G.dex.wild[3], 3); }); await step([], 40); await toMenu();
await step(['down'], 1); await step(['A'], 1); await step(['down'], 1); await pg.locator('#game').screenshot({ path: 'shots/c_switch.png' }); await step(['A'], 1); await toMenu();
check('switching keeps the battle running', (await menu()) === 'main');
await step(['down', 'right'], 1); await step(['right'], 1); await step(['A'], 1); for (let i = 0; i < 30; i++) { if ((await menu()) === 'none') break; await step(['A'], 8); if ((await menu()) === 'main') { await step(['down'], 1); await step(['right'], 1); await step(['A'], 1); } }
check('fleeing ends a wild battle', (await menu()) === 'none');
await b.close(); check('no page errors', !errs.length); if (errs.length) console.log(errs); process.exit(failed ? 1 : 0);
