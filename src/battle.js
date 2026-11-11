// Turn-based battles. The whole fight is a queue of small steps (messages, HP bars,
// waits, callbacks), which keeps the rules readable and easy to extend.
import { ctx, VW, text, wrap, box, cursor, keys, hit, drawLines } from './ui.js';
import { rect, disc } from './gfx.js';
import { MOVES, effect, TYPE_COL, lingSprite, calc } from './gen.js';
import { G, sp, nm } from './state.js';
import { sfx } from './audio.js';

let B = null;
export const inBattle = () => !!B;
export const battleState = () => B;
const cur = () => G.party[B.me];
const push = (it) => (B.ins || B.q).push(it);
const msg = (s) => push({ k: 'msg', lines: wrap(s, 27), n: 0 });
const fn = (f) => push({ k: 'fn', fn: f });
const wait = (t) => push({ k: 'wait', t });
const pre = () => (B.trainer ? 'Their ' : 'Wild ');
const mult = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export function startBattle(foe, onEnd, trainer) {
  for (const m of G.party) { m.dhp = m.hp; m.stage = { atk: 0, def: 0 }; }
  foe.dhp = foe.hp;
  B = { foe, me: G.party.findIndex((m) => m.hp > 0), q: [], cur: null, menu: null, sel: 0, t: 0, onEnd, hitT: 0, intro: 40, trainer, ti: 0 };
  G.seen.add(foe.id);
  if (trainer) { msg(`${trainer.name} steps forward!`); msg(`${trainer.name} calls on ${nm(foe)}!`); } else msg(`A wild ${nm(foe)} darts out of the grass!`);
  msg(`${nm(cur())}, with me!`);
}

function useMove(a, d, name, mine) {
  msg(`${mine ? '' : pre()}${nm(a)} used ${name}!`);
  fn(() => {
    const mv = MOVES[name];
    if (Math.random() * 100 >= mv.acc) return msg('It went wide!');
    if (mv.fx) {
      const [stat, delta, who] = mv.fx, t = who === 'self' ? a : d;
      if (Math.abs(t.stage[stat] + delta) > 3) return msg('Nothing happened.');
      t.stage[stat] += delta;
      return msg(`${t === B.foe ? pre() : ''}${nm(t)}'s ${stat === 'atk' ? 'attack' : 'defense'} ${delta > 0 ? 'rose' : 'fell'}!`);
    }
    const eff = effect(mv.type, sp(d).type), stab = mv.type === sp(a).type ? 1.5 : 1, crit = Math.random() < 1 / 16;
    const atk = a.atk * mult(a.stage.atk), def = d.def * mult(d.stage.def);
    const dmg = Math.max(1, Math.floor(((((2 * a.level) / 5 + 2) * mv.pow * atk) / def / 50 + 2) * stab * eff * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15)));
    d.hp = Math.max(0, d.hp - dmg); B.hitWho = d; B.hitT = 24; sfx('hit');
    push({ k: 'hp', m: d });
    if (crit) msg('A telling blow!');
    if (eff > 1) msg('That struck right where it hurts!'); else if (eff < 1) msg('It barely left a mark...');
    fn(() => checkFaint(d, !mine));
  });
}

function checkFaint(d, mineFainted) {
  if (d.hp > 0) return;
  if (!mineFainted) {
    msg(`${pre()}${nm(d)} is worn out!`); fn(() => { B.foeGone = true; sfx('faint'); });
    gainXp();
    fn(() => {
      const tr = B.trainer;
      if (tr && B.ti + 1 < tr.team.length) {
        B.ti++; B.foe = tr.team[B.ti]; B.foe.dhp = B.foe.hp; B.foeGone = false; B.intro = 30; G.seen.add(B.foe.id);
        msg(`${tr.name} calls on ${nm(B.foe)}!`);
      } else { if (tr) msg(`${tr.name} yields!`); fn(() => { B.result = B.result || 'win'; }); }
    });
  } else {
    msg(`${nm(d)} is worn out!`); fn(() => sfx('faint'));
    fn(() => {
      if (G.party.some((m) => m.hp > 0)) { B.force = true; B.menu = 'party'; B.sel = G.party.findIndex((m) => m.hp > 0); }
      else { msg('None of your Lings can go on.'); msg('You carry them home as fast as you can...'); fn(() => { B.result = 'lose'; }); }
    });
  }
}

function gainXp() {
  const me = cur(), xp = Math.floor(((sp(B.foe).exp * B.foe.level) / 5) * (B.trainer ? 1.5 : 1));
  msg(`${nm(me)} earned ${xp} XP.`);
  fn(() => {
    me.xp += xp;
    while (me.level < 50 && me.xp >= (me.level + 1) ** 3) {
      const old = me.max; me.level++; calc(G.dex, me); me.hp += me.max - old; me.dhp = me.hp;
      msg(`${nm(me)} reached Lv ${me.level}!`); sfx('level');
      for (const [lv, mv] of sp(me).learn) if (lv === me.level && !me.moves.includes(mv)) { if (me.moves.length >= 4) me.moves.shift(); me.moves.push(mv); msg(`${nm(me)} picked up ${mv}!`); }
    }
    const ev = sp(me).evolve;
    if (ev && me.level >= ev.level) {
      const oldName = nm(me);
      msg(`Something stirs in ${oldName}...`);
      fn(() => { const old = me.max; me.id = ev.to; calc(G.dex, me); me.hp += me.max - old; me.dhp = me.hp; B.evoT = 50; G.seen.add(me.id); G.caught.add(me.id); });
      wait(50);
      fn(() => msg(`${oldName} has grown into ${nm(me)}!`));
    }
  });
}

function throwLantern() {
  const foe = B.foe;
  G.bag.lantern--;
  msg('You held up a paper Lantern!');
  fn(() => { B.lamp = { t: 0, shake: 0 }; sfx('lantern'); }); wait(36);
  fn(() => {
    const chance = Math.min(1, (((3 * foe.max - 2 * foe.hp) * sp(foe).rate) / (3 * foe.max) / 255) * 1.1 + 0.05);
    const ok = Math.random() < chance, shakes = ok ? 3 : (Math.random() * 3) | 0;
    B.lamp.in = true;
    for (let i = 0; i < shakes; i++) { wait(18); fn(() => { B.lamp.shake = 14; sfx('blip'); }); }
    wait(30);
    if (ok) {
      fn(() => sfx('catch')); msg(`${nm(foe)} stepped into the light!`); msg(`${nm(foe)} was befriended!`);
      fn(() => {
        foe.stage = { atk: 0, def: 0 }; G.caught.add(foe.id);
        G.party.push(foe);
        fn(() => { B.result = 'caught'; });
      });
    } else { fn(() => { B.lamp = null; }); msg(`${nm(foe)} slipped out of the light!`); }
  });
}

function act(a) {
  const me = cur(), foe = B.foe;
  if (a.k === 'move') useMove(me, foe, a.name, true);
  else if (a.k === 'lamp') throwLantern();
  else if (a.k === 'pear') { sfx('heal'); G.bag.pear--; me.hp = Math.min(me.max, me.hp + 25); msg(`${nm(me)} ate a Baozhu pear.`); push({ k: 'hp', m: me }); }
  else if (a.k === 'switch') { msg(`${nm(me)}, fall back!`); fn(() => { me.stage = { atk: 0, def: 0 }; B.me = a.i; }); fn(() => msg(`${nm(cur())}, with me!`)); }
  else if (a.k === 'run') {
    if (me.spd >= foe.spd || Math.random() < 0.6) { msg('You slipped away.'); fn(() => { B.result = 'run'; }); }
    else msg('No way out!');
  }
}

function foeAct() {
  const foe = B.foe, dm = foe.moves.filter((m) => MOVES[m].pow);
  const name = dm.length && Math.random() < 0.75 ? dm[(Math.random() * dm.length) | 0] : foe.moves[(Math.random() * foe.moves.length) | 0];
  useMove(foe, cur(), name, false);
}

function turn(a) {
  B.menu = null;
  const me = cur(), foe = B.foe, first = a.k !== 'move' || me.spd >= foe.spd;
  const alive = () => !B.result && !B.foeGone && foe.hp > 0;
  if (first) { act(a); fn(() => { if (alive() && cur().hp > 0) foeAct(); }); }
  else { foeAct(); fn(() => { if (alive() && cur() === me && me.hp > 0) act(a); }); }
}

function menuInput() {
  const before = B.sel;
  const mv = (n, cols) => {
    if (hit('left') && B.sel % cols) B.sel--; if (hit('right') && B.sel % cols < cols - 1 && B.sel + 1 < n) B.sel++;
    if (hit('up') && B.sel >= cols) B.sel -= cols; if (hit('down') && B.sel + cols < n) B.sel += cols;
  };
  const me = cur();
  if (B.menu === 'main') {
    mv(4, 2);
    if (hit('A')) {
      const s = B.sel; B.sel = 0; sfx('select');
      if (s === 0) B.menu = 'moves'; else if (s === 1) B.menu = 'bag'; else if (s === 2) { B.menu = 'party'; B.sel = B.me; }
      else if (B.trainer) { B.menu = null; msg('You cannot walk away from a challenge.'); }
      else turn({ k: 'run' });
    }
  } else if (B.menu === 'moves') {
    mv(me.moves.length, 2);
    if (hit('A')) turn({ k: 'move', name: me.moves[B.sel] }); else if (hit('B')) { B.menu = 'main'; B.sel = 0; }
  } else if (B.menu === 'bag') {
    mv(2, 1);
    if (hit('A')) {
      if (B.sel === 0 && B.trainer) { B.menu = null; msg('You cannot take someone else\'s Ling!'); }
      else if (B.sel === 0 && G.party.length >= 6) { B.menu = null; msg('Six Lings is as many as you can look after. There is no room for another.'); }
      else if (B.sel === 0 && G.bag.lantern > 0) turn({ k: 'lamp' });
      else if (B.sel === 0) { B.menu = null; msg('You are out of Lanterns.'); }
      else if (G.bag.pear > 0 && me.hp < me.max) turn({ k: 'pear' });
      else { B.menu = null; msg(G.bag.pear ? `${nm(me)} is not hungry.` : 'You are out of pears.'); }
    } else if (hit('B')) { B.menu = 'main'; B.sel = 1; }
  } else if (B.menu === 'party') {
    mv(G.party.length, 1);
    if (hit('A')) {
      const m = G.party[B.sel];
      if (m.hp > 0 && (B.force || B.sel !== B.me)) {
        if (B.force) { B.force = false; B.me = B.sel; B.menu = null; msg(`${nm(cur())}, with me!`); }
        else turn({ k: 'switch', i: B.sel });
      }
    } else if (hit('B') && !B.force) { B.menu = 'main'; B.sel = 2; }
  }
  if (B && B.menu && B.sel !== before) sfx('blip');
}

export function updateBattle() {
  B.t++;
  if (B.intro > 0) B.intro--;
  if (B.hitT > 0) B.hitT--;
  if (B.evoT > 0) B.evoT--;
  if (B.lamp) { B.lamp.t++; if (B.lamp.shake > 0) B.lamp.shake--; }
  if (B.menu) return menuInput();
  for (;;) {
    if (!B.cur) {
      if (!B.q.length) {
        if (B.result) { const r = B.result, cb = B.onEnd; for (const m of G.party) m.stage = { atk: 0, def: 0 }; B = null; return cb(r); }
        B.menu = 'main'; B.sel = 0; return;
      }
      B.cur = B.q.shift();
    }
    const c = B.cur;
    if (c.k === 'fn') { B.ins = []; c.fn(); B.q = B.ins.concat(B.q); B.ins = null; B.cur = null; if (B.menu) return; continue; }
    if (c.k === 'wait') { if (--c.t <= 0) { B.cur = null; continue; } return; }
    if (c.k === 'hp') { const m = c.m; if (m.dhp === m.hp) { B.cur = null; continue; } const st = Math.max(1, Math.ceil(m.max / 40)); m.dhp = m.dhp > m.hp ? Math.max(m.hp, m.dhp - st) : Math.min(m.hp, m.dhp + st); return; }
    if (c.k === 'msg') {
      const len = c.lines.join('').length;
      if (c.n < len) { c.n += keys.B ? 4 : 2; if (hit('A')) c.n = len; return; }
      if (hit('A')) { B.cur = null; sfx('blip'); continue; }
      return;
    }
  }
}

// ------------------------------------------------------------------ drawing
function hpBar(x, y, w, m) {
  const f = Math.max(0, m.dhp / m.max), col = f > 0.5 ? '#48c848' : f > 0.2 ? '#f8c030' : '#f04838';
  rect(ctx, x - 1, y - 1, w + 2, 6, '#30303c'); rect(ctx, x, y, w, 4, '#787888'); rect(ctx, x, y, Math.ceil(w * f), 4, col); rect(ctx, x, y, Math.ceil(w * f), 1, '#ffffff60');
}
function typeTag(x, y, t) { const c = TYPE_COL[t]; rect(ctx, x, y, t.length * 8 + 4, 10, '#30303c'); rect(ctx, x + 1, y + 1, t.length * 8 + 2, 8, c[1]); text(t, x + 2, y + 1, '#f8f8f8'); }

function lantern(x, y) {
  rect(ctx, x - 1, y - 9, 2, 3, '#c89820'); disc(ctx, x, y, 6, 6, '#30303c'); disc(ctx, x, y, 5, 5, '#e83830'); disc(ctx, x - 1, y - 1, 2, 3, '#f87860');
  rect(ctx, x - 3, y - 6, 6, 2, '#f8d048'); rect(ctx, x - 3, y + 5, 6, 2, '#f8d048'); rect(ctx, x, y + 7, 1, 4, '#f8d048');
}

export function drawBattle() {
  const me = cur(), foe = B.foe;
  rect(ctx, 0, 0, VW, 112, '#c8f0c0');
  for (let y = 0; y < 112; y += 8) rect(ctx, 0, y, VW, 3, '#d8f8d0');
  disc(ctx, 178, 66, 46, 11, '#70b858'); disc(ctx, 178, 64, 46, 11, '#98d880');
  disc(ctx, 62, 112, 56, 13, '#70b858'); disc(ctx, 62, 110, 56, 13, '#98d880');
  const slide = B.intro * 4;
  const blink = (m) => B.hitWho === m && B.hitT > 0 && (B.hitT >> 2) & 1;
  if (!B.foeGone && !(B.lamp && B.lamp.in) && !blink(foe)) ctx.drawImage(lingSprite(sp(foe)), 150 + slide, 10);
  if (me.dhp > 0 && !blink(me) && !(B.evoT > 0 && (B.evoT >> 2) & 1)) ctx.drawImage(lingSprite(sp(me), true), 34 - slide, 58);
  if (B.lamp) {
    const b = B.lamp;
    if (!b.in) { const k = Math.min(1, b.t / 34); lantern(Math.round(70 + 108 * k), Math.round(92 - 48 * k - Math.sin(k * Math.PI) * 30)); }
    else lantern(178 + (b.shake > 0 ? ((b.shake >> 2) & 1 ? 2 : -2) : 0), 50);
  }
  // info boxes
  box(6, 8, 118, 30, '#f8d048'); text(nm(foe), 12, 14); text('Lv' + foe.level, 12 + 76, 14); text('HP', 12, 25, '#e05848'); hpBar(30, 26, 86, foe);
  box(116, 68, 120, 40, '#f8d048'); text(nm(me), 122, 74); text('Lv' + me.level, 122 + 76, 74); text('HP', 122, 85, '#e05848'); hpBar(140, 86, 88, me);
  const hpTxt = `${Math.round(me.dhp)}/${me.max}`; text(hpTxt, 230 - hpTxt.length * 8, 95);
  const lo = me.level ** 3, hi = (me.level + 1) ** 3; rect(ctx, 122, 104, 108, 1, '#787888'); rect(ctx, 122, 104, Math.round(108 * Math.min(1, (me.xp - lo) / (hi - lo))), 1, '#4090e8');
  // bottom panel
  box(0, 112, 240, 48, '#4068c0');
  if (B.menu === 'main') {
    drawLines(wrap(`${nm(me)} awaits your call.`, 13), 99, 10, 122);
    box(120, 112, 120, 48, '#4068c0');
    ['STRIKE', 'PACK', 'SWAP', 'FLEE'].forEach((s, i) => { const x = 134 + (i % 2) * 56, y = 124 + ((i / 2) | 0) * 16; text(s, x, y); if (B.sel === i) cursor(x - 8, y); });
  } else if (B.menu === 'moves') {
    me.moves.forEach((s, i) => { const x = 18 + (i % 2) * 112, y = 122 + ((i / 2) | 0) * 13; text(s, x, y); if (B.sel === i) cursor(x - 8, y); });
    const mv = MOVES[me.moves[B.sel]]; typeTag(18, 147, mv.type); text(mv.pow ? 'POWER ' + mv.pow : 'STATUS', 18 + mv.type.length * 8 + 12, 148, '#787888');
  } else if (B.menu === 'bag') {
    [`LANTERN  x${G.bag.lantern}`, `PEAR     x${G.bag.pear}`].forEach((s, i) => { text(s, 22, 124 + i * 14); if (B.sel === i) cursor(12, 124 + i * 14); });
    text(B.sel ? 'RESTORES 25 HP' : 'BEFRIENDS A LING', 108, 148 - 14 * 0, '#787888');
  } else if (B.menu === 'party') drawParty(B.sel, B.force ? 'CHOOSE A LING' : 'SWITCH LING');
  else if (B.cur && B.cur.k === 'msg') {
    if (drawLines(B.cur.lines, B.cur.n, 12, 122) && (B.t >> 4) & 1) { rect(ctx, 222, 148, 5, 1, '#e05848'); rect(ctx, 223, 149, 3, 1, '#e05848'); rect(ctx, 224, 150, 1, 1, '#e05848'); }
  }
}

// Party list, shared with the pause menu.
export function drawParty(sel, title) {
  box(4, 4, 232, 152, '#4068c0'); text(title, 12, 11, '#4068c0');
  G.party.forEach((m, i) => {
    const y = 24 + i * 21;
    if (sel === i) { rect(ctx, 8, y - 2, 224, 20, '#d8e8f8'); cursor(11, y + 4); }
    ctx.drawImage(lingSprite(sp(m)), 0, 0, 56, 56, 18, y - 3, 20, 20);
    text(nm(m), 42, y); text('Lv' + m.level, 122, y); typeTag(162, y - 1, sp(m).type);
    m.dhp = m.dhp === undefined ? m.hp : m.dhp; hpBar(42, y + 11, 76, m); text(`${m.hp}/${m.max}`, 124, y + 9, m.hp ? '#30303c' : '#e05848');
  });
}
