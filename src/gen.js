// The seed world. One seed deterministically produces the whole bestiary: names, types,
// stats, move lists, evolutions and the sprites themselves. The creatures are called Lings.
import { canvas, rng } from './gfx.js';

export const TYPES = ['LEAF', 'FIRE', 'WATER', 'EARTH', 'WIND', 'SPARK'];
const BEATS = { LEAF: ['WATER', 'EARTH'], FIRE: ['LEAF'], WATER: ['FIRE', 'EARTH'], EARTH: ['SPARK', 'FIRE'], WIND: ['LEAF'], SPARK: ['WATER', 'WIND'] };
export function effect(att, def) {
  if (!BEATS[att]) return 1;
  if (BEATS[att].includes(def)) return 2;
  if (att === def || BEATS[def].includes(att)) return 0.5;
  return 1;
}

export const TYPE_COL = {
  LEAF: ['#68c058', '#3c8840', '#a8e890', '#f8e060'], FIRE: ['#e86858', '#b04038', '#f8a898', '#f8d048'],
  WATER: ['#60a8f0', '#3870c0', '#a8d8f8', '#f8f8f8'], EARTH: ['#c8a068', '#906c40', '#e8cc98', '#807060'],
  WIND: ['#b8c8f0', '#7888c0', '#e8f0f8', '#f890b0'], SPARK: ['#b890f0', '#8060c0', '#e0d0f8', '#f8f080'],
  PLAIN: ['#c0c0c0', '#888888', '#e8e8e8', '#888888'],
};

export const MOVES = {
  Bump: { type: 'PLAIN', pow: 35, acc: 95 }, Nip: { type: 'PLAIN', pow: 40, acc: 100 },
  'Hard Stare': { type: 'PLAIN', fx: ['def', -1, 'foe'], acc: 100 }, Brace: { type: 'PLAIN', fx: ['def', 1, 'self'], acc: 100 },
  Rumble: { type: 'PLAIN', fx: ['atk', -1, 'foe'], acc: 100 }, 'Puff Up': { type: 'PLAIN', fx: ['atk', 1, 'self'], acc: 100 },
  'Leaf Toss': { type: 'LEAF', pow: 40, acc: 100 }, 'Thorn Whip': { type: 'LEAF', pow: 60, acc: 95 },
  Cinder: { type: 'FIRE', pow: 40, acc: 100 }, 'Flame Dash': { type: 'FIRE', pow: 60, acc: 95 },
  'Splash Shot': { type: 'WATER', pow: 40, acc: 100 }, 'Tide Slam': { type: 'WATER', pow: 60, acc: 95 },
  Pebble: { type: 'EARTH', pow: 40, acc: 100 }, 'Rock Roll': { type: 'EARTH', pow: 60, acc: 90 },
  Breeze: { type: 'WIND', pow: 40, acc: 100 }, 'Gale Wing': { type: 'WIND', pow: 60, acc: 95 },
  Zap: { type: 'SPARK', pow: 40, acc: 100 }, 'Bolt Rush': { type: 'SPARK', pow: 60, acc: 95 },
};
const TYPE_MOVES = { LEAF: ['Leaf Toss', 'Thorn Whip'], FIRE: ['Cinder', 'Flame Dash'], WATER: ['Splash Shot', 'Tide Slam'], EARTH: ['Pebble', 'Rock Roll'], WIND: ['Breeze', 'Gale Wing'], SPARK: ['Zap', 'Bolt Rush'] };

export function hashSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const SYL = ['mo', 'ri', 'ka', 'lu', 'ta', 'ne', 'po', 'zu', 'fi', 'sha', 'dun', 'bo', 'ko', 'la', 'mi', 'ro', 'ya', 'te', 'nu', 'gi', 'su', 'wa', 'ho', 'be', 'jin', 'xi', 'long', 'hua'];
const END = ['', '', 'n', 'k', 'x', 'l'];
const EVO = ['ra', 'dor', 'lis', 'gon', 'vex', 'mar', 'tan'];
const pick = (r, a) => a[(r() * a.length) | 0];

// Build the bestiary. Layout: 3 starter lines (LEAF/FIRE/WATER, two stages each),
// then 3 two-stage wild lines and 3 single wild species = 15 Lings.
export function makeDex(seedStr) {
  const r = rng(hashSeed(seedStr));
  const used = new Set(), dex = [];
  const name = () => {
    for (;;) { const n = pick(r, SYL) + pick(r, SYL) + pick(r, END); if (n.length >= 4 && n.length <= 8 && !used.has(n)) { used.add(n); return n[0].toUpperCase() + n.slice(1); } }
  };
  const look = (type, starter) => ({
    body: pick(r, ['round', 'round', 'tall', 'long']), ear: pick(r, ['point', 'round', 'long', 'horn', 'none']),
    tail: pick(r, ['curl', 'tuft', 'fin', 'none']), mark: pick(r, ['stripe', 'spot', 'none', 'none']),
    eye: pick(r, ['big', 'big', 'dot', 'fierce']), wings: !starter && type === 'WIND' ? true : r() < 0.12, belly: r() < 0.7,
  });
  const line = (type, stages, starter) => {
    const base = name(), lk = look(type, starter);
    const bias = [r(), r(), r(), r()], sum = bias.reduce((a, b) => a + b, 0);
    for (let s = 0; s < stages; s++) {
      const total = (starter ? 200 : 180 + ((r() * 30) | 0)) * (s ? 1.4 : 1);
      const st = bias.map((b) => Math.round(28 * (s ? 1.4 : 1) + ((total - 112 * (s ? 1.4 : 1)) * b) / sum));
      const id = dex.length, status = pick(r, ['Hard Stare', 'Brace', 'Rumble', 'Puff Up']);
      dex.push({
        id, name: s ? base.replace(/[nkxl]$/, '') + pick(r, EVO) : base, type, stage: s,
        base: { hp: st[0] + 12, atk: st[1], def: st[2], spd: st[3] },
        learn: [[1, r() < 0.5 ? 'Bump' : 'Nip'], [3, status], [5, TYPE_MOVES[type][0]], [11, TYPE_MOVES[type][1]]],
        evolve: s === 0 && stages > 1 ? { to: id + 1, level: starter ? 12 : 10 + ((r() * 3) | 0) } : null,
        exp: s ? 110 : 56, rate: starter ? 50 : s ? 100 : 180, look: { ...lk, stage: s }, starter: !!starter,
      });
    }
  };
  for (const t of ['LEAF', 'FIRE', 'WATER']) line(t, 2, true);
  const pool = ['EARTH', 'WIND', 'SPARK', pick(r, TYPES), pick(r, TYPES), pick(r, TYPES)];
  for (let i = pool.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (let i = 0; i < 3; i++) line(pool[i], 2, false);
  for (let i = 3; i < 6; i++) line(pool[i], 1, false);
  const wild = dex.filter((d) => !d.starter && d.stage === 0).map((d) => d.id);
  return { seed: seedStr, list: dex, starters: [0, 2, 4], wild };
}

// ------------------------------------------------------------------ sprites
const N = 56;
function buf() { return new Uint8Array(N * N); }
function ell(b, cx, cy, rx, ry, code) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(N - 1, Math.ceil(cy + ry)); y++)
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(N - 1, Math.ceil(cx + rx)); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) b[y * N + x] = code;
}
function tri(b, x1, y1, x2, y2, x3, y3, code) {
  const minx = Math.max(0, Math.floor(Math.min(x1, x2, x3))), maxx = Math.min(N - 1, Math.ceil(Math.max(x1, x2, x3)));
  const miny = Math.max(0, Math.floor(Math.min(y1, y2, y3))), maxy = Math.min(N - 1, Math.ceil(Math.max(y1, y2, y3)));
  const sg = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const d1 = sg(x, y, x1, y1, x2, y2), d2 = sg(x, y, x2, y2, x3, y3), d3 = sg(x, y, x3, y3, x1, y1);
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) b[y * N + x] = code;
  }
}
function box(b, x, y, w, h, code) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < N && j < N) b[j * N + i] = code; }

// codes: 1 main  2 belly  3 accent  4 eye-white  5 dark detail  6 second accent
function drawLing(sp, back) {
  const b = buf(), L = sp.look, s = L.stage ? 1.18 : 1, t = sp.type;
  let hx, hy, hr, bx, by;
  if (L.body === 'round') { bx = 28; by = 33; ell(b, bx, by, 15 * s, 14 * s, 1); hx = 28; hy = 30; hr = 14 * s; }
  else if (L.body === 'tall') { bx = 28; by = 39; ell(b, bx, by, 11 * s, 11 * s, 1); hx = 28; hy = 22; hr = 11 * s; ell(b, hx, hy, 12 * s, 11 * s, 1); }
  else { bx = 31; by = 37; ell(b, bx, by, 16 * s, 10 * s, 1); hx = 17; hy = 29; hr = 9 * s; ell(b, hx, hy, 10 * s, 9 * s, 1); }
  const top = hy - (L.body === 'round' ? 14 * s : hr);
  // tail (drawn on the right, behind the body silhouette)
  const tx = bx + (L.body === 'long' ? 16 : 13) * s, ty = by + 2;
  if (L.tail === 'curl') { ell(b, tx + 4, ty - 4, 6, 6, 1); ell(b, tx + 4, ty - 4, 2.5, 2.5, 0); box(b, tx - 2, ty - 1, 6, 4, 1); }
  else if (L.tail === 'tuft') { box(b, tx - 3, ty - 2, 8, 3, 1); ell(b, tx + 7, ty - 3, 4.5, 4.5, 3); }
  else if (L.tail === 'fin') tri(b, tx - 4, ty + 4, tx + 9, ty - 9, tx + 9, ty + 6, 3);
  // feet
  ell(b, bx - 7 * s, by + (L.body === 'long' ? 9 : 12) * s, 4.5, 3, 1); ell(b, bx + 7 * s, by + (L.body === 'long' ? 9 : 12) * s, 4.5, 3, 1);
  // wings
  if (L.wings) { ell(b, bx - 15 * s, by - 6, 6, 9, 3); ell(b, bx + 15 * s, by - 6, 6, 9, 3); }
  // ears / horns
  const ex = L.body === 'long' ? 5 : 8 * s;
  if (L.ear === 'point') { tri(b, hx - ex - 4, top + 6, hx - ex, top - 8, hx - ex + 5, top + 5, 1); tri(b, hx + ex - 5, top + 5, hx + ex, top - 8, hx + ex + 4, top + 6, 1); }
  else if (L.ear === 'round') { ell(b, hx - ex, top + 1, 5, 5, 1); ell(b, hx + ex, top + 1, 5, 5, 1); if (!back) { ell(b, hx - ex, top + 1, 2.5, 2.5, 3); ell(b, hx + ex, top + 1, 2.5, 2.5, 3); } }
  else if (L.ear === 'long') { ell(b, hx - ex, top - 4, 3.5, 10, 1); ell(b, hx + ex, top - 4, 3.5, 10, 1); }
  else if (L.ear === 'horn') tri(b, hx - 3, top + 3, hx, top - 9, hx + 3, top + 3, 6);
  if (L.stage) { tri(b, hx - ex - 9, top + 12, hx - ex - 6, top + 2, hx - ex - 2, top + 10, 3); tri(b, hx + ex + 2, top + 10, hx + ex + 6, top + 2, hx + ex + 9, top + 12, 3); }
  // type emblem
  if (t === 'LEAF') { box(b, hx, top - 5, 1, 6, 5); ell(b, hx + 5, top - 7, 6, 3, 6); }
  else if (t === 'FIRE') { tri(b, hx - 5, top + 3, hx - 1, top - 9, hx + 2, top + 3, 3); tri(b, hx - 1, top + 3, hx + 3, top - 6, hx + 6, top + 3, 3); }
  else if (t === 'WATER') tri(b, hx - 4, top + 3, hx + 1, top - 10, hx + 5, top + 3, 6);
  else if (t === 'EARTH') { for (let i = 0; i < 3; i++) box(b, bx + 2 + i * 5, by - 12 * s + i * 3 - (L.body === 'long' ? -3 : 0), 4, 4, 6); }
  else if (t === 'WIND') { ell(b, hx - hr - 1, hy + 3, 3.5, 3.5, 6); ell(b, hx + hr + 1, hy + 3, 3.5, 3.5, 6); }
  else if (t === 'SPARK') { box(b, hx - 5, top - 6, 1, 8, 5); box(b, hx + 4, top - 6, 1, 8, 5); ell(b, hx - 5, top - 8, 2.5, 2.5, 3); ell(b, hx + 4, top - 8, 2.5, 2.5, 3); }
  // markings
  if (L.mark === 'stripe') for (let i = 0; i < 3; i++) box(b, bx + 5 * s, by - 5 + i * 5, 7, 2, 5);
  if (L.mark === 'spot') { ell(b, bx + 8 * s, by - 3, 2, 2, 5); ell(b, bx + 4 * s, by + 5, 1.6, 1.6, 5); ell(b, bx - 9 * s, by + 2, 1.6, 1.6, 5); }
  if (!back) {
    if (L.belly) ell(b, bx - (L.body === 'long' ? 2 : 0), by + 5 * s, 8 * s, 6 * s, 2);
    // face
    const fy = L.body === 'round' ? hy - 3 : hy;
    const eye = (x) => {
      if (L.eye === 'dot') box(b, x, fy, 2, 4, 5);
      else { box(b, x - 1, fy - 1, 4, 6, 4); box(b, x, fy, 2, 4, 5); b[fy * N + x] = 4; }
      if (L.eye === 'fierce') { box(b, x - 2, fy - 3, 5, 1, 5); }
    };
    if (L.body === 'long') { eye(hx - 4); box(b, hx - 8, hy + 4, 4, 1, 5); }
    else { eye(hx - 6); eye(hx + 4); box(b, hx - 2, fy + 7, 4, 1, 5); b[(fy + 6) * N + hx - 3] = 5; b[(fy + 6) * N + hx + 2] = 5; }
  }
  return b;
}

const cache = {};
export function lingSprite(sp, back = false) {
  const key = sp.id + (back ? 'b' : 'f') + sp.name;
  if (cache[key]) return cache[key];
  const b = drawLing(sp, back), [c, g] = canvas(N, N);
  const [m, d, l, a] = TYPE_COL[sp.type];
  const col = { 1: [m, d, l], 2: ['#f8f0d8', '#d8c8a8', '#f8f0d8'], 3: [a, a, a], 4: ['#f8f8f8', '#f8f8f8', '#f8f8f8'], 5: ['#30303c', '#30303c', '#30303c'], 6: [d, d, m] };
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : b[y * N + x]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = at(x, y);
    let c2;
    if (!v) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) c2 = '#30303c'; else continue; }
    else c2 = col[v][!at(x + 2, y + 2) || !at(x + 1, y + 2) ? 1 : !at(x - 2, y - 2) ? 2 : 0];
    g.fillStyle = c2; g.fillRect(back ? N - 1 - x : x, y, 1, 1);
  }
  return (cache[key] = c);
}
// Small overworld icon: the front sprite at 3/7 size.
export function lingIcon(sp) {
  const key = 'i' + sp.id + sp.name;
  if (cache[key]) return cache[key];
  const [c, g] = canvas(24, 24);
  g.imageSmoothingEnabled = false; g.drawImage(lingSprite(sp), 0, 0, N, N, 0, 0, 24, 24);
  return (cache[key] = c);
}

// ------------------------------------------------------------------ instances
export function makeMon(dex, id, level) {
  const sp = dex.list[id];
  const m = { id, level, xp: level ** 3, moves: sp.learn.filter(([lv]) => lv <= level).map(([, n]) => n).slice(-4), stage: { atk: 0, def: 0 } };
  calc(dex, m); m.hp = m.max;
  return m;
}
export function calc(dex, m) {
  const b = dex.list[m.id].base, L = m.level;
  m.max = Math.floor((b.hp * 2 * L) / 50) + L + 10;
  m.atk = Math.floor((b.atk * 2 * L) / 50) + 5; m.def = Math.floor((b.def * 2 * L) / 50) + 5; m.spd = Math.floor((b.spd * 2 * L) / 50) + 5;
}
