// World data. Pure data + a tiny map-building DSL, no drawing, so it can be tested in Node.
// Outdoor layouts follow the real geography around Longjie (Chenggong, Kunming):
// Santai Hill to the north, the canal cutting through town, the old street running
// north-south, Gucheng to the west.
//
// Ground characters:
//  . grass   , flowers   p dirt path   s stone paving   w water   b bridge
//  G tall grass   T tree   c crop rows   f flower rows   y packed sand
//  o wood floor   t tiled floor   # interior wall   m exit mat   (space) void

export const SOLID_GROUND = new Set(['w', 'T', 'c', 'f', '#', ' ']);

export const MAPS = {};

function newMap(id, name, w, h, fill, opts = {}) {
  const m = {
    id, name, w, h, indoor: !!opts.indoor,
    g: Array.from({ length: h }, () => Array(w).fill(fill)),
    props: [], npcs: [], warps: [], seed: opts.seed || id.length * 7919,
    set(x, y, ch) { if (x >= 0 && y >= 0 && x < w && y < h) this.g[y][x] = ch; },
    fill(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch); },
    ellipse(cx, cy, rx, ry, ch, only) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!only || only.includes(this.g[y][x]))) this.g[y][x] = ch;
      }
    },
    prop(type, x, y, o = {}) { this.props.push({ type, x, y, w: 1, h: 1, ...o }); return this; },
    npc(o) { this.npcs.push({ dir: 'down', look: 'kid', ...o }); return this; },
    warp(x, y, to, tx, ty, dir) { this.warps.push({ x, y, to, tx, ty, dir }); return this; },
    // A building: roof rows on top, two rows of wall, a door on the bottom row.
    building(o) {
      const b = { type: 'building', roof: 'gray', door: 1, ...o };
      this.props.push(b);
      if (b.to) this.warp(b.x + b.door, b.y + b.h - 1, b.to, MAPS[b.to].entry[0], MAPS[b.to].entry[1], 'up');
      return this;
    },
  };
  MAPS[id] = m;
  return m;
}

// Interior room: two wall rows, a floor, an exit mat on the bottom row.
function room(id, name, w, h, floor, exitTo, ex, ey) {
  const m = newMap(id, name, w, h, floor, { indoor: true });
  m.fill(0, 0, w - 1, 1, '#');
  const mx = (w / 2) | 0;
  m.set(mx, h - 1, 'm');
  m.entry = [mx, h - 2];
  m.warp(mx, h - 1, exitTo, ex, ey, 'down');
  return m;
}

// ---------------------------------------------------------------- interiors
{
  const m = room('home', 'HOME', 11, 9, 'o', 'longjie', 36, 27);
  m.prop('window', 2, 1).prop('poster', 5, 1).prop('window', 8, 1);
  m.prop('bed', 1, 2, { h: 2 }).prop('tv', 3, 2).prop('cupboard', 8, 2).prop('stove', 9, 2);
  m.prop('table', 4, 5, { w: 2 }).prop('plant', 9, 7);
  m.npc({ x: 7, y: 4, look: 'mom', dir: 'left', id: 'mom',
    text: ['Up already? Your teacher at Longjie Primary was asking for you.', 'Go on. And do not dawdle on the street!'],
    mtext: ['It is market day! The whole county is out on our street.', 'Stay close, and do not spend everything on candy.'] });
  m.prop('note', 3, 2, { solid: false, text: ['The old TV. It only gets two channels, and one of them is snow.'] });
}
{
  const m = room('school', 'LONGJIE PRIMARY', 15, 10, 'o', 'longjie', 40, 20);
  m.prop('window', 1, 1).prop('blackboard', 5, 1, { w: 5 }).prop('window', 13, 1);
  m.prop('tdesk', 7, 3, { text: ['A stack of homework. Somebody drew a dragon on theirs.'] });
  for (const y of [5, 7]) for (const x of [2, 4, 10, 12]) m.prop('desk', x, y);
  m.npc({ x: 7, y: 2, look: 'teacher', id: 'teacher', text: ['Ah, there you are.', 'I am waiting on a delivery from the hill station. Three very lively guests.', 'Come back soon. I will need a brave helper.'] });
  m.npc({ x: 3, y: 5, look: 'kid2', dir: 'up', text: ['Shh! I am pretending to read.'] });
  m.npc({ x: 11, y: 7, look: 'girl', dir: 'up', text: ['After class we are racing to the top of Santai Hill. You in?'] });
}
{
  const m = room('market', 'JINLONG MARKET', 13, 9, 't', 'longjie', 44, 27);
  m.prop('counter', 1, 3).prop('counter', 2, 3).prop('counter', 3, 3).prop('counter', 4, 3);
  m.prop('shelf', 7, 2, { w: 2 }).prop('shelf', 10, 2, { w: 2 });
  m.prop('shelf', 7, 5, { w: 2 }).prop('shelf', 10, 5, { w: 2 });
  m.prop('crate', 1, 7).prop('crate', 2, 7).prop('poster', 2, 1);
  m.npc({ x: 2, y: 2, look: 'clerk', id: 'clerk1', text: ['Welcome to Jinlong Market!', 'Shelves are full, but the till is broken today. Come back another time.'] });
  m.npc({ x: 9, y: 4, look: 'aunt', dir: 'up', text: ['Soy sauce, salt, matches... what was the fourth thing?'] });
}
{
  const m = room('yizhong', 'CHENGGONG NO.1 MIDDLE SCHOOL', 15, 10, 't', 'longjie', 22, 27);
  m.prop('notice', 3, 1, { w: 2 }).prop('window', 7, 1).prop('notice', 10, 1, { w: 2 });
  m.prop('case', 2, 3).prop('case', 3, 3).prop('case', 11, 3).prop('case', 12, 3);
  m.prop('plant', 1, 8).prop('plant', 13, 8);
  m.npc({ x: 7, y: 3, look: 'teacher2', text: ['This is Chenggong No.1 Middle School.', 'The big kids train upstairs. They say nobody from the primary school has ever beaten them.', 'Maybe one day, hm?'] });
  m.npc({ x: 11, y: 6, look: 'kid2', dir: 'left', text: ['I heard the upstairs champion keeps a partner that breathes sparks.'] });
  m.prop('note', 2, 3, { solid: false, text: ['Trophies. Most of them are for running.'] });
}
{
  const m = room('guju', "ZHANG TIANXU'S OLD HOME", 13, 9, 'o', 'longjie', 37, 37);
  m.prop('scroll', 3, 1).prop('window', 6, 1).prop('scroll', 9, 1);
  m.prop('case', 2, 3).prop('case', 4, 3).prop('case', 8, 3).prop('case', 10, 3);
  m.prop('table', 5, 5, { w: 2 }).prop('plant', 11, 7);
  m.npc({ x: 9, y: 6, look: 'elder', dir: 'left', text: ['This was the home of Zhang Tianxu, a writer who grew up on this very street.', 'Look with your eyes, not with your hands.'] });
  m.prop('note', 2, 3, { solid: false, text: ['Old letters under glass. The handwriting is tiny and very neat.'] });
}
{
  const m = room('house1', 'HOUSE', 11, 8, 'o', 'longjie', 10, 36);
  m.prop('window', 2, 1).prop('poster', 8, 1);
  m.prop('bed', 1, 2, { h: 2 }).prop('cupboard', 9, 2).prop('table', 4, 4, { w: 2 }).prop('stove', 8, 2);
  m.npc({ x: 6, y: 3, look: 'granny', text: ['Sit, sit. Have you eaten?', 'On market days I sell pea jelly by the old tree. Come find me.'] });
}
{
  const m = room('house2', 'HOUSE', 11, 8, 'o', 'longjie', 49, 36);
  m.prop('window', 5, 1).prop('scroll', 8, 1);
  m.prop('tv', 2, 2).prop('cupboard', 9, 2).prop('table', 4, 5, { w: 2 }).prop('plant', 1, 6);
  m.npc({ x: 3, y: 4, look: 'uncle', dir: 'up', text: ['Quiet, the match is on.', 'The pond out back is full of something lately. It is not fish.'] });
}
{
  const m = room('ghouse', 'HOUSE', 11, 8, 'o', 'gucheng', 10, 15);
  m.prop('window', 3, 1).prop('scroll', 7, 1);
  m.prop('bed', 9, 2, { h: 2 }).prop('table', 3, 4, { w: 2 }).prop('cupboard', 1, 2);
  m.npc({ x: 6, y: 4, look: 'elder', id: 'healer', text: ['You walked here from Longjie? On your own?', 'Kuige Hall has stood at the top of our street longer than anyone remembers.'] });
}
{
  const m = room('gshop', 'GUCHENG STORE', 13, 9, 't', 'gucheng', 30, 15);
  m.prop('counter', 8, 3).prop('counter', 9, 3).prop('counter', 10, 3).prop('counter', 11, 3);
  m.prop('shelf', 1, 2, { w: 2 }).prop('shelf', 4, 2, { w: 2 }).prop('shelf', 1, 5, { w: 2 }).prop('shelf', 4, 5, { w: 2 });
  m.prop('crate', 11, 7);
  m.npc({ x: 10, y: 2, look: 'clerk', id: 'clerk2', text: ['Travelling? You will want supplies before Kuige Hall.'] });
}

{
  const m = room('kuige', 'KUIGE HALL', 13, 12, 'o', 'gucheng', 21, 10);
  m.prop('scroll', 2, 1).prop('scroll', 4, 1).prop('window', 6, 1).prop('scroll', 8, 1).prop('scroll', 10, 1);
  m.prop('case', 1, 4).prop('case', 11, 4).prop('plant', 1, 10).prop('plant', 11, 10).prop('case', 1, 8).prop('case', 11, 8);
  m.npc({ x: 3, y: 8, look: 'kid2', dir: 'right', text: ['Halt! Nobody reaches the Master without getting past me.'],
    trainer: { name: 'STUDENT ZHOU', team: [['w', 2, 7]], win: ['Tch. The Master will not go so easy on you.'], after: ['Go on, then. Do not keep the Master waiting.'] } });
  m.npc({ x: 9, y: 5, look: 'girl', dir: 'left', text: ['I have studied here three years. Show me what a Longjie kid can do!'],
    trainer: { name: 'STUDENT LIN', team: [['w', 5, 7], ['w', 4, 8]], win: ['You fight like the market crowd. Loud and all at once.'], after: ['The Master is just ahead. Breathe first.'] } });
  m.npc({ x: 6, y: 2, look: 'master', dir: 'down', id: 'master', text: ['So. The child who calmed the market.', 'Kuige Hall has tested the young of this valley for longer than the street has had stones.', 'Show me the bond between you and your Lings.'],
    trainer: { name: 'MASTER KUI', sight: false, team: [['w', 5, 7], ['w', 2, 8], ['e', 0, 9]], win: ['Hah! Splendid. I have not been beaten so soundly in years.'], after: ['The seal is yours. Carry it well.'] } });
}

// ---------------------------------------------------------------- Longjie Town
{
  const m = newMap('longjie', 'LONGJIE TOWN', 64, 52, '.', { seed: 38 });
  // forest edges; Santai Hill rises to the north
  m.fill(0, 0, 63, 4, 'T'); m.fill(0, 48, 63, 51, 'T'); m.fill(0, 0, 1, 51, 'T'); m.fill(62, 0, 63, 51, 'T');
  // meadows north of the canal
  m.fill(8, 6, 20, 8, 'G'); m.fill(40, 5, 52, 6, 'G'); m.fill(52, 23, 59, 27, 'G');
  // the canal runs from the north-east down to the south-west
  for (let x = 2; x <= 61; x++) { const yc = Math.round(9 + ((61 - x) * 9) / 59); m.set(x, yc, 'w'); m.set(x, yc + 1, 'w'); }
  // fields in the south-west
  m.fill(4, 39, 13, 42, 'c'); m.fill(15, 39, 24, 42, 'f'); m.fill(4, 44, 13, 47, 'f'); m.fill(15, 44, 24, 47, 'c');
  m.fill(4, 43, 26, 43, 'p'); m.fill(14, 38, 14, 47, 'p'); m.fill(25, 39, 26, 47, 'p');
  // the pond in the south-east, ringed with reeds
  m.ellipse(50, 43, 10, 5.2, 'G', ['.']); m.ellipse(50, 43, 7, 3.4, 'w');
  // Longjie main street (north-south) and the cross lane (east-west)
  m.fill(31, 0, 32, 47, 's'); m.fill(31, 13, 32, 15, 'b');
  m.fill(0, 29, 61, 30, 's');
  // back lanes
  m.fill(4, 37, 26, 37, 'p'); m.fill(33, 38, 56, 38, 'p'); m.fill(49, 39, 49, 39, 'p');
  m.fill(10, 36, 10, 36, 'p'); m.fill(16, 36, 16, 36, 'p'); m.fill(49, 36, 49, 37, 'p'); m.fill(37, 37, 37, 37, 'p');
  // market square at the south end of the street
  m.fill(27, 39, 36, 47, 's');
  // school yard, home path, shop path, No.1 Middle School sports ground
  m.fill(33, 20, 46, 21, 'y'); m.fill(33, 27, 36, 28, 'p'); m.fill(44, 27, 44, 28, 'p'); m.fill(52, 21, 52, 28, 'p');
  m.fill(4, 21, 15, 27, 'y'); m.fill(22, 27, 23, 28, 's');
  // buildings
  m.building({ x: 36, y: 15, w: 9, h: 5, roof: 'red', door: 4, style: 'school', to: 'school' });
  m.building({ x: 35, y: 23, w: 4, h: 4, roof: 'gray', door: 1, couplet: true, to: 'home' });
  m.building({ x: 42, y: 23, w: 6, h: 4, roof: 'gray', door: 2, style: 'shop', to: 'market' });
  m.building({ x: 17, y: 21, w: 11, h: 6, roof: 'blue', door: 5, style: 'school', to: 'yizhong' });
  m.building({ x: 35, y: 33, w: 6, h: 4, roof: 'gray', door: 2, style: 'old', to: 'guju' });
  m.building({ x: 8, y: 32, w: 5, h: 4, roof: 'gray', door: 2, couplet: true, to: 'house1' });
  m.building({ x: 47, y: 32, w: 5, h: 4, roof: 'gray', door: 2, couplet: true, to: 'house2' });
  m.building({ x: 50, y: 17, w: 5, h: 4, roof: 'gray', door: 2, locked: true });
  m.building({ x: 14, y: 32, w: 5, h: 4, roof: 'gray', door: 2, couplet: true, locked: true });
  // more of the old street's houses
  m.building({ x: 27, y: 17, w: 4, h: 4, roof: 'gray', door: 1, couplet: true, locked: true });
  m.building({ x: 20, y: 32, w: 5, h: 4, roof: 'gray', door: 2, locked: true });
  m.building({ x: 54, y: 32, w: 5, h: 4, roof: 'gray', door: 2, couplet: true, locked: true });
  m.building({ x: 56, y: 14, w: 5, h: 4, roof: 'gray', door: 2, locked: true });
  m.fill(22, 36, 22, 36, 'p'); m.fill(56, 36, 56, 37, 'p'); m.fill(58, 18, 58, 28, 'p');
  // street furniture
  m.prop('flagpole', 43, 20).prop('flagpole', 16, 27);
  m.prop('bigtree', 28, 32, { w: 2 }).prop('bench', 27, 33).prop('well', 34, 32);
  m.prop('pole', 30, 8).prop('pole', 30, 22).prop('pole', 33, 35).prop('pole', 48, 28).prop('pole', 12, 28);
  m.prop('sign', 33, 31, { text: ['LONGJIE STREET', 'North: Santai Hill. West: River Road to Gucheng. South: the market.'] });
  m.prop('sign', 30, 38, { text: ['LONGJIE MARKET', 'Held on every day of the month that ends in 3 or 8.'] });
  m.prop('sign', 34, 37, { text: ["ZHANG TIANXU'S OLD HOME"] });
  m.prop('crate', 46, 27).prop('crate', 47, 27);
  // market stalls: bare tables most days, full on market days
  const goods = ['pear', 'flower', 'jelly', 'candy', 'cloth', 'veg', 'flower', 'pear'];
  [40, 42, 44, 46].forEach((y, i) => { m.prop('stall', 27, y, { w: 2, goods: goods[i] }); m.prop('stall', 35, y, { w: 2, goods: goods[i + 4] }); });
  // scattered trees and flowers
  [[5, 6], [24, 7], [27, 6], [45, 8], [57, 8], [59, 20], [57, 31], [60, 33], [3, 33], [5, 31], [41, 36], [3, 20], [39, 27], [58, 46], [40, 46]].forEach(([x, y]) => m.set(x, y, 'T'));
  [[6, 10], [12, 11], [22, 6], [36, 7], [47, 9], [55, 12], [58, 15], [4, 34], [20, 31], [44, 33], [54, 33], [59, 29 - 1], [38, 43], [41, 41], [25, 32], [9, 28]].forEach(([x, y]) => { if (m.g[y][x] === '.') m.set(x, y, ','); });
  // exits
  m.warp(31, 0, 'santai', 17, 38, 'up').warp(32, 0, 'santai', 18, 38, 'up');
  m.warp(0, 29, 'riverroad', 58, 11, 'left').warp(0, 30, 'riverroad', 58, 12, 'left');
  // townsfolk
  m.npc({ x: 29, y: 34, look: 'elder', dir: 'up', text: ['When I was your age this street was all mud.', 'On market days you could lose a shoe in it and never see it again.'] });
  m.npc({ x: 38, y: 21, look: 'kid2', wander: 2, text: ['Race you to Santai Hill after class!'] });
  m.npc({ x: 45, y: 29, look: 'aunt', wander: 2, text: ['Jinlong Market has everything. Well, everything you need. Not everything you want.'] });
  m.npc({ x: 44, y: 40, look: 'fisher', dir: 'down', text: ['Shh. They bite better on quiet days.', 'Which is never on market day.'] });
  m.npc({ x: 14, y: 43, look: 'farmer', dir: 'right', text: ['Flowers on this side, vegetables on that side.', 'Step on either and you answer to me.'] });
  m.npc({ x: 20, y: 28, look: 'girl', wander: 1, text: ['The No.1 Middle School kids are so tall. Do they water them?'] });
  m.npc({ x: 33, y: 10, look: 'uncle', dir: 'left', text: ['Past the bridge it is all uphill. Santai Hill is not far.', 'Mind the tall grass. Things live in there.'] });
  m.npc({ x: 31, y: 43, look: 'kid', dir: 'down', market: false, text: ['Empty tables. Boring.', 'Come back on a day that ends in 3 or 8. You will not be able to move for people!'] });
  m.npc({ x: 32, y: 39, look: 'ling', id: 'marketling', when: 'marketling', text: ['A wild Ling is tearing through the pear baskets!'] });
  // market-day crowd
  const M = (x, y, look, dir, text, wander) => m.npc({ x, y, look, dir, text, wander, market: true });
  M(29, 40, 'vendor', 'right', ['Baozhu pears! Sweet as sugar, crisp as morning!']);
  M(29, 42, 'granny', 'right', ['Pea jelly! Fresh pea jelly, with plenty of chili!', 'Oh, it is you. Extra vinegar, the way you like it.']);
  M(29, 44, 'vendor2', 'right', ['Cloth by the metre. Feel that. That will outlive both of us.']);
  M(29, 46, 'farmer', 'right', ['Flowers from the fields out west. Picked before sunrise.']);
  M(34, 40, 'vendor2', 'left', ['Flowers! One bunch for the table, one for your mother.']);
  M(34, 42, 'vendor', 'left', ['Pears, pears, pears. Try before you buy.']);
  M(34, 44, 'aunt', 'left', ['Sugar figures! A dragon? A fish? I can pour anything.']);
  M(34, 46, 'vendor', 'left', ['Cabbage, radish, garlic shoots. Pulled this morning.']);
  M(31, 41, 'uncle', 'left', ['I came all the way from the lakeside for this market.'], 1);
  M(32, 45, 'girl', 'right', ['So many people! I lost my brother three times already.'], 1);
  M(31, 37, 'elder', 'down', ['Third, eighth, thirteenth, eighteenth... I have not missed a market in forty years.']);
  M(32, 33, 'kid2', 'down', ['Dad gave me two coins. TWO.'], 2);
}

// ---------------------------------------------------------------- Santai Hill
{
  const m = newMap('santai', 'SANTAI HILL', 36, 40, 'T', { seed: 3 });
  m.fill(17, 30, 18, 39, 'p');
  m.fill(5, 25, 30, 30, '.'); m.fill(9, 26, 15, 29, 'G'); m.fill(21, 26, 28, 29, 'G');
  m.fill(6, 17, 7, 27, 'p'); m.fill(6, 27, 18, 27, 'p');
  m.fill(5, 11, 30, 16, '.'); m.fill(10, 12, 22, 15, 'G');
  m.fill(6, 14, 7, 16, 'p'); m.fill(6, 13, 28, 13, 'p'); m.fill(27, 7, 28, 13, 'p');
  m.fill(11, 2, 30, 7, '.'); m.fill(15, 5, 26, 7, 's'); m.fill(12, 3, 14, 6, ',');
  m.prop('pavilion', 19, 3, { w: 3, h: 2 });
  m.prop('sign', 24, 5, { text: ['SANTAI HILL SUMMIT', 'The whole of Longjie lies below.'] });
  m.prop('sign', 19, 34, { text: ['SANTAI HILL', 'Wild things live in the tall grass. Travel with a partner.'] });
  [[8, 28], [29, 26], [24, 11], [29, 15], [12, 6]].forEach(([x, y]) => m.set(x, y, 'T'));
  m.warp(17, 39, 'longjie', 31, 1, 'down').warp(18, 39, 'longjie', 32, 1, 'down');
  m.npc({ x: 17, y: 5, look: 'elder', dir: 'down', text: ['You can see the whole town from up here.', 'On market days the street looks like a river of hats.'] });
  m.npc({ x: 24, y: 14, look: 'kid2', dir: 'left', text: ['Hey! You have got a Ling too? Mine is tougher. Watch!'],
    trainer: { name: 'XIAO MING', team: [['w', 0, 4]], win: ['No way! I want a rematch after lunch.'], after: ['Something with a striped tail ran into the grass. I am not going in after it.'], reward: { pear: 1 } } });
  m.npc({ x: 19, y: 28, look: 'girl', wander: 1, text: ['We come up here to pick wild berries. Do not tell my mum.'] });
}

// ---------------------------------------------------------------- River Road
{
  const m = newMap('riverroad', 'RIVER ROAD', 60, 24, '.', { seed: 11 });
  m.fill(0, 0, 59, 1, 'T'); m.fill(0, 22, 59, 23, 'T');
  m.fill(0, 3, 59, 4, 'w'); m.fill(28, 3, 29, 4, 'b'); m.fill(28, 5, 29, 10, 'p'); m.fill(26, 2, 31, 2, ',');
  m.fill(0, 11, 59, 12, 'p');
  m.fill(8, 6, 22, 9, 'G'); m.fill(34, 6, 50, 9, 'G'); m.fill(44, 14, 56, 20, 'G');
  m.fill(4, 15, 20, 20, 'c'); m.fill(24, 15, 40, 20, 'f'); m.fill(22, 13, 22, 21, 'p');
  [[3, 7], [25, 8], [32, 7], [53, 6], [57, 8], [42, 15], [58, 16], [2, 14], [41, 20]].forEach(([x, y]) => m.set(x, y, 'T'));
  [[5, 9], [24, 6], [52, 10], [56, 13], [30, 14 - 1], [1, 8]].forEach(([x, y]) => { if (m.g[y][x] === '.') m.set(x, y, ','); });
  m.prop('sign', 30, 10, { text: ['RIVER ROAD', 'East: Longjie. West: Gucheng.'] });
  m.prop('pole', 12, 10).prop('pole', 40, 10);
  m.warp(59, 11, 'longjie', 1, 29, 'right').warp(59, 12, 'longjie', 1, 30, 'right');
  m.warp(0, 11, 'gucheng', 42, 17, 'left').warp(0, 12, 'gucheng', 42, 18, 'left');
  m.npc({ x: 23, y: 14, look: 'girl', dir: 'down', text: ['I am picking flowers for the market. Only the ones that fell off, I promise.'] });
  m.npc({ x: 36, y: 10, look: 'kid', dir: 'down', text: ['Nobody walks the River Road without battling me. Those are the rules. I made them.'],
    trainer: { name: 'A-HUA', team: [['w', 1, 5], ['w', 3, 5]], win: ['Fine. The rules have changed.'], after: ['Gucheng is west. Kuige Hall will flatten you. Probably.'], reward: { lantern: 2 } } });
  m.npc({ x: 29, y: 2, look: 'fisher', dir: 'down', text: ['This water runs all the way through Longjie. I just follow it and fish.'] });
  m.npc({ x: 10, y: 13, look: 'farmer', wander: 2, text: ['Gucheng is just past the bend. Say hello to the old hall for me.'] });
}

// ---------------------------------------------------------------- Gucheng
{
  const m = newMap('gucheng', 'GUCHENG', 44, 36, '.', { seed: 21 });
  m.fill(0, 0, 43, 2, 'T'); m.fill(0, 33, 43, 35, 'T'); m.fill(0, 0, 1, 35, 'T'); m.fill(42, 0, 43, 35, 'T');
  m.fill(2, 17, 43, 18, 's'); m.fill(21, 10, 22, 31, 's'); m.fill(18, 10, 25, 11, 's');
  m.fill(3, 4, 12, 8, 'G'); m.fill(30, 4, 40, 7, 'G');
  m.ellipse(9, 30, 4.2, 2.2, 'w'); m.fill(27, 28, 40, 31, 'c');
  m.fill(10, 15, 10, 16, 'p'); m.fill(30, 15, 30, 16, 'p'); m.fill(4, 26, 20, 26, 'p'); m.fill(23, 26, 34, 26, 'p');
  m.building({ x: 18, y: 4, w: 8, h: 6, roof: 'gray', door: 3, style: 'tower', to: 'kuige' });
  m.building({ x: 8, y: 11, w: 5, h: 4, roof: 'gray', door: 2, couplet: true, to: 'ghouse' });
  m.building({ x: 28, y: 11, w: 6, h: 4, roof: 'gray', door: 2, style: 'shop', to: 'gshop' });
  m.building({ x: 8, y: 22, w: 5, h: 4, roof: 'gray', door: 2, couplet: true, locked: true });
  m.building({ x: 29, y: 22, w: 5, h: 4, roof: 'gray', door: 2, locked: true });
  m.prop('sign', 24, 16, { text: ['GUCHENG', 'The old town. Kuige Hall stands at the head of the street.'] });
  m.prop('well', 19, 20).prop('pole', 23, 14).prop('pole', 14, 19).prop('pole', 36, 19).prop('bench', 24, 21);
  m.prop('bigtree', 15, 29, { w: 2 });
  [[5, 12], [38, 11], [39, 22], [4, 21], [36, 25], [16, 6], [28, 8], [25, 30]].forEach(([x, y]) => m.set(x, y, 'T'));
  [[14, 13], [35, 14], [6, 24], [26, 21], [38, 15], [17, 23], [13, 9]].forEach(([x, y]) => { if (m.g[y][x] === '.') m.set(x, y, ','); });
  m.warp(43, 17, 'riverroad', 1, 11, 'right').warp(43, 18, 'riverroad', 1, 12, 'right');
  m.npc({ x: 23, y: 12, look: 'elder', dir: 'down', text: ['Kuige Hall. Scholars once climbed those stairs to study under the stars.', 'These days it tests a different kind of student. The doors are open, if you dare.'] });
  m.npc({ x: 16, y: 19, look: 'aunt', wander: 2, text: ['From Longjie, are you? We all walk over on market days.'] });
  m.npc({ x: 27, y: 20, look: 'kid', wander: 2, text: ['I am going to be the first to beat Kuige Hall. After lunch.'] });
  m.npc({ x: 14, y: 30, look: 'fisher', dir: 'left', text: ['Small pond, big patience.'] });
}

export const START = { map: 'home', x: 5, y: 7, dir: 'up' };

// Market days: every date ending in 3 or 8, as the real Longjie market has always been held.
export function isMarketDay(d = new Date()) { const n = d.getDate() % 10; return n === 3 || n === 8; }

// Solid grid for a map given the current world state.
export function buildSolid(m, market) {
  const s = Array.from({ length: m.h }, (_, y) => m.g[y].map((ch) => (SOLID_GROUND.has(ch) ? 1 : 0)));
  for (const p of m.props) {
    if (p.solid === false) continue;
    if (p.type === 'building') {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) s[y][x] = 1;
      if (!p.locked) s[p.y + p.h - 1][p.x + p.door] = 0;
    } else {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) s[y][x] = 1;
    }
  }
  return s;
}
