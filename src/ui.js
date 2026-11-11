// Screen, bitmap text, boxes and keyboard input shared by the overworld and battles.
import { canvas, rect } from './gfx.js';
import { FONT } from './font.js';

export const VW = 240, VH = 160;
export const screen = document.getElementById('game');
export const ctx = screen.getContext('2d');
ctx.imageSmoothingEnabled = false;

const glyphs = {};
function glyph(ch, col) {
  const key = ch + col;
  if (glyphs[key]) return glyphs[key];
  const [c, g] = canvas(8, 8);
  const i = ch.charCodeAt(0) - 32;
  if (i >= 0 && i < 95) {
    g.fillStyle = col;
    for (let y = 0; y < 8; y++) {
      const b = parseInt(FONT.substr(i * 16 + y * 2, 2), 16);
      for (let x = 0; x < 8; x++) if (b & (0x80 >> x)) g.fillRect(x, y, 1, 1);
    }
  }
  return (glyphs[key] = c);
}
export function text(s, x, y, col = '#30303c', scale = 1) {
  s = String(s);
  for (let i = 0; i < s.length; i++) ctx.drawImage(glyph(s[i], col), x + i * 8 * scale, y, 8 * scale, 8 * scale);
}
export function wrap(s, n) {
  const out = []; let line = '';
  for (const w of s.split(' ')) {
    if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}
export function box(x, y, w, h, accent = '#e05848') {
  rect(ctx, x, y, w, h, '#30303c'); rect(ctx, x + 1, y + 1, w - 2, h - 2, '#f8f8f0');
  rect(ctx, x + 2, y + 2, w - 4, h - 4, accent); rect(ctx, x + 3, y + 3, w - 6, h - 6, '#f8f8f0');
}
export function cursor(x, y) { rect(ctx, x, y, 1, 7, '#30303c'); rect(ctx, x + 1, y + 1, 1, 5, '#30303c'); rect(ctx, x + 2, y + 2, 1, 3, '#30303c'); rect(ctx, x + 3, y + 3, 1, 1, '#30303c'); }

// ---- input
export const keys = {}; const pressed = {};
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
  z: 'A', ' ': 'A', x: 'B', Shift: 'B', Escape: 'B', Enter: 'S', m: 'M', n: 'N' };
export const typing = { on: false, buf: [] };
addEventListener('keydown', (e) => {
  if (typing.on) {
    if (e.key === 'Enter') { pressed.S = true; e.preventDefault(); }
    else if (e.key === 'Escape') { pressed.B = true; }
    else if (e.key === 'Backspace') { typing.buf.push('\b'); e.preventDefault(); }
    else if (e.key === 'Tab') { typing.buf.push('\t'); e.preventDefault(); }
    else if (/^[a-zA-Z0-9-]$/.test(e.key)) { typing.buf.push(e.key.toUpperCase()); e.preventDefault(); }
    return;
  }
  const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
  if (!k) return;
  e.preventDefault();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
export const hit = (k) => { const v = pressed[k]; pressed[k] = false; return v; };
export const clearPressed = () => { for (const k in pressed) pressed[k] = false; };
export const press = (k) => { pressed[k] = true; };

// A typewriter message: returns helpers used by both dialogue and battle text.
export function drawLines(lines, n, x, y) {
  let left = n;
  lines.forEach((l, i) => { text(l.slice(0, Math.max(0, left)), x, y + i * 12); left -= l.length; });
  return left >= 0;
}
