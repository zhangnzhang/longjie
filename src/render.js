// All artwork. Ground is painted once per map into a big canvas; props and characters are
// small canvases that the engine y-sorts every frame.
// Style: bright flat colours, bold dark outlines, chunky shapes, in the manner of
// early-2000s handheld RPGs. Every tile here is original and drawn by code.
import { T, canvas, rng, rect, px, art, speck, disc } from './gfx.js';

const C = {
  grass: '#70c860', grassD: '#58b050', grassL: '#90dc80',
  dirt: '#ecdca8', dirtD: '#d4c088', rim: '#b8a468',
  stone: '#c4c8d0', stoneD: '#9ca0b0', stoneL: '#dcdfe6',
  water: '#58a0f0', waterD: '#3878d0', waterL: '#a8d8f8',
  soil: '#b08858', soilD: '#906c40',
  sand: '#f4e4b4', sandD: '#e0cc98',
  out: '#30303c',
};
const GRASSY = new Set(['.', ',', 'G', 'T']);

// ------------------------------------------------------------------ ground
function grass(g, X, Y) {
  rect(g, X, Y, T, T, C.grass);
  px(g, X + 3, Y + 4, C.grassL); px(g, X + 4, Y + 3, C.grassL); px(g, X + 5, Y + 4, C.grassL);
  px(g, X + 11, Y + 12, C.grassD); px(g, X + 12, Y + 11, C.grassD); px(g, X + 13, Y + 12, C.grassD);
}

// Clean rim where a path or pavement meets grass, with rounded outer corners.
function edges(g, X, Y, at, rim) {
  const n = GRASSY.has(at(0, -1)), s = GRASSY.has(at(0, 1)), w = GRASSY.has(at(-1, 0)), e = GRASSY.has(at(1, 0));
  if (n) rect(g, X, Y, T, 1, rim); if (s) rect(g, X, Y + 15, T, 1, rim);
  if (w) rect(g, X, Y, 1, T, rim); if (e) rect(g, X + 15, Y, 1, T, rim);
  const corner = (cx, cy, sx, sy) => {
    rect(g, X + cx, Y + cy, 1, 1, C.grass); rect(g, X + cx + sx, Y + cy, 1, 1, C.grass); rect(g, X + cx, Y + cy + sy, 1, 1, C.grass);
    px(g, X + cx + sx, Y + cy + sy, rim); px(g, X + cx + 2 * sx, Y + cy, rim); px(g, X + cx, Y + cy + 2 * sy, rim);
  };
  if (n && w) corner(0, 0, 1, 1); if (n && e) corner(15, 0, -1, 1);
  if (s && w) corner(0, 15, 1, -1); if (s && e) corner(15, 15, -1, -1);
}

function paintCell(g, m, x, y, r) {
  const ch = m.g[y][x], X = x * T, Y = y * T;
  const at = (dx, dy) => (m.g[y + dy] && m.g[y + dy][x + dx]) || ch;
  switch (ch) {
    case '.': case 'T': case 'G': grass(g, X, Y); break;
    case ',': {
      grass(g, X, Y);
      const cols = ['#f8f8f0', '#f8d848', '#f890b8'];
      for (const [fx, fy] of [[4, 10], [11, 5]]) {
        const c = cols[(r() * 3) | 0], ax = X + fx, ay = Y + fy;
        px(g, ax, ay - 1, c); px(g, ax - 1, ay, c); px(g, ax + 1, ay, c); px(g, ax, ay + 1, c); px(g, ax, ay, '#f0a030');
      }
      break;
    }
    case 'p': case 'y': {
      const [b, d] = ch === 'p' ? [C.dirt, C.dirtD] : [C.sand, C.sandD];
      rect(g, X, Y, T, T, b);
      px(g, X + 4, Y + 5, d); px(g, X + 5, Y + 5, d); px(g, X + 11, Y + 11, d); px(g, X + 12, Y + 11, d);
      if (r() < 0.3) px(g, X + 9, Y + 3, d);
      edges(g, X, Y, at, C.rim);
      break;
    }
    case 's': {
      rect(g, X, Y, T, T, C.stone);
      rect(g, X, Y, T, 1, C.stoneL); rect(g, X, Y + 8, T, 1, C.stoneL);
      rect(g, X, Y + 7, T, 1, C.stoneD); rect(g, X, Y + 15, T, 1, C.stoneD);
      rect(g, X + 15, Y, 1, 7, C.stoneD); rect(g, X + 7, Y + 8, 1, 7, C.stoneD);
      edges(g, X, Y, at, '#8c90a0');
      break;
    }
    case 'w': {
      rect(g, X, Y, T, T, C.water);
      const land = (dx, dy) => at(dx, dy) !== 'w' && at(dx, dy) !== 'b';
      if (land(0, -1)) { rect(g, X, Y, T, 2, '#8c7450'); rect(g, X, Y + 2, T, 2, C.waterD); }
      if (land(-1, 0)) rect(g, X, Y, 1, T, C.waterD);
      if (land(1, 0)) rect(g, X + 15, Y, 1, T, C.waterD);
      if (land(0, 1)) rect(g, X, Y + 15, T, 1, C.waterD);
      break;
    }
    case 'b': {
      rect(g, X, Y, T, T, '#c89858');
      for (let j = 3; j < T; j += 4) rect(g, X, Y + j, T, 1, '#986c38');
      if (at(-1, 0) === 'w') { rect(g, X, Y, 2, T, '#684420'); rect(g, X + 2, Y, 1, T, '#e8c080'); }
      if (at(1, 0) === 'w') { rect(g, X + 14, Y, 2, T, '#684420'); rect(g, X + 13, Y, 1, T, '#e8c080'); }
      if (at(0, -1) === 'w') rect(g, X, Y, T, 2, '#684420');
      if (at(0, 1) === 'w') rect(g, X, Y + 14, T, 2, '#684420');
      break;
    }
    case 'c': case 'f': {
      rect(g, X, Y, T, T, C.soil);
      for (let j = 0; j < T; j += 8) rect(g, X, Y + j + 6, T, 2, C.soilD);
      const fc = ['#f878a8', '#f8d848', '#f8f8f0', '#f06050'][(y * 7 + ((x / 3) | 0)) % 4];
      for (let j = 0; j < T; j += 8) for (let i = 1; i < T; i += 4) {
        const ox = X + i, oy = Y + j + 1;
        rect(g, ox, oy + 1, 2, 4, '#389848'); px(g, ox - 1, oy + 2, '#58c060'); px(g, ox + 2, oy + 2, '#58c060');
        if (ch === 'f') rect(g, ox, oy, 2, 2, fc); else px(g, ox, oy, '#58c060');
      }
      break;
    }
    case 'o': {
      rect(g, X, Y, T, T, '#d8a868');
      rect(g, X, Y + 7, T, 1, '#b88848'); rect(g, X, Y + 15, T, 1, '#b88848');
      rect(g, X + (y % 2 ? 4 : 11), Y, 1, 7, '#b88848'); rect(g, X + (y % 2 ? 12 : 3), Y + 8, 1, 7, '#b88848');
      break;
    }
    case 't': {
      rect(g, X, Y, T, T, (x + y) % 2 ? '#f0ece0' : '#dcd8cc');
      rect(g, X, Y + 15, T, 1, '#b8b4a4'); rect(g, X + 15, Y, 1, T, '#b8b4a4');
      break;
    }
    case 'm': {
      rect(g, X, Y, T, T, '#d8a868');
      rect(g, X + 1, Y + 3, 14, 11, '#b83838'); rect(g, X + 2, Y + 4, 12, 9, '#e05848');
      rect(g, X + 4, Y + 6, 8, 5, '#f8d058'); rect(g, X + 5, Y + 7, 6, 3, '#e05848');
      break;
    }
    case '#': {
      rect(g, X, Y, T, T, '#f8f0d8');
      if (at(0, 1) === '#') { rect(g, X, Y, T, 3, '#584850'); rect(g, X, Y + 3, T, 1, '#988070'); }
      else { rect(g, X, Y + 11, T, 5, '#a87848'); rect(g, X, Y + 11, T, 1, '#7c5430'); rect(g, X, Y + 15, T, 1, C.out); }
      break;
    }
    default: rect(g, X, Y, T, T, '#181420');
  }
}

export function paintGround(m) {
  const [c, g] = canvas(m.w * T, m.h * T);
  const r = rng(m.seed);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) paintCell(g, m, x, y, r);
  return c;
}

// Animated overlays (drawn by the engine on top of the static ground).
export function makeAnimTiles() {
  const frames = { w: [], G: [] };
  for (let f = 0; f < 4; f++) {
    const [c, g] = canvas(T, T);
    const o = f * 2;
    for (const [x, y] of [[2, 6], [9, 11]]) { rect(g, (x + o) % 12, y, 4, 1, C.waterL); rect(g, (x + o + 1) % 13, y + 1, 2, 1, C.waterL); }
    frames.w.push(c);
  }
  for (let f = 0; f < 2; f++) frames.G.push(tallGrass(f));
  return frames;
}

function tallGrass(f) {
  const [c, g] = canvas(T, T);
  // two rows of chunky tufts with a dark base line
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const x = i * 8 + (j ? 4 : 0), y = j * 8, s = f && (i + j) % 2 ? 1 : 0;
    const P = (dx, dy, col) => px(g, (x + dx + 16) % 16, y + dy, col);
    for (const [dx, h] of [[1, 5], [2, 6], [3, 7], [4, 6], [5, 5]]) for (let k = 0; k < h; k++) P(dx, 7 - k, '#389848');
    P(0 + s, 3, '#389848'); P(6 - s, 3, '#389848'); P(3, 0 + s, '#389848');
    P(2, 3, '#60c868'); P(3, 2, '#60c868'); P(4, 4, '#60c868'); P(1, 5, '#60c868');
    for (let dx = 0; dx < 7; dx++) P(dx, 7, '#287038');
  }
  return c;
}

// ------------------------------------------------------------------ props
// Every prop returns { cv, ox, oy }: a canvas and its pixel offset from the prop's top-left tile.
const ROOFS = { // base, band shadow, highlight, outline
  gray: ['#788498', '#5c6880', '#a0acc0', '#30303c'],
  red: ['#e06850', '#b84838', '#f89878', '#30303c'],
  blue: ['#5890d8', '#4070b8', '#88b8f0', '#30303c'],
};

// A roof seen from above and in front: narrower at the ridge, bands of tile, bold outline.
function roofBand(g, x, y, w, h, pal) {
  const [b, d, l, o] = pal, slope = Math.min(6, w >> 3);
  for (let j = 0; j < h; j++) {
    const inset = Math.round(slope * (1 - j / (h - 1))), x0 = x + inset, ww = w - inset * 2;
    const band = j % 6;
    rect(g, x0, y + j, ww, 1, j < 3 ? l : band === 5 ? d : band === 0 ? l : b);
    if (j >= 3 && band !== 5 && band !== 0) for (let i = x0 + 3 + ((j / 6) | 0) % 2 * 4; i < x0 + ww - 2; i += 8) px(g, i, y + j, d);
    px(g, x0, y + j, o); px(g, x0 + ww - 1, y + j, o);
  }
  const top = slope;
  rect(g, x + top, y, w - top * 2, 1, o); rect(g, x + top, y + 3, w - top * 2, 1, d);
  rect(g, x - 1, y + h - 2, w + 2, 2, o); rect(g, x, y + h - 3, w, 1, d);
}

function windowAt(g, x, y, lit) {
  rect(g, x, y, 12, 11, C.out); rect(g, x + 1, y + 1, 10, 9, '#f8f8f8');
  rect(g, x + 2, y + 2, 8, 7, lit ? '#f8d868' : '#70b8f0');
  if (!lit) { rect(g, x + 2, y + 2, 3, 2, '#c0e4f8'); }
  rect(g, x + 5, y + 2, 2, 7, '#f8f8f8'); rect(g, x + 2, y + 5, 8, 1, '#f8f8f8');
}

function building(b) {
  const W = b.w * T, H = b.h * T, top = 12;
  const [c, g] = canvas(W + 4, H + top);
  const ox = 2, wallH = 28, bot = H + top, wallY = bot - wallH, pal = ROOFS[b.roof];
  const tower = b.style === 'tower';
  // wall: whitewash over a stone footing, bold outline
  rect(g, ox, wallY, W, wallH, C.out);
  rect(g, ox + 1, wallY, W - 2, wallH - 1, tower ? '#d84838' : '#fcf4e4');
  rect(g, ox + 1, bot - 7, W - 2, 6, '#b4b0a8'); rect(g, ox + 1, bot - 7, W - 2, 1, '#8c8880');
  for (let i = ox + 8; i < ox + W - 2; i += 8) rect(g, i, bot - 6, 1, 5, '#8c8880');
  rect(g, ox + 1, wallY, 2, wallH - 7, '#a86838'); rect(g, ox + W - 3, wallY, 2, wallH - 7, '#a86838');
  if (tower) {
    const rh = wallY - top + 4, mid = Math.floor(rh * 0.4);
    roofBand(g, ox + 22, top, W - 44, mid, pal);
    rect(g, ox + 28, top + mid, W - 56, 12, C.out); rect(g, ox + 29, top + mid, W - 58, 12, '#d84838');
    for (let i = ox + 33; i < ox + W - 44; i += 14) windowAt(g, i, top + mid + 1, true);
    roofBand(g, ox, top + mid + 11, W, rh - mid - 11, pal);
  } else {
    roofBand(g, ox, top, W, wallY - top + 4, pal);
  }
  rect(g, ox + 3, wallY + 4, W - 6, 2, tower ? '#a83028' : '#dcd0b8'); // shadow under the eave
  for (let i = 0; i < b.w; i++) {
    if (i === b.door || (b.style === 'shop' && Math.abs(i - b.door) === 1)) continue;
    if (b.w > 6 && i % 2 === b.door % 2) continue;
    windowAt(g, ox + i * T + 2, wallY + 8, false);
  }
  const dx = ox + b.door * T, dy = bot - 20;
  if (b.style === 'shop') {
    rect(g, dx - 15, dy - 8, 46, 28, C.out);
    rect(g, dx - 14, dy - 7, 44, 7, '#f8d048');
    for (let i = 0; i < 5; i++) rect(g, dx - 10 + i * 8, dy - 5, 5, 3, '#e04838');
    rect(g, dx - 14, dy + 1, 44, 18, '#484058');
    for (let i = -14; i < 30; i += 6) rect(g, dx + i, dy + 1, 3, 4, (i + 14) % 12 ? '#f8f8f0' : '#e04838');
    rect(g, dx - 12, dy + 9, 10, 10, '#c89858'); rect(g, dx - 11, dy + 7, 8, 3, '#f8a830'); rect(g, dx - 12, dy + 9, 10, 1, '#986c38');
    rect(g, dx + 18, dy + 9, 10, 10, '#c89858'); rect(g, dx + 19, dy + 7, 8, 3, '#60c060'); rect(g, dx + 18, dy + 9, 10, 1, '#986c38');
    rect(g, dx + 2, dy + 3, 12, 16, '#282030');
  } else {
    const big = b.style === 'school' || tower;
    const x0 = big ? dx - 3 : dx + 2, w = big ? 22 : 12, col = tower ? '#983028' : big ? '#d05840' : '#a86838';
    rect(g, x0 - 1, dy, w + 2, 20, C.out); rect(g, x0, dy + 1, w, 18, col);
    rect(g, x0, dy + 1, w, 2, '#00000028'); rect(g, x0 + (w >> 1), dy + 1, 1, 18, C.out);
    rect(g, x0 + 1, dy + 4, (w >> 1) - 2, 1, '#ffffff40'); rect(g, x0 + (w >> 1) + 2, dy + 4, (w >> 1) - 3, 1, '#ffffff40');
    px(g, x0 + (w >> 1) - 2, dy + 11, '#f8d048'); px(g, x0 + (w >> 1) + 2, dy + 11, '#f8d048');
    if (big) { rect(g, x0 + 1, dy - 7, w - 2, 6, C.out); rect(g, x0 + 2, dy - 6, w - 4, 4, tower ? '#3858a8' : '#f8f8f0'); for (let i = 0; i < w - 8; i += 3) px(g, x0 + 4 + i, dy - 4, tower ? '#f8d048' : '#d05840'); }
    if (b.style === 'old') { rect(g, x0 - 2, dy - 5, w + 4, 4, C.out); rect(g, x0 - 1, dy - 4, w + 2, 2, '#584840'); for (let i = 2; i < w - 1; i += 3) px(g, x0 + i, dy - 3, '#f8d048'); }
    if (b.couplet) {
      rect(g, x0 - 4, dy + 3, 2, 13, '#e83830'); rect(g, x0 + w + 2, dy + 3, 2, 13, '#e83830'); rect(g, x0 + 2, dy - 3, w - 4, 2, '#e83830');
      for (let j = 0; j < 4; j++) { px(g, x0 - 4 + (j % 2), dy + 4 + j * 3, '#f8d048'); px(g, x0 + w + 2 + (j % 2), dy + 5 + j * 3, '#f8d048'); }
      rect(g, x0 + 2, dy + 6, 3, 3, '#e83830'); rect(g, x0 + w - 5, dy + 6, 3, 3, '#e83830');
    }
  }
  return { cv: c, ox: -2, oy: -top };
}

// Big round tree; neighbours overlap so a row of them reads as a wall of forest.
function tree(seed) {
  const [c, g] = canvas(24, 34);
  rect(g, 8, 24, 8, 10, C.out); rect(g, 9, 24, 6, 9, '#a87040'); rect(g, 9, 24, 2, 9, '#805028'); rect(g, 13, 26, 1, 6, '#c89058');
  disc(g, 12, 13, 11, 12, '#204830');
  disc(g, 12, 13, 10, 11, '#309048');
  disc(g, 10, 10, 8, 8, '#48b058');
  disc(g, 8, 7, 4, 3, '#78d070');
  // leaf scallops along the shaded side
  for (const [x, y] of [[15, 16], [11, 19], [18, 11], [6, 17], [14, 6]]) { rect(g, x, y, 3, 1, '#247838'); px(g, x + 1, y + 1, '#247838'); }
  for (const [x, y] of [[6, 11], [11, 4], [4, 8]]) { rect(g, x, y, 2, 1, '#a0e890'); }
  return { cv: c, ox: -4, oy: -18 };
}

const STALL_GOODS = {
  pear: ['#c8d848', '#e8f070'], flower: ['#f070a0', '#f8d040'], jelly: ['#f0d060', '#f8f0b0'],
  candy: ['#e84838', '#f8b030'], cloth: ['#4880c8', '#c85898'], veg: ['#58a848', '#f0f0e0'],
};
function stall(p, open) {
  const [c, g] = canvas(32, 30); const r = rng(p.x * 7 + p.y);
  rect(g, 1, 4, 2, 26, '#7c5430'); rect(g, 29, 4, 2, 26, '#7c5430');
  rect(g, 0, 18, 32, 3, '#b88850'); rect(g, 0, 21, 32, 1, '#7c5430'); rect(g, 3, 22, 26, 6, '#946838');
  rect(g, 3, 27, 26, 1, '#583818');
  if (!open) return { cv: c, ox: 0, oy: -14 };
  const stripe = [['#d84840', '#f4f0e4'], ['#3c78c0', '#f4f0e4'], ['#48a058', '#f4f0e4'], ['#e8a030', '#f4f0e4']][(p.x + p.y) % 4];
  for (let i = 0; i < 32; i += 4) { rect(g, i, 1, 4, 8, stripe[(i >> 2) % 2]); rect(g, i + 1, 9, 2, 1, stripe[(i >> 2) % 2]); }
  rect(g, 0, 0, 32, 1, C.out); rect(g, 0, 8, 32, 1, '#00000030');
  const [a, b] = STALL_GOODS[p.goods] || STALL_GOODS.veg;
  if (p.goods === 'cloth') { for (let i = 0; i < 5; i++) rect(g, 3 + i * 5, 13, 4, 5, i % 2 ? a : b); }
  else if (p.goods === 'candy') { for (let i = 0; i < 6; i++) { rect(g, 4 + i * 4, 10, 1, 8, '#c8a878'); rect(g, 3 + i * 4, 10, 3, 3, i % 2 ? a : b); } }
  else for (let i = 0; i < 12; i++) { const x = 3 + ((r() * 24) | 0), y = 14 + ((r() * 3) | 0); rect(g, x, y, 3, 3, i % 3 ? a : b); px(g, x, y, '#ffffffa0'); }
  rect(g, 3, 22, 26, 6, stripe[0]); rect(g, 3, 22, 26, 1, '#00000030');
  return { cv: c, ox: 0, oy: -14 };
}

function simple(w, h, ox, oy, draw) { const [c, g] = canvas(w, h); draw(g); return { cv: c, ox, oy }; }

const PROPS = {
  sign: () => simple(16, 16, 0, 0, (g) => { rect(g, 7, 9, 2, 7, '#7c5430'); rect(g, 1, 2, 14, 9, '#5c3c20'); rect(g, 2, 3, 12, 7, '#c89858'); rect(g, 4, 5, 8, 1, '#5c3c20'); rect(g, 4, 7, 6, 1, '#5c3c20'); }),
  flagpole: () => simple(16, 48, 0, -32, (g) => { rect(g, 7, 2, 2, 44, '#c8c8d0'); rect(g, 8, 2, 1, 44, '#888898'); rect(g, 5, 44, 6, 3, '#888898'); px(g, 7, 1, '#f0c848'); px(g, 8, 1, '#f0c848'); rect(g, 9, 3, 7, 6, '#e03828'); px(g, 10, 4, '#f8d848'); px(g, 11, 5, '#f8d848'); }),
  well: () => simple(16, 22, 0, -6, (g) => { rect(g, 1, 0, 2, 16, '#7c5430'); rect(g, 13, 0, 2, 16, '#7c5430'); rect(g, 0, 0, 16, 2, '#946838'); rect(g, 7, 2, 1, 7, '#d8d0b8'); rect(g, 6, 9, 3, 3, '#946838'); rect(g, 1, 12, 14, 9, '#a09c90'); rect(g, 1, 12, 14, 2, '#c8c4b8'); rect(g, 3, 14, 10, 3, '#283848'); rect(g, 1, 20, 14, 1, C.out); for (let i = 4; i < 14; i += 5) rect(g, i, 17, 1, 3, '#807c70'); }),
  pole: () => simple(16, 44, 0, -28, (g) => { rect(g, 7, 2, 2, 42, '#6c4c30'); rect(g, 8, 2, 1, 42, '#4c3420'); rect(g, 2, 5, 12, 2, '#6c4c30'); px(g, 3, 4, '#d0d0d8'); px(g, 12, 4, '#d0d0d8'); px(g, 7, 1, '#d0d0d8'); }),
  bench: () => simple(16, 16, 0, 0, (g) => { rect(g, 1, 6, 14, 4, '#b0aca0'); rect(g, 1, 6, 14, 1, '#d0ccc0'); rect(g, 2, 10, 3, 5, '#888478'); rect(g, 11, 10, 3, 5, '#888478'); rect(g, 5, 7, 6, 2, '#888478'); px(g, 6, 7, '#f0f0e8'); px(g, 9, 8, '#282028'); }),
  crate: (p) => simple(16, 18, 0, -2, (g) => { rect(g, 1, 6, 14, 11, '#a87848'); rect(g, 1, 6, 14, 1, '#7c5430'); rect(g, 1, 16, 14, 1, '#583818'); rect(g, 7, 7, 1, 9, '#7c5430'); const cl = (p.x % 2) ? ['#58a848', '#70c058'] : ['#e8a030', '#f8c850']; for (let i = 0; i < 4; i++) { rect(g, 2 + i * 3, 3, 3, 3, cl[i % 2]); } }),
  bigtree: () => simple(56, 64, -12, -48, (g) => {
    const r = rng(77);
    rect(g, 22, 38, 12, 26, '#6c4828'); rect(g, 22, 38, 3, 26, '#4c3018'); rect(g, 30, 44, 2, 20, '#8a6038'); rect(g, 18, 60, 20, 4, '#6c4828'); rect(g, 18, 62, 3, 2, '#4c3018');
    disc(g, 28, 24, 27, 23, '#24543a'); disc(g, 28, 22, 25, 21, '#347c44');
    disc(g, 17, 14, 11, 9, '#4c9c50'); disc(g, 36, 18, 12, 9, '#449048'); disc(g, 24, 30, 10, 7, '#3c8848');
    speck(g, r, 8, 6, 20, 14, 26, '#78c468'); speck(g, r, 26, 10, 22, 16, 18, '#68b45c'); speck(g, r, 8, 26, 40, 14, 30, '#24543a');
  }),
  pavilion: () => simple(52, 50, -2, -18, (g) => {
    rect(g, 4, 40, 44, 10, '#b8b4a8'); rect(g, 4, 40, 44, 2, '#d0ccc0'); rect(g, 4, 49, 44, 1, C.out);
    for (const x of [7, 19, 30, 42]) { rect(g, x, 18, 3, 24, '#b83830'); rect(g, x, 18, 1, 24, '#8c2820'); }
    rect(g, 7, 36, 38, 2, '#8c2820');
    roofBand(g, 2, 6, 48, 14, ROOFS.gray, rng(5));
    rect(g, 18, 1, 16, 5, '#5c6474'); rect(g, 24, 0, 4, 2, '#f0c848');
  }),
  // ---- interior furniture
  bed: () => simple(16, 32, 0, 0, (g) => { rect(g, 0, 0, 16, 32, '#7c5430'); rect(g, 1, 1, 14, 30, '#f0ece0'); rect(g, 2, 2, 12, 6, '#fff'); rect(g, 2, 7, 12, 1, '#c8c4b8'); rect(g, 1, 10, 14, 20, '#d84848'); for (let j = 12; j < 28; j += 6) for (let i = 3; i < 14; i += 6) { rect(g, i, j, 3, 3, '#f8a0b8'); px(g, i + 1, j + 1, '#f8e060'); px(g, i + 3, j + 3, '#48a058'); } rect(g, 0, 31, 16, 1, '#4c3018'); }),
  tv: () => simple(16, 22, 0, -6, (g) => { rect(g, 0, 12, 16, 10, '#8a5c30'); rect(g, 0, 12, 16, 1, '#b08050'); rect(g, 7, 14, 1, 7, '#583818'); rect(g, 1, 1, 14, 11, '#484450'); rect(g, 2, 2, 9, 9, '#90b8c8'); rect(g, 3, 3, 3, 2, '#d0e8f0'); px(g, 13, 3, '#e8e0d0'); px(g, 13, 6, '#e8e0d0'); px(g, 12, 9, '#c83830'); rect(g, 4, 0, 1, 1, '#888'); rect(g, 9, 0, 1, 1, '#888'); }),
  cupboard: () => simple(16, 26, 0, -10, (g) => { rect(g, 0, 0, 16, 26, '#8a5c30'); rect(g, 1, 1, 14, 11, '#c0d8e0'); rect(g, 7, 1, 2, 11, '#8a5c30'); rect(g, 2, 7, 4, 4, '#f0f0e8'); rect(g, 10, 6, 4, 5, '#4880c8'); rect(g, 1, 13, 14, 12, '#a87848'); rect(g, 7, 13, 2, 12, '#7c5430'); px(g, 5, 19, '#f0c848'); px(g, 10, 19, '#f0c848'); rect(g, 0, 25, 16, 1, '#4c3018'); }),
  stove: () => simple(16, 22, 0, -6, (g) => { rect(g, 0, 6, 16, 16, '#a09c90'); rect(g, 0, 6, 16, 2, '#c8c4b8'); rect(g, 5, 14, 6, 7, '#282028'); rect(g, 6, 17, 4, 3, '#f08030'); px(g, 7, 16, '#f8d048'); rect(g, 3, 2, 10, 5, '#383840'); rect(g, 2, 2, 12, 1, '#585860'); rect(g, 7, 0, 2, 2, '#585860'); rect(g, 0, 21, 16, 1, C.out); }),
  table: () => simple(32, 20, 0, -4, (g) => { rect(g, 0, 2, 32, 10, '#b88850'); rect(g, 0, 2, 32, 2, '#d0a468'); rect(g, 0, 12, 32, 2, '#7c5430'); rect(g, 2, 14, 3, 6, '#7c5430'); rect(g, 27, 14, 3, 6, '#7c5430'); rect(g, 6, 4, 6, 5, '#f0f0e8'); rect(g, 7, 5, 4, 3, '#e8a030'); rect(g, 18, 5, 5, 4, '#4880c8'); rect(g, 25, 4, 3, 5, '#f0f0e8'); }),
  plant: () => simple(16, 24, 0, -8, (g) => { disc(g, 8, 8, 6, 7, '#347c44'); disc(g, 6, 6, 3, 3, '#58a858'); rect(g, 7, 12, 2, 5, '#285c38'); rect(g, 4, 16, 8, 7, '#b85838'); rect(g, 3, 16, 10, 2, '#d07850'); rect(g, 4, 22, 8, 1, C.out); }),
  shelf: (p) => simple(32, 28, 0, -12, (g) => { const r = rng(p.x * 9 + p.y); rect(g, 0, 0, 32, 28, '#8a5c30'); for (let j = 0; j < 3; j++) { rect(g, 1, 1 + j * 9, 30, 7, '#4c3420'); for (let i = 0; i < 7; i++) { const h = 4 + ((r() * 3) | 0); rect(g, 2 + i * 4, 1 + j * 9 + 7 - h, 3, h, ['#e84838', '#f0c040', '#4880c8', '#58a848', '#f0f0e8', '#e88830'][(r() * 6) | 0]); } } rect(g, 0, 27, 32, 1, '#4c3018'); }),
  counter: () => simple(16, 20, 0, -4, (g) => { rect(g, 0, 0, 16, 20, '#a87848'); rect(g, 0, 0, 16, 5, '#d0a468'); rect(g, 0, 5, 16, 1, '#7c5430'); rect(g, 3, 8, 10, 9, '#946838'); rect(g, 0, 19, 16, 1, '#4c3018'); }),
  desk: () => simple(16, 18, 0, -2, (g) => { rect(g, 1, 2, 14, 8, '#b88850'); rect(g, 1, 2, 14, 1, '#d0a468'); rect(g, 1, 10, 14, 1, '#7c5430'); rect(g, 2, 11, 2, 7, '#7c5430'); rect(g, 12, 11, 2, 7, '#7c5430'); rect(g, 4, 4, 5, 4, '#f0f0e8'); rect(g, 10, 5, 3, 1, '#e84838'); }),
  tdesk: () => simple(16, 20, 0, -4, (g) => { rect(g, 0, 2, 16, 18, '#8a5c30'); rect(g, 0, 2, 16, 4, '#b08050'); rect(g, 3, 0, 6, 3, '#f0f0e8'); rect(g, 3, 1, 6, 1, '#c8c4b8'); rect(g, 11, 1, 2, 3, '#e84838'); rect(g, 3, 9, 10, 8, '#7c5430'); rect(g, 0, 19, 16, 1, '#4c3018'); }),
  blackboard: (p) => simple(p.w * 16, 14, 0, 0, (g) => { const W = p.w * 16; rect(g, 0, 0, W, 14, '#8a5c30'); rect(g, 2, 2, W - 4, 9, '#2c5840'); const r = rng(9); for (let j = 0; j < 3; j++) for (let i = 6; i < W - 10; i += 3) if (r() < 0.6) px(g, i, 4 + j * 2, '#d8e8d8'); rect(g, 4, 11, W - 8, 1, '#d0a468'); rect(g, 8, 11, 3, 1, '#fff'); }),
  window: () => simple(16, 14, 0, 1, (g) => { rect(g, 2, 0, 12, 12, '#8a5c30'); rect(g, 3, 1, 10, 10, '#a8d8f0'); rect(g, 7, 1, 2, 10, '#8a5c30'); rect(g, 3, 5, 10, 1, '#8a5c30'); rect(g, 4, 2, 2, 2, '#e0f4ff'); rect(g, 1, 12, 14, 2, '#b08050'); }),
  poster: () => simple(16, 14, 0, 1, (g) => { rect(g, 3, 0, 10, 12, '#d83830'); rect(g, 4, 1, 8, 10, '#e85040'); rect(g, 6, 3, 4, 1, '#f8d048'); rect(g, 7, 2, 2, 7, '#f8d048'); rect(g, 5, 6, 6, 1, '#f8d048'); rect(g, 6, 8, 4, 1, '#f8d048'); }),
  scroll: () => simple(16, 14, 0, 0, (g) => { rect(g, 4, 0, 8, 14, '#f0e8d0'); rect(g, 3, 0, 10, 1, '#5c3c20'); rect(g, 3, 13, 10, 1, '#5c3c20'); for (let j = 2; j < 12; j += 2) { px(g, 6, j, '#302830'); px(g, 9, j + 1, '#302830'); px(g, 7, j, '#302830'); } }),
  notice: () => simple(32, 13, 0, 1, (g) => { rect(g, 1, 0, 30, 12, '#8a5c30'); rect(g, 2, 1, 28, 10, '#4c7858'); rect(g, 4, 2, 7, 6, '#f0f0e8'); rect(g, 13, 3, 6, 7, '#f8e8a0'); rect(g, 21, 2, 7, 5, '#f0c0c0'); px(g, 7, 2, '#e84838'); px(g, 16, 3, '#e84838'); px(g, 24, 2, '#e84838'); }),
  case: () => simple(16, 22, 0, -6, (g) => { rect(g, 0, 8, 16, 14, '#7c5430'); rect(g, 0, 21, 16, 1, '#4c3018'); rect(g, 0, 0, 16, 9, '#c0d8e0'); rect(g, 0, 0, 16, 1, '#7c5430'); rect(g, 0, 0, 1, 9, '#7c5430'); rect(g, 15, 0, 1, 9, '#7c5430'); rect(g, 4, 4, 4, 4, '#f0c848'); rect(g, 10, 3, 3, 5, '#f0e8d0'); px(g, 2, 2, '#fff'); px(g, 3, 1, '#fff'); }),
  note: () => simple(1, 1, 0, 0, () => {}),
};

export function makeProp(p, market) {
  if (p.type === 'building') return building(p);
  if (p.type === 'stall') return stall(p, market);
  return (PROPS[p.type] || PROPS.sign)(p);
}
export const makeTree = (x, y) => tree(x * 31 + y * 57);

// ------------------------------------------------------------------ characters
// 16x24 sprites: a big head and a small body. o outline, h hair, s skin, e eye,
// c top, r collar/scarf, d trousers, k shoes.
const DOWN = [
  '....oooooooo....', '...ohhhhhhhho...', '..ohhhhhhhhhho..', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.',
  '.ohhhsssssshhho.', '.ohhsssssssshho.', '.ohssessssessho.', '.ohssessssessho.', '..osssssssssso..', '..oossssssssoo..',
  '...orrrrrrrro...', '..occcrrrrccco..', '.osccccrrccccso.', '.osccccccccccso.', '.osccccccccccso.', '..occcccccccco..',
  '..oddddddddddo..', '..oddddddddddo..', '..odddd..ddddo..', '..odddo..odddo..', '..okkko..okkko..', '..oooo....oooo..'];
const UP = [
  '....oooooooo....', '...ohhhhhhhho...', '..ohhhhhhhhhho..', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.',
  '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '..ohhhhhhhhhho..', '..oohhhhhhhhoo..',
  '...orrrrrrrro...', '..occcccccccco..', '.osccccccccccso.', '.osccccccccccso.', '.osccccccccccso.', '..occcccccccco..',
  '..oddddddddddo..', '..oddddddddddo..', '..odddd..ddddo..', '..odddo..odddo..', '..okkko..okkko..', '..oooo....oooo..'];
const SIDE = [ // facing left
  '....oooooooo....', '...ohhhhhhhho...', '..ohhhhhhhhhho..', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.', '.ohhhhhhhhhhhho.',
  '.osshhhhhhhhhho.', '.ossshhhhhhhhho.', '.oesssshhhhhhho.', '.oesssshhhhhhho.', '..osssssshhhho..', '..oosssssshoo...',
  '...orrrrrrro....', '...orrccccco....', '...occcssccco...', '...occcssccco...', '...occccccco....', '...occccccco....',
  '...oddddddo.....', '...oddddddo.....', '...oddddddo.....', '....odddo.......', '....okkko.......', '....ooooo.......'];
const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));
const STEP = ['..odddd..ddddo..', '..odddo..okkko..', '..okkko..oooo...', '..oooo..........'];
const SIDESTEP = ['..odddoodddo....', '..odddo.odddo...', '.okkko...okkko..', '.oooo....ooooo..'];
const HAT = ['................', '.....oooooo.....', '...ooyyyyyyoo...', '.ooyyyyyyyyyyoo.', 'oyyyyyyyyyyyyyyo', 'oooooooooooooooo'];

const LOOKS = {
  hero: { h: '#303040', c: '#f8f8f8', r: '#f04030', d: '#4068c0', k: '#f8f8f8' },
  kid: { h: '#503828', c: '#60b0f0', r: '#f8f8f8', d: '#485068', k: '#585060' },
  kid2: { h: '#303040', c: '#f8d040', r: '#f04030', d: '#508850', k: '#585060' },
  girl: { h: '#603820', c: '#f888a8', r: '#f8f8f8', d: '#b85080', k: '#d84038' },
  mom: { h: '#483028', c: '#f0b0c8', r: '#f8f0e0', d: '#806898', k: '#585060' },
  aunt: { h: '#383038', c: '#78c898', r: '#f8f0e0', d: '#505870', k: '#585060' },
  uncle: { h: '#383038', c: '#98a8b8', r: '#788898', d: '#485068', k: '#484050' },
  teacher: { h: '#383038', c: '#f8f8f8', r: '#4068c0', d: '#485068', k: '#484050' },
  teacher2: { h: '#685848', c: '#b0c0e0', r: '#f8f8f8', d: '#685858', k: '#484050' },
  elder: { h: '#d8d8d8', c: '#687090', r: '#586080', d: '#484860', k: '#484050' },
  granny: { h: '#e8e8e8', c: '#9868b0', r: '#d0a8e0', d: '#484860', k: '#484050' },
  clerk: { h: '#483028', c: '#f05848', r: '#f8d048', d: '#485068', k: '#484050' },
  farmer: { h: '#483028', c: '#b09868', r: '#988050', d: '#686050', k: '#584838', hat: true },
  fisher: { h: '#483028', c: '#689880', r: '#588870', d: '#505870', k: '#484050', hat: true },
  vendor: { h: '#483028', c: '#e09850', r: '#f8f8f8', d: '#505870', k: '#484050', hat: true },
  master: { h: '#e8e8e8', c: '#a83838', r: '#f8d048', d: '#582828', k: '#383038' },
  vendor2: { h: '#383038', c: '#5090d0', r: '#f8f8f8', d: '#405068', k: '#484050' },
};

function frame(rows, pal, hat) {
  const [c, g] = canvas(16, 24);
  art(g, 0, 0, hat ? HAT.concat(rows.slice(6)) : rows, pal);
  return c;
}

const cache = {};
// Returns { down:[stand,a,b], up:[...], left:[...], right:[...] }
export function charFrames(look) {
  if (cache[look]) return cache[look];
  const L = LOOKS[look] || LOOKS.kid;
  const pal = { o: C.out, s: '#f8d8b0', e: '#303040', y: '#f0d890', ...L };
  const set = (base, a, b) => [base, base.slice(0, 20).concat(a), base.slice(0, 20).concat(b)].map((r) => frame(r, pal, L.hat));
  const R = mirror(SIDE);
  return (cache[look] = {
    down: set(DOWN, STEP, mirror(STEP)), up: set(UP, STEP, mirror(STEP)),
    left: set(SIDE, SIDESTEP, SIDE.slice(20)), right: set(R, mirror(SIDESTEP), R.slice(20)),
  });
}
