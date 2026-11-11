// Everything the player owns and has done. One object so saving is a single JSON dump later.
import { makeDex } from './gen.js';
export const G = {
  seed: 'LONGJIE-38', dex: null, party: [], home: [], bag: { lantern: 0, pear: 0 }, flags: {}, seen: new Set(), caught: new Set(),
};
export function newGame(seed) {
  G.seed = seed || G.seed; G.dex = makeDex(G.seed);
  G.party = []; G.home = []; G.bag = { lantern: 0, pear: 0 }; G.flags = {}; G.seen = new Set(); G.caught = new Set();
}
export const sp = (m) => G.dex.list[m.id];
export const nm = (m) => sp(m).name.toUpperCase();
export function healAll() { for (const m of G.party) { m.hp = m.max; m.dhp = m.max; m.stage = { atk: 0, def: 0 }; } }

// ---- saving (browser localStorage; the game still runs if storage is unavailable)
const KEY = 'longjie-save-v1';
export function save(pos) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, seed: G.seed, party: G.party, home: G.home, bag: G.bag, flags: G.flags, seen: [...G.seen], caught: [...G.caught], pos })); } catch (e) { /* storage blocked */ }
}
export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d || d.v !== 1) return null;
    newGame(d.seed);
    G.party = d.party; G.home = d.home; G.bag = d.bag; G.flags = d.flags; G.seen = new Set(d.seen); G.caught = new Set(d.caught);
    return d.pos;
  } catch (e) { return null; }
}
