// Chiptune music and sound effects, synthesised with Web Audio. No audio files.
// Melodies are original and written in pentatonic scales to suit the setting.
let ac = null, master = null, bus = null, timer = null, current = null, muted = false;

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(n) { // "A4", "C#5"
  const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) return 0;
  return 440 * 2 ** ((SEMI[m[1]] + (m[2] ? 1 : 0) - 9 + (m[3] - 4) * 12) / 12);
}
// "E5:2 G5:2 -:1" -> [[freq, beats]...]; beats are in eighth notes
const seq = (s) => s.trim().split(/\s+/).map((x) => { const [n, b] = x.split(':'); return [n === '-' ? 0 : freq(n), +b || 1]; });

const TRACKS = {
  town: { bpm: 104, lead: 'E5:2 G5:2 A5:2 G5:1 E5:1 D5:2 E5:1 D5:1 C5:4 A4:2 C5:2 D5:2 E5:1 D5:1 C5:2 A4:2 G4:4 E5:2 G5:2 A5:2 C6:2 A5:2 G5:1 E5:1 D5:4 C5:2 D5:1 E5:1 G5:2 E5:2 D5:2 C5:2 C5:4',
    bass: 'C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 C3:2 G3:2 A2:2 E3:2 A2:2 E3:2 G2:2 D3:2 G2:2 D3:2 C3:2 G3:2 C3:2 G3:2 G2:2 D3:2 G2:2 D3:2 A2:2 E3:2 A2:2 E3:2 C3:2 G3:2 C3:4' },
  route: { bpm: 132, lead: 'D5:1 E5:1 G5:2 E5:1 D5:1 B4:2 A4:1 B4:1 D5:2 B4:2 A4:2 G4:1 A4:1 B4:2 D5:2 E5:2 D5:4 B4:2 D5:2 E5:1 G5:1 A5:2 G5:1 E5:1 D5:2 E5:2 D5:2 B4:2 A4:2 G4:1 B4:1 D5:2 E5:2 D5:2 G5:6 -:2',
    bass: 'G2:1 D3:1 G2:1 D3:1 G2:1 D3:1 G2:1 D3:1 D3:1 A3:1 D3:1 A3:1 D3:1 A3:1 D3:1 A3:1 E3:1 B3:1 E3:1 B3:1 E3:1 B3:1 E3:1 B3:1 G2:1 D3:1 G2:1 D3:1 G2:1 D3:1 G2:1 D3:1 C3:1 G3:1 C3:1 G3:1 C3:1 G3:1 C3:1 G3:1 E3:1 B3:1 E3:1 B3:1 D3:1 A3:1 D3:1 A3:1 G2:1 D3:1 G2:1 D3:1 D3:1 A3:1 D3:1 A3:1 G2:1 D3:1 G2:1 D3:1 G2:2 -:2' },
  home: { bpm: 84, type: 'triangle', lead: 'G4:2 A4:2 C5:4 A4:2 G4:2 E4:4 G4:2 A4:2 C5:2 D5:2 C5:4 -:4 E5:2 D5:2 C5:4 A4:2 C5:2 G4:4 A4:2 G4:2 E4:2 D4:2 C4:4 -:4',
    bass: 'C3:4 G3:4 A2:4 E3:4 F2:4 C3:4 G2:4 D3:4 C3:4 G3:4 A2:4 E3:4 F2:4 G2:4 C3:4 -:4' },
  battle: { bpm: 168, lead: 'A4:1 A4:1 C5:1 A4:1 D5:1 A4:1 E5:1 D5:1 C5:1 C5:1 E5:1 C5:1 G5:1 E5:1 D5:1 C5:1 A4:1 A4:1 C5:1 A4:1 D5:1 A4:1 E5:1 G5:1 A5:2 G5:1 E5:1 D5:1 C5:1 D5:2 E5:1 E5:1 G5:1 E5:1 A5:1 E5:1 G5:1 E5:1 D5:1 D5:1 E5:1 D5:1 G5:1 D5:1 E5:1 D5:1 C5:1 C5:1 D5:1 C5:1 E5:1 C5:1 D5:1 C5:1 A4:2 C5:1 D5:1 E5:2 -:2',
    bass: 'A2:1 A2:1 A3:1 A2:1 A2:1 A2:1 A3:1 A2:1 F2:1 F2:1 F3:1 F2:1 F2:1 F2:1 F3:1 F2:1 A2:1 A2:1 A3:1 A2:1 A2:1 A2:1 A3:1 A2:1 G2:1 G2:1 G3:1 G2:1 G2:1 G2:1 G3:1 G2:1 C3:1 C3:1 C4:1 C3:1 C3:1 C3:1 C4:1 C3:1 G2:1 G2:1 G3:1 G2:1 G2:1 G2:1 G3:1 G2:1 F2:1 F2:1 F3:1 F2:1 G2:1 G2:1 G3:1 G2:1 A2:1 A2:1 A3:1 A2:1 A2:2 -:2' },
};
for (const k in TRACKS) { TRACKS[k].lead = seq(TRACKS[k].lead); TRACKS[k].bass = seq(TRACKS[k].bass); }

export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    if (current) { const c = current; current = null; music(c); }
  } catch (e) { ac = null; }
}

function tone(dest, f, t, dur, type, vol) {
  if (!f) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.03)); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}

function schedule(tr, start) {
  const beat = 30 / tr.bpm; // one eighth note
  let t = start; for (const [f, b] of tr.lead) { tone(bus, f, t, b * beat * 0.92, tr.type || 'square', 0.09); t += b * beat; }
  const end = t;
  t = start; for (const [f, b] of tr.bass) { tone(bus, f, t, b * beat * 0.9, 'triangle', 0.16); t += b * beat; }
  return Math.max(end, t);
}

export function music(name) {
  if (name === current) return;
  current = name;
  if (!ac) return;
  if (timer) { clearTimeout(timer); timer = null; }
  if (bus) { const old = bus; old.gain.setValueAtTime(old.gain.value, ac.currentTime); old.gain.linearRampToValueAtTime(0, ac.currentTime + 0.15); setTimeout(() => old.disconnect(), 400); bus = null; }
  const tr = TRACKS[name]; if (!tr) return;
  bus = ac.createGain(); bus.gain.value = 1; bus.connect(master);
  const mine = bus;
  const loop = (start) => {
    if (bus !== mine) return;
    const end = schedule(tr, start);
    timer = setTimeout(() => loop(end), Math.max(0, (end - ac.currentTime - 0.25) * 1000));
  };
  loop(ac.currentTime + 0.2);
}

const SFX = {
  blip: [['square', 880, 0, 0.04, 0.07]],
  select: [['square', 660, 0, 0.05, 0.08], ['square', 990, 0.05, 0.07, 0.08]],
  bump: [['triangle', 110, 0, 0.08, 0.2]],
  door: [['square', 330, 0, 0.06, 0.07], ['square', 247, 0.06, 0.1, 0.07]],
  hit: [['sawtooth', 220, 0, 0.05, 0.12], ['sawtooth', 110, 0.05, 0.1, 0.12]],
  faint: [['square', 440, 0, 0.1, 0.08], ['square', 330, 0.1, 0.1, 0.08], ['square', 220, 0.2, 0.2, 0.08]],
  alert: [['square', 988, 0, 0.08, 0.1], ['square', 1319, 0.1, 0.18, 0.1]],
  level: [['square', 523, 0, 0.09, 0.09], ['square', 659, 0.09, 0.09, 0.09], ['square', 784, 0.18, 0.09, 0.09], ['square', 1047, 0.27, 0.25, 0.09]],
  catch: [['square', 659, 0, 0.1, 0.09], ['square', 784, 0.1, 0.1, 0.09], ['square', 1047, 0.2, 0.1, 0.09], ['square', 1319, 0.3, 0.3, 0.09]],
  heal: [['triangle', 523, 0, 0.12, 0.18], ['triangle', 659, 0.12, 0.12, 0.18], ['triangle', 784, 0.24, 0.12, 0.18], ['triangle', 1047, 0.36, 0.3, 0.18]],
  lantern: [['triangle', 330, 0, 0.08, 0.15], ['triangle', 494, 0.08, 0.16, 0.15]],
};
export function sfx(name) {
  if (!ac || muted) return;
  for (const [type, f, at, dur, vol] of SFX[name] || []) tone(master, f, ac.currentTime + at, dur, type, vol);
}
export function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; }
