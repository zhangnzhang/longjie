// Small drawing helpers shared by all art modules. Everything in the game is drawn by code.
export const T = 16;

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// Deterministic RNG (mulberry32) so the world looks identical on every load.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
export function px(g, x, y, col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }

// Draw string art: each row is a string, each char looks up a color in `pal` ('.' = transparent).
export function art(g, x, y, rows, pal, flip = false) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + (flip ? row.length - 1 - i : i), y + j, 1, 1);
    }
  }
}

// Speckle a rectangle with n random pixels of a color.
export function speck(g, r, x, y, w, h, n, col) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) g.fillRect(x + ((r() * w) | 0), y + ((r() * h) | 0), 1, 1);
}

export function disc(g, cx, cy, rx, ry, col) {
  g.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}
