// Engine: grid movement, camera, y-sorted drawing, dialogue, map transitions, story events.
import { T, rect } from './gfx.js';
import { VW, VH, screen, ctx, text, wrap, box, cursor, keys, hit, clearPressed, press, drawLines, typing } from './ui.js';
import { unlock, music, sfx, toggleMute } from './audio.js';
import { MAPS, START, isMarketDay, buildSolid } from './maps.js';
import { paintGround, makeAnimTiles, makeProp, makeTree, charFrames } from './render.js';
import { lingSprite, lingIcon, makeMon, makeDex, TYPE_COL } from './gen.js';
import { G, newGame, sp, nm, healAll, save, load, hasSave } from './state.js';
import { startBattle, updateBattle, drawBattle, drawParty, inBattle, battleState } from './battle.js';

const S = {
  mode: 'title', t: 0, map: null, marketOverride: null,
  player: { x: 0, y: 0, px: 0, py: 0, dir: 'down', moving: false, step: 0, look: 'hero' },
  npcs: [], solid: null, ground: {}, props: [], trees: [],
  dialog: null, fade: null, banner: null, toast: null, choose: null, flash: 0, titleSel: 0, seedText: 'LONGJIE-38', alert: null,
};
const anim = makeAnimTiles();
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const market = () => (S.marketOverride === null ? isMarketDay() : S.marketOverride);
const WHEN = { marketling: () => G.flags.starter && !G.flags.marketCleared };
const TRACK = { longjie: 'town', gucheng: 'town', santai: 'route', riverroad: 'route' };
const tkey = (n) => 't_' + S.map.id + '_' + n.hx + '_' + n.hy;
const autosave = () => { const P = S.player; if (S.map) save({ map: S.map.id, x: P.x, y: P.y, dir: P.dir }); };

// Which Lings live where: [index into the seed's wild list, min level, max level]
const WILD = {
  longjie: [[0, 2, 3], [3, 2, 3]],
  santai: [[0, 2, 4], [1, 3, 5], [4, 3, 5]],
  riverroad: [[1, 3, 5], [2, 4, 6], [3, 3, 5]],
  gucheng: [[2, 6, 8], [5, 6, 9], [4, 6, 8]],
};

function loadMap(id, x, y, dir) {
  const m = MAPS[id];
  S.map = m;
  if (!S.ground[id]) S.ground[id] = paintGround(m);
  const mk = market();
  S.solid = buildSolid(m, mk);
  S.props = m.props.map((p) => ({ p, ...makeProp(p, mk) }));
  S.trees = [];
  for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (m.g[ty][tx] === 'T') S.trees.push({ x: tx, y: ty, ...makeTree(tx, ty) });
  S.npcs = m.npcs.filter((n) => (n.market === undefined || n.market === mk) && (!n.when || WHEN[n.when]()))
    .filter((n) => !(n.x === x && n.y === y))
    .map((n) => ({ ...n, px: n.x * T, py: n.y * T, hx: n.x, hy: n.y, moving: false, step: 0, wait: 60 + Math.random() * 120 }));
  const P = S.player;
  P.x = x; P.y = y; P.px = x * T; P.py = y * T; P.moving = false; if (dir) P.dir = dir;
  S.banner = { text: m.name, t: 0 };
  music(TRACK[id] || 'home');
}
const reload = () => { const b = S.banner; loadMap(S.map.id, S.player.x, S.player.y); S.banner = b; };

function blocked(x, y, who) {
  const m = S.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h || S.solid[y][x]) return true;
  for (const n of S.npcs) if (n !== who && ((n.x === x && n.y === y) || (n.tx === x && n.ty === y && n.moving))) return true;
  const P = S.player;
  if (who !== P && ((P.x === x && P.y === y) || (P.moving && P.tx === x && P.ty === y))) return true;
  return false;
}

// ------------------------------------------------------------------ dialogue + story
function say(lines, then) {
  const pages = [];
  for (const l of lines) { const w = wrap(l, 27); for (let i = 0; i < w.length; i += 3) pages.push(w.slice(i, i + 3)); }
  S.dialog = { pages, page: 0, n: 0, then };
  S.mode = 'dialog';
}

function wildBattle(id, level, after, trainer) {
  const foe = trainer ? trainer.team[0] : makeMon(G.dex, id, level);
  S.flash = 36; S.mode = 'flash'; music('battle');
  S.pending = () => startBattle(foe, (r) => {
    S.mode = 'fade'; S.fade = { t: 12, w: null };
    if (r === 'lose') { healAll(); loadMap('home', 5, 6, 'down'); S.after = () => { autosave(); say(['You woke up at home.', 'Mom has looked after your Lings. They are ready to go again.']); }; }
    else { music(TRACK[S.map.id] || 'home'); S.after = () => { if (after) after(r); autosave(); }; }
  }, trainer);
}

// Trainers: an NPC with a `trainer` block challenges you once, on sight or when spoken to.
function challenge(n) {
  const t = n.trainer, D = G.dex;
  const team = t.team.map(([k, i, lv]) => makeMon(D, k === 'e' ? D.wild[i] + 1 : k === 's' ? D.starters[i] : D.wild[i], lv));
  say(n.text, () => wildBattle(0, 0, (r) => {
    if (r !== 'win') return;
    G.flags[tkey(n)] = true;
    const lines = [...t.win];
    if (t.reward) { for (const k in t.reward) { G.bag[k] += t.reward[k]; lines.push(`You got ${t.reward[k]} ${k.toUpperCase()}${t.reward[k] > 1 ? 'S' : ''}.`); } }
    if (n.id === 'master') {
      G.flags.seal = true;
      lines.push('MASTER KUI presses a small carved seal into your palm.', 'You received the KUIGE SEAL!');
      return say(lines, () => { S.mode = 'end'; S.endT = 0; sfx('catch'); });
    }
    say(lines);
  }, { name: t.name, team }));
}

function talkSpecial(n) {
  const F = G.flags;
  if (n.id === 'mom') {
    const lines = market() ? n.mtext : n.text;
    if (!G.party.length) return say(lines);
    return say(['Back already? Let me have a look at your Lings.'], () => { healAll(); sfx('heal'); if (G.bag.pear < 3) G.bag.pear = 3; if (G.bag.lantern < 5) G.bag.lantern = 5; autosave(); say(['Mom fed your Lings and patched them up. They look much better!', 'She tucks pears and a few fresh paper Lanterns into your bag.']); });
  }
  if (n.id === 'teacher') {
    if (!F.starter) return say(['Ah, there you are. Just in time.', 'Three young Lings came down from the hill station this morning. One of them is to be yours.', 'Choose carefully. A Ling remembers who chose it.'], () => { S.choose = { sel: 0 }; S.mode = 'choose'; });
    if (!F.marketCleared) return say(['A wild Ling has got in among the market stalls and nobody can catch it.', 'Take your partner down to the south end of the street and calm it down!']);
    return say(['Well done at the market. The whole street is talking about it.', 'Wild Lings live in the tall grass on Santai Hill and along the River Road. Walk in and you will meet them.', 'When your team is strong, Kuige Hall in Gucheng will test you.']);
  }
  if (n.id === 'healer') {
    if (!G.party.length) return say(n.text);
    return say(['You walked here from Longjie? Sit. Your Lings look worn through.'], () => { healAll(); sfx('heal'); autosave(); say(['The old man brews something bitter. Your Lings are back on their feet!']); });
  }
  if (n.id === 'clerk1' || n.id === 'clerk2') {
    const key = 'gift_' + n.id;
    if (!F.marketCleared || F[key]) return say(n.text);
    F[key] = true;
    if (n.id === 'clerk1') { G.bag.lantern += 5; G.bag.pear += 3; return say(['You are the kid who calmed the market!', 'Here. On the house.', 'You got 5 LANTERNS and 3 PEARS.']); }
    G.bag.pear += 3; return say(['Word travels fast along the River Road. Take these for the Hall.', 'You got 3 PEARS.']);
  }
  if (n.id === 'marketling') {
    return say(n.text, () => wildBattle(G.dex.wild[0], 3, (r) => {
      if (r === 'run') return say(['The wild Ling is still loose in the market!']);
      F.marketCleared = true; G.bag.pear += 3; reload();
      say([r === 'caught' ? 'The Ling settles into your Lantern, calm at last.' : 'The wild Ling bolts back toward the hill.', 'A stall-holder presses three Baozhu pears into your hands. "For your trouble!"', 'You got 3 PEARS. A pear restores 25 HP in battle.']);
    }));
  }
}

function interact() {
  const P = S.player, [dx, dy] = DIRS[P.dir];
  const fx = P.x + dx, fy = P.y + dy;
  const opp = { up: 'down', down: 'up', left: 'right', right: 'left' }[P.dir];
  const npcAt = (x, y) => S.npcs.find((n) => n.x === x && n.y === y && !n.moving);
  const propAt = (x, y) => S.map.props.find((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h && (p.text || p.type === 'building' || p.type === 'counter' || p.type === 'stall' || p.type === 'bed'));
  let n = npcAt(fx, fy);
  const pr = propAt(fx, fy);
  if (!n && pr && pr.type === 'counter') n = npcAt(fx + dx, fy + dy);
  if (n) {
    if (n.look !== 'ling') n.dir = opp;
    if (n.id === 'master' && !G.flags[tkey(n)] && !(G.flags.t_kuige_3_8 && G.flags.t_kuige_9_5)) return say(['My students are still waiting for you. It would be rude to walk past them.']);
    if (n.trainer) return G.flags[tkey(n)] ? say(n.trainer.after) : G.party.some((m) => m.hp > 0) ? challenge(n) : say(['Come back when you have a Ling.']);
    if (n.id) return talkSpecial(n);
    return say(market() && n.mtext ? n.mtext : n.text);
  }
  if (!pr) return;
  if (pr.type === 'building') {
    if (pr.locked && fx === pr.x + pr.door && fy === pr.y + pr.h - 1) say(pr.lockText || ['The door is locked. Nobody seems to be home.']);
    return;
  }
  if (pr.type === 'bed' && S.map.id === 'home' && G.party.length) return say(['You lie down for a moment...'], () => { healAll(); sfx('heal'); autosave(); say(['You and your Lings feel rested.']); });
  if (pr.type === 'stall') return say(market() ? ['The stall is piled high. Everything smells wonderful.'] : ['An empty market table. It waits for a day ending in 3 or 8.']);
  if (pr.text) say(pr.text);
}

function chooseStarter(i) {
  const id = G.dex.starters[i], m = makeMon(G.dex, id, 5);
  G.party.push(m); G.seen.add(id); G.caught.add(id); G.flags.starter = true; G.bag.lantern += 5;
  S.choose = null; sfx('catch'); autosave();
  say([`${nm(m)} hops into your arms. It is yours now!`, 'Take these five paper Lanterns too. A wild Ling that is tired out will step into the light and travel with you.', 'You got 5 LANTERNS.', 'Now hurry! A wild Ling has got in among the market stalls at the south end of the street.']);
}

// ------------------------------------------------------------------ movement
function stepActor(a, speed) {
  const [dx, dy] = DIRS[a.dir];
  a.px += dx * speed; a.py += dy * speed; a.step += speed;
  if (a.px === a.tx * T && a.py === a.ty * T) { a.x = a.tx; a.y = a.ty; a.moving = false; return true; }
  return false;
}
function tryMove(a, dir) {
  a.dir = dir;
  const [dx, dy] = DIRS[dir];
  if (blocked(a.x + dx, a.y + dy, a)) return false;
  a.tx = a.x + dx; a.ty = a.y + dy; a.moving = true;
  return true;
}

function updatePlay() {
  const P = S.player;
  if (hit('N')) S.toast = { text: toggleMute() ? 'SOUND OFF' : 'SOUND ON', t: 0 };
  if (hit('M')) {
    S.marketOverride = !market(); reload();
    S.toast = { text: 'MARKET DAY: ' + (market() ? 'ON' : 'OFF'), t: 0 };
  }
  if (P.moving) {
    const speed = keys.B && P.px % 2 === 0 && P.py % 2 === 0 ? 2 : 1;
    if (stepActor(P, speed)) {
      const w = S.map.warps.find((w) => w.x === P.x && w.y === P.y);
      if (w) { S.fade = { t: 0, w }; S.mode = 'fade'; sfx('door'); return; }
      if (G.party.some((m) => m.hp > 0)) for (const n of S.npcs) {
        if (!n.trainer || n.trainer.sight === false || G.flags[tkey(n)] || n.moving) continue;
        const [dx, dy] = DIRS[n.dir];
        for (let k = 1; k <= 4; k++) {
          const x = n.x + dx * k, y = n.y + dy * k;
          if (x === P.x && y === P.y) { S.alert = { n, t: 40 }; S.mode = 'alert'; sfx('alert'); P.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[n.dir]; return; }
          if (blocked(x, y, n)) break;
        }
      }
      const table = WILD[S.map.id];
      if (table && S.map.g[P.y][P.x] === 'G' && G.party.some((m) => m.hp > 0) && Math.random() < 0.13) {
        const [wi, lo, hi] = table[(Math.random() * table.length) | 0];
        return wildBattle(G.dex.wild[wi], lo + ((Math.random() * (hi - lo + 1)) | 0));
      }
    }
  }
  if (!P.moving) {
    if (hit('A')) return interact();
    if (hit('S')) { S.mode = 'menu'; S.menuSel = 0; sfx('select'); return; }
    if (S.t % 300 === 0) autosave();
    for (const d of ['up', 'down', 'left', 'right']) if (keys[d]) {
      const [dx, dy] = DIRS[d], row = S.map.g[P.y + dy];
      if (row && row[P.x + dx] === 'G' && !G.party.some((m) => m.hp > 0)) { P.dir = d; keys[d] = false; say(['The tall grass is rustling.', 'Better not go in without a Ling of your own.']); return; }
      if (!tryMove(P, d) && S.t % 20 === 0) sfx('bump');
      break;
    }
  }
  for (const n of S.npcs) {
    if (n.moving) { stepActor(n, 0.5); continue; }
    if (!n.wander) continue;
    if (--n.wait > 0) continue;
    n.wait = 90 + Math.random() * 180;
    const d = ['up', 'down', 'left', 'right'][(Math.random() * 4) | 0], [dx, dy] = DIRS[d];
    const row = S.map.g[n.y + dy];
    if (row && Math.abs(n.x + dx - n.hx) <= n.wander && Math.abs(n.y + dy - n.hy) <= n.wander && row[n.x + dx] !== 'm' && !S.map.warps.some((w) => w.x === n.x + dx && (w.y === n.y + dy || w.y === n.y + dy - 1))) tryMove(n, d);
    else n.dir = d;
  }
}

function update() {
  S.t++;
  if (S.banner && ++S.banner.t > 150) S.banner = null;
  if (S.toast && ++S.toast.t > 120) S.toast = null;
  if (S.mode === 'title') {
    const can = hasSave();
    if (can && (hit('up') || hit('down'))) { S.titleSel ^= 1; sfx('blip'); }
    if (hit('A') || hit('S')) {
      unlock(); sfx('select');
      const pos = can && S.titleSel === 0 ? load() : null;
      if (pos && MAPS[pos.map]) { loadMap(pos.map, pos.x, pos.y, pos.dir); S.fade = { t: 12, w: null }; S.mode = 'fade'; }
      else { S.mode = 'seed'; typing.on = true; typing.buf.length = 0; music('town'); }
    }
  } else if (S.mode === 'seed') {
    for (const ch of typing.buf.splice(0)) {
      if (ch === '\b') S.seedText = S.seedText.slice(0, -1);
      else if (ch === '\t') S.seedText = 'MARKET-' + ((Math.random() * 9000 + 1000) | 0);
      else if (S.seedText.length < 12) S.seedText += ch;
    }
    if (hit('B')) { typing.on = false; S.mode = 'title'; }
    else if (hit('S') && S.seedText.length) { typing.on = false; sfx('select'); newGame(S.seedText); loadMap(START.map, START.x, START.y, START.dir); S.fade = { t: 12, w: null }; S.mode = 'fade'; autosave(); }
  } else if (S.mode === 'alert') {
    if (--S.alert.t <= 0) { const n = S.alert.n; S.alert = null; S.mode = 'play'; challenge(n); }
  } else if (S.mode === 'end') {
    S.endT++;
    if (S.endT > 120 && hit('A')) { S.mode = 'play'; autosave(); }
  } else if (S.mode === 'play') updatePlay();
  else if (S.mode === 'dialog') {
    const d = S.dialog, len = d.pages[d.page].join('').length;
    if (d.n < len) { d.n += keys.B ? 3 : 1; if (hit('A')) d.n = len; }
    else if (hit('A')) { sfx('blip'); if (++d.page >= d.pages.length) { S.dialog = null; S.mode = 'play'; if (d.then) d.then(); } else d.n = 0; }
  } else if (S.mode === 'fade') {
    const f = S.fade; f.t++;
    if (f.t === 12 && f.w) loadMap(f.w.to, f.w.tx, f.w.ty, f.w.dir);
    if (f.t >= 24) { S.fade = null; S.mode = 'play'; if (S.after) { const a = S.after; S.after = null; a(); } }
  } else if (S.mode === 'flash') {
    if (--S.flash <= 0) { S.mode = 'battle'; S.pending(); S.pending = null; }
  } else if (S.mode === 'battle') { if (inBattle()) updateBattle(); }
  else if (S.mode === 'choose') {
    const c = S.choose;
    if (hit('left')) { c.sel = (c.sel + 2) % 3; sfx('blip'); } if (hit('right')) { c.sel = (c.sel + 1) % 3; sfx('blip'); }
    if (hit('A')) chooseStarter(c.sel);
  } else if (S.mode === 'menu') {
    const n = G.party.length;
    if (hit('B') || hit('S') || (!n && hit('A'))) S.mode = 'play';
    else {
      if (hit('up') && S.menuSel > 0) { S.menuSel--; sfx('blip'); } if (hit('down') && S.menuSel < n - 1) { S.menuSel++; sfx('blip'); }
      if (hit('A') && S.menuSel > 0) { const [m] = G.party.splice(S.menuSel, 1); G.party.unshift(m); S.menuSel = 0; sfx('select'); autosave(); }
    }
  }
  clearPressed();
}

// ------------------------------------------------------------------ draw
function camera() {
  const m = S.map, P = S.player, W = m.w * T, H = m.h * T;
  const cx = W <= VW ? (W - VW) / 2 : Math.max(0, Math.min(W - VW, P.px + 8 - VW / 2));
  const cy = H <= VH ? (H - VH) / 2 : Math.max(0, Math.min(H - VH, P.py + 8 - VH / 2));
  return [Math.round(cx), Math.round(cy)];
}

function drawChar(a, cx, cy, list) {
  if (a.look === 'ling') {
    const ic = lingIcon(G.dex.list[G.dex.wild[0]]);
    list.push({ b: a.py + T + 1, draw() { ctx.drawImage(ic, a.px - cx - 4, a.py - cy - 10 - (((S.t >> 3) & 3) === 0 ? 2 : 0)); } });
    return;
  }
  const fr = charFrames(a.look)[a.dir];
  const f = a.moving ? 1 + ((a.step >> 3) & 1) : 0;
  list.push({ b: a.py + T + 1, draw() {
    const x = Math.round(a.px) - cx, y = Math.round(a.py) - cy - 10 - (f === 1 ? 1 : 0);
    ctx.drawImage(fr[f], x, y);
    const gx = Math.round(a.px / T), gy = Math.round(a.py / T);
    if (S.map.g[gy] && S.map.g[gy][gx] === 'G') ctx.drawImage(anim.G[0], 0, 8, 16, 8, gx * T - cx, gy * T - cy + 8, 16, 8);
  } });
}

function drawWorld() {
  const m = S.map, [cx, cy] = camera();
  rect(ctx, 0, 0, VW, VH, '#181420');
  ctx.drawImage(S.ground[m.id], -cx, -cy);
  const x0 = Math.max(0, (cx / T) | 0), y0 = Math.max(0, (cy / T) | 0), x1 = Math.min(m.w - 1, x0 + 16), y1 = Math.min(m.h - 1, y0 + 11);
  const wf = (S.t >> 4) & 3;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const ch = m.g[y][x];
    if (ch === 'w') ctx.drawImage(anim.w[(wf + x + y) & 3], x * T - cx, y * T - cy);
    else if (ch === 'G') ctx.drawImage(anim.G[((S.t >> 5) + x) & 1], x * T - cx, y * T - cy);
  }
  const list = [];
  for (const t of S.trees) if (t.x >= x0 - 1 && t.x <= x1 + 1 && t.y >= y0 - 1 && t.y <= y1 + 2) list.push({ b: (t.y + 1) * T, draw: () => ctx.drawImage(t.cv, t.x * T + t.ox - cx, t.y * T + t.oy - cy) });
  for (const o of S.props) {
    const p = o.p, X = p.x * T + o.ox - cx, Y = p.y * T + o.oy - cy;
    if (X > VW || Y > VH || X + o.cv.width < 0 || Y + o.cv.height < 0) continue;
    list.push({ b: (p.y + p.h) * T, draw: () => ctx.drawImage(o.cv, X, Y) });
  }
  for (const n of S.npcs) drawChar(n, cx, cy, list);
  drawChar(S.player, cx, cy, list);
  list.sort((a, b) => a.b - b.b);
  for (const d of list) d.draw();
}

function drawTitle() {
  const m = MAPS.longjie;
  if (!S.ground.longjie) S.ground.longjie = paintGround(m);
  const sx = 26 * T - 20 + Math.round(Math.sin(S.t / 240) * 24), sy = 34 * T;
  ctx.drawImage(S.ground.longjie, -sx, -sy);
  rect(ctx, 0, 0, VW, VH, '#18142099');
  rect(ctx, 0, 38, VW, 46, '#181420cc');
  text('LONGJIE', 64, 46, '#f8d048', 2); text('LONGJIE', 63, 45, '#f8f8f0', 2);
  text('A MARKET-TOWN ADVENTURE', 28, 70, '#f8f8f0');
  if (hasSave()) {
    ['CONTINUE', 'NEW GAME'].forEach((t, i) => { text(t, 92, 102 + i * 14, '#f8f8f0'); if (S.titleSel === i) text('>', 80, 102 + i * 14, '#f8d048'); });
  } else if ((S.t >> 5) & 1) text('PRESS Z TO START', 56, 108, '#f8f8f0');
  text('ARROWS MOVE  Z TALK  X RUN', 16, 144, '#c8c0b0');
}

// New game: type a seed. The three partners redraw live, because the seed makes the whole bestiary.
let seedDex = null, seedFor = '';
function drawSeed() {
  if (seedFor !== S.seedText) { seedFor = S.seedText; seedDex = makeDex(S.seedText || ' '); }
  rect(ctx, 0, 0, VW, VH, '#283048');
  for (let y = 0; y < VH; y += 8) rect(ctx, 0, y, VW, 1, '#303858');
  text('WORLD SEED', 80, 10, '#f8d048');
  box(40, 24, 160, 22, '#f8d048'); text(S.seedText + ((S.t >> 4) & 1 ? '_' : ''), 48, 31);
  text('EVERY SEED GROWS ITS OWN', 24, 54, '#c8c0b0'); text('SET OF 15 LINGS.', 56, 64, '#c8c0b0');
  seedDex.starters.forEach((id, i) => { const s = seedDex.list[id]; ctx.drawImage(lingSprite(s), 22 + i * 70, 74); const n = s.name.toUpperCase(); text(n, 50 + i * 70 - n.length * 4, 132, '#f8f8f0'); });
  text(hasSave() ? 'ENTER REPLACES YOUR OLD SAVE' : 'TYPE  TAB:RANDOM  ENTER:GO', hasSave() ? 8 : 16, 148, hasSave() ? '#f8d048' : '#c8c0b0');
}

function drawEnd() {
  rect(ctx, 0, 0, VW, VH, '#181420');
  const y = Math.max(0, 60 - S.endT);
  text('KUIGE SEAL', 80, 24 + y, '#f8d048');
  G.party.forEach((m, i) => ctx.drawImage(lingSprite(sp(m)), 0, 0, 56, 56, 120 - G.party.length * 18 + i * 36, 40 + y, 34, 34));
  text('YOU WALKED OUT OF LONGJIE', 20, 86 + y, '#f8f8f0'); text('AND CAME HOME A HANDLER.', 24, 98 + y, '#f8f8f0');
  text(`MET ${G.seen.size}/15  SEED ${G.seed}`, 120 - (`MET ${G.seen.size}/15  SEED ${G.seed}`.length * 4), 118 + y, '#c8c0b0');
  if (S.endT > 120 && (S.t >> 5) & 1) text('Z  KEEP EXPLORING', 52, 142, '#c8c0b0');
}

function drawChoose() {
  rect(ctx, 0, 0, VW, VH, '#283048');
  for (let y = 0; y < VH; y += 8) rect(ctx, 0, y, VW, 1, '#303858');
  text('CHOOSE YOUR PARTNER', 44, 10, '#f8f8f0');
  G.dex.starters.forEach((id, i) => {
    const s = G.dex.list[id], x = 12 + i * 76, on = S.choose.sel === i;
    box(x, 28, 68, 96, on ? '#f8d048' : '#787888');
    ctx.drawImage(lingSprite(s), x + 6, 32 - (on && (S.t >> 4) & 1 ? 2 : 0));
    const n = s.name.toUpperCase(); text(n, x + 34 - n.length * 4, 94);
    const c = TYPE_COL[s.type], w = s.type.length * 8 + 4; rect(ctx, x + 34 - w / 2, 106, w, 10, '#30303c'); rect(ctx, x + 35 - w / 2, 107, w - 2, 8, c[1]); text(s.type, x + 36 - w / 2, 107, '#f8f8f0');
  });
  text('< >  CHOOSE     Z  TAKE', 28, 138, '#c8c0b0');
}

function drawMenu() {
  drawParty(G.party.length ? S.menuSel : -1, 'YOUR LINGS');
  if (G.party.length > 1) text('Z: LEAD', 172, 11, '#787888');
  if (!G.party.length) text('NO LINGS YET', 72, 60, '#787888');
  rect(ctx, 8, 132, 224, 1, '#4068c0');
  text(`LANTERN x${G.bag.lantern}  PEAR x${G.bag.pear}`, 12, 136);
  text(`MET ${G.seen.size}/${G.dex.list.length}  SEED ${G.seed}`, 12, 146, '#787888');
  if (G.flags.seal) text('SEAL', 196, 136, '#c89820');
}

function draw() {
  if (S.mode === 'title') return drawTitle();
  if (S.mode === 'seed') return drawSeed();
  if (S.mode === 'end') return drawEnd();
  if (S.mode === 'choose') return drawChoose();
  if (S.mode === 'battle' && inBattle()) return drawBattle();
  drawWorld();
  if (S.mode === 'menu') return drawMenu();
  if (S.alert) { const n = S.alert.n, [cx, cy] = camera(); box(n.px - cx + 2, n.py - cy - 26, 12, 14, '#e05848'); text('!', n.px - cx + 4, n.py - cy - 23, '#e05848'); }
  if (S.banner) {
    const b = S.banner, w = b.text.length * 8 + 14, y = Math.min(4, b.t * 2 - 20, (150 - b.t) * 2 - 20);
    box(4, y, w, 20); text(b.text, 11, y + 6);
  }
  if (S.toast) { const w = S.toast.text.length * 8 + 14; box(VW - w - 4, 4, w, 20); text(S.toast.text, VW - w + 3, 10); }
  if (S.dialog) {
    const d = S.dialog; box(4, 108, 232, 48);
    if (drawLines(d.pages[d.page], d.n, 12, 116) && (S.t >> 4) & 1) { rect(ctx, 222, 146, 5, 1, '#e05848'); rect(ctx, 223, 147, 3, 1, '#e05848'); rect(ctx, 224, 148, 1, 1, '#e05848'); }
  }
  if (S.fade) { const a = 1 - Math.abs(S.fade.t - 12) / 12; ctx.globalAlpha = Math.max(0, Math.min(1, a)); rect(ctx, 0, 0, VW, VH, '#181420'); ctx.globalAlpha = 1; }
  if (S.mode === 'flash') { // battle transition: the screen blinks, then closes in bars
    if (S.flash > 18) { if ((S.flash >> 2) & 1) rect(ctx, 0, 0, VW, VH, '#f8f8f0'); }
    else { const h = Math.round((1 - S.flash / 18) * 80); rect(ctx, 0, 0, VW, h, '#181420'); rect(ctx, 0, VH - h, VW, h, '#181420'); }
  }
}

// ------------------------------------------------------------------ loop + layout
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
function fit() {
  const s = Math.max(1, Math.floor(Math.min(screen.parentElement.clientWidth / VW, (innerHeight - 120) / VH)));
  screen.style.width = VW * s + 'px'; screen.style.height = VH * s + 'px';
}
addEventListener('resize', fit); fit();
screen.addEventListener('click', () => { screen.focus(); unlock(); });
addEventListener('keydown', unlock);
newGame();
requestAnimationFrame(loop);

// Test hooks (used by tools/test.mjs).
if (location.search.includes('debug')) window.__game = { battleState, challenge, save: autosave, sprites: lingSprite, S, G, MAPS, loadMap, update, draw, market, newGame, makeMon, wildBattle, say, setMarket(v) { S.marketOverride = v; }, press, keys };
