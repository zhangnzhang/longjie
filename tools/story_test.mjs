// Plays the opening: teacher -> choose partner -> market Ling -> lantern capture. Usage: node tools/story_test.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
await pg.goto('file://' + path.resolve('dist/index.html') + '?debug'); await pg.waitForTimeout(300);
const st = () => pg.evaluate(() => { const g = window.__game; return { mode: g.S.mode, map: g.S.map && g.S.map.id, party: g.G.party.length, flags: g.G.flags, bag: g.G.bag, home: g.G.home.length }; });
const step = (keys, frames = 1) => pg.evaluate(([keys, frames]) => { const g = window.__game; for (const k of keys) g.press(k); for (let i = 0; i < frames; i++) g.update(); g.draw(); }, [keys, frames]);
const until = async (pred, key = 'A', max = 300) => { for (let i = 0; i < max; i++) { const s = await st(); if (pred(s)) return s; await step([key], 10); } throw new Error('stuck: ' + JSON.stringify(await st())); };
await step(['A'], 5); await step(['S'], 40);
// tall grass is refused without a Ling
await pg.evaluate(() => { const g = window.__game; g.loadMap('longjie', 12, 9, 'up'); g.S.mode = 'play'; g.keys.up = true; }); await step([], 5);
let failed = 0; const check = (name, ok) => { console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) failed++; };
check('tall grass refuses a player with no Ling', (await st()).mode === 'dialog'); await until((s) => s.mode === 'play');
await pg.evaluate(() => { const g = window.__game; g.loadMap('school', 7, 3, 'up'); g.S.mode = 'play'; });
await step(['A'], 2); await until((s) => s.mode === 'choose'); await step(['right'], 2); await step(['A'], 2);
let s = await until((s) => s.mode === 'play'); check('partner chosen, 5 lanterns given', s.party === 1 && s.flags.starter && s.bag.lantern === 5);
await pg.evaluate(() => { const g = window.__game; g.loadMap('longjie', 32, 38, 'down'); g.S.mode = 'play'; });
await pg.locator('#game').screenshot({ path: 'shots/s_marketling.png' });
await step(['A'], 2); await until((s) => s.mode === 'battle'); await step([], 60);
// weaken once, then throw lanterns until caught or out
for (let i = 0; i < 6; i++) await step(['A'], 30);
for (let n = 0; n < 12; n++) { s = await st(); if (s.mode !== 'battle') break;
  await step(['A'], 20); await step(['A'], 20); // flush messages back to main menu
  await pg.evaluate(() => { const g = window.__game; /* choose BAG -> LANTERN directly */ g.press('right'); g.update(); g.press('A'); g.update(); g.press('A'); g.update(); });
  if (n === 0) { await step([], 50); await pg.locator('#game').screenshot({ path: 'shots/s_lantern.png' }); }
  for (let i = 0; i < 14; i++) await step(['A'], 20); }
s = await until((s) => s.mode === 'play', 'A', 400); check('market cleared, pears given', s.flags.marketCleared && s.bag.pear >= 3);
await pg.locator('#game').screenshot({ path: 'shots/s_after.png' });
// mom heals
await pg.evaluate(() => { const g = window.__game; g.G.party[0].hp = 1; g.loadMap('home', 6, 4, 'right'); g.S.mode = 'play'; }); await step(['A'], 2); await until((s) => s.mode === 'play');
check('mom heals the party', await pg.evaluate(() => window.__game.G.party[0].hp === window.__game.G.party[0].max));
// lose path
await pg.evaluate(() => { const g = window.__game; g.G.party.forEach((m) => { m.hp = 1; }); g.loadMap('santai', 12, 27, 'down'); g.S.mode = 'play'; g.wildBattle(g.G.dex.wild[4], 30); });
await step([], 60); for (let i = 0; i < 80; i++) { if ((await st()).mode !== 'battle') break; await step(['A'], 15); }
s = await until((s) => s.mode === 'play'); check('a loss sends you home healed', s.map === 'home' && await pg.evaluate(() => window.__game.G.party.every((m) => m.hp === m.max)));
await b.close(); check('no page errors', !errs.length); if (errs.length) console.log(errs); process.exit(failed ? 1 : 0);
