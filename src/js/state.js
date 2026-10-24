'use strict';
// ===== ゲームの状態 G と、誕生（docs/09 §4）・セーブ =====
const D = () => window.DATA;
let G = null; // いま生きている人生

const SEASONS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTH = [4, 7, 10, 1];
const SS_EMOJI = ['🌸', '🌻', '🍁', '⛄'];
const SS_NAME = ['春', '夏', '秋', '冬'];
const STAT_KEYS = ['academic', 'stress', 'social', 'health', 'happiness'];

const calYear = (g = G) => (g.q === 3 ? g.year + 1 : g.year);
const prefOf = (id) => D().prefectures.prefectures.find((p) => p.id === id);
const pref = () => prefOf(G.pref);
const tier = () => pref().tier;

// 世帯年収帯（docs/09 §4-3）
const WEALTH_BANDS = [
  { id: 'very_poor', min: 0, max: 14, inc: [200, 300], label: 'きびしい' },
  { id: 'poor', min: 15, max: 34, inc: [300, 500], label: 'ややきびしい' },
  { id: 'middle', min: 35, max: 64, inc: [500, 900], label: 'ふつう' },
  { id: 'rich', min: 65, max: 84, inc: [900, 1500], label: 'ゆとりあり' },
  { id: 'very_rich', min: 85, max: 100, inc: [1500, 3000], label: 'とても裕福' },
];
const bandOf = (w) => WEALTH_BANDS.find((b) => w >= b.min && w <= b.max) || WEALTH_BANDS[2];
function rollWealth(p) {
  // 出現率 12/23/40/18/7%。都道府県の賃金係数で少しずらす
  const r = rnd() * 100 + (p.wage - 0.85) * 40;
  const cum = [12, 35, 75, 93, 100];
  const i = cum.findIndex((c) => r < c);
  const b = WEALTH_BANDS[i < 0 ? 4 : i];
  return rint(b.min, b.max);
}
function wealthIncome(w) { const b = bandOf(w); return Math.round(b.inc[0] + (b.inc[1] - b.inc[0]) * ((w - b.min) / Math.max(1, b.max - b.min))); }

let personSeq = 0;
function newPerson(role, o = {}) {
  return { id: 'p' + (++personSeq) + '_' + Math.floor(rnd() * 1e6).toString(36), role, name: '', gender: 'M', age: 0, alive: true, relation: rint(55, 80), stage: null, job: null, income: 0, married: false, careLevel: 0, parentIds: [], born: null, ...o };
}

function rollPref() {
  const ps = D().prefectures.prefectures;
  return weighted(ps, (p) => p.population).id;
}

// 親の職業：世帯年収に合いそうな職業から
function parentJob(targetIncome, gender) {
  const js = D().jobs.jobs.filter((j) => !j.viaEventOnly && j.salary && j.salary[0] > 150);
  const mid = (j) => (j.salary[0] + j.salary[1]) / 2;
  return weighted(js, (j) => Math.exp(-Math.abs(mid(j) - targetIncome) / 120));
}

function newLife({ gender, surname, given, kana, happinessType, mode }) {
  const seed = (Math.random() * 2 ** 32) >>> 0;
  RNG.seed(seed);
  personSeq = 0;
  const prefId = rollPref();
  const p = prefOf(prefId);
  const g = {
    v: 1, seed, mode, happinessType, gender, surname, given, kana: kana || ['', ''],
    birthSurname: surname, motherMaiden: '',
    pref: prefId, birthPref: prefId,
    year: 2010, q: 0, age: 0, alive: true, ended: false,
    stats: { academic: 50, stress: 15, social: 50, health: 85, happiness: 60, jobSatisfaction: 0, physicalLoad: 0, mentalLoad: 0 },
    talents: { t_academic: talent(), t_comm: talent(), t_art: talent(), t_sport: talent(), t_health: talent(), looks: talent(), familyWealth: rollWealth(p) },
    subj: {}, skill: { sport: 0, music: 0, art: 0, it: 0, cooking: 0, language: 0, craft: 0, speech: 0 },
    flags: {}, vars: { gender, surname, given, birthSurname: surname, mode, happinessType, hobbies: [], plan: 'undecided', target: 'none', pendingExam: 'none' },
    counters: {}, once: {}, lastFired: {}, scheduled: [], mods: {},
    stage: 'baby', school: null, employment: 'none', job: null, rank: 0, jobYears: 0, jobStartAge: 0,
    focus: 'focus_hobby', focusHalf: false,
    clubs: [], hobbies: [], quals: [],
    cash: 0, debt: 0, assets: 0, loans: [], household: { income: 0, extraCost: 0 },
    people: [], log: [], reports: [],
    hist: { happiness: [], social: [], stress: [], health: [], cash: [], income: [], assets: [], jobSat: [], liveFamily: 0, years: 0, likeMatch: 0, workYears: 0, peopleWorkYears: 0, cashNonNeg: 0, lifetimeIncome: 0, maxAssets: 0 },
    tax: {}, received: {}, lastDelta: null,
    pending: null, choiceCount: 0, randomChoicesThisYear: 0, deathCause: null,
  };
  g.household.income = wealthIncome(g.talents.familyWealth) * p.wage / Math.max(0.8, p.wage);
  // ---- 家族 ----
  const single = chance(0.09);
  if (single) g.flags.single_parent_home = true;
  const momAge = rint(25, 40), dadAge = clamp(momAge + rint(-2, 5), 25, 45);
  const inc = g.household.income;
  const surn = D().names.surnames;
  g.motherMaiden = pick(surn.filter((s) => s[0] !== surname))[0];
  g.vars.motherMaiden = g.motherMaiden;
  const givenM = D().names.given.M, givenF = D().names.given.F;
  const withFather = !single || chance(0.15);
  if (withFather) {
    const fj = parentJob(single ? inc : inc * 0.7, 'M');
    const selfF = !!fj.selfEmployOk && chance(0.6);
    g.people.push(newPerson('father', { name: pick(givenM)[0], gender: 'M', age: dadAge, job: fj.id, jobLabel: fj.label + (selfF ? '（自営）' : ''), jobEmoji: fj.emoji, income: Math.round(single ? inc : inc * 0.7), employment: selfF ? 'self_employed' : 'seishain' }));
  }
  if (!single || !withFather) {
    const work = single || chance(0.7);
    const mj = work ? parentJob(single ? inc : inc * 0.3, 'F') : null;
    const selfM = !!mj && !!mj.selfEmployOk && chance(0.5);
    g.people.push(newPerson('mother', { name: pick(givenF)[0], gender: 'F', age: momAge, job: mj ? mj.id : 'homemaker', jobLabel: mj ? (selfM ? mj.label + '（自営）' : single ? mj.label : mj.label + '（パート）') : '専業主婦', jobEmoji: mj ? mj.emoji : '🏠', income: Math.round(single ? inc : inc * 0.3), partTime: !single && !!mj && !selfM, employment: selfM ? 'self_employed' : mj ? (single ? 'seishain' : 'part') : 'homemaker' }));
  }
  // きょうだい 0人30%/1人50%/2人以上20%
  const nSib = (() => { const r = rnd(); return r < 0.3 ? 0 : r < 0.8 ? 1 : 2; })();
  for (let i = 0; i < nSib; i++) {
    const older = chance(0.5);
    const sg = chance(0.5) ? 'M' : 'F';
    const nm = pick(sg === 'M' ? givenM : givenF)[0];
    if (older) g.people.push(newPerson('sibling', { name: nm, gender: sg, age: rint(1, 6), older: true }));
    else {
      const inY = rint(1, 6);
      if (momAge + inY <= 45) g.scheduled.push({ event: '__sibling_birth', at: { year: 2010 + inY, q: rint(0, 3) }, data: { name: nm, gender: sg } });
    }
  }
  // 祖父母4人（55〜75歳）。同居は地方ほど高確率
  for (let i = 0; i < 4; i++) {
    const gg = i % 2 === 0 ? 'M' : 'F';
    const gp = newPerson('grandparent', { name: '', gender: gg, age: rint(55, 75), side: i < 2 ? 'father' : 'mother' });
    if (chance(0.06 + p.rural * 0.15)) gp.livesTogether = true;
    g.people.push(gp);
  }
  // 教科（6歳で本格的に生成。それまでは仮）
  for (const s of D().flags.subjects) g.subj[s] = 50;
  g.flags.lives_with_parents = true;
  // 世の中の始まり
  g.rng = RNG.s;
  return g;
}

// ---- 人物 ----
const people = (role, alive = true) => G.people.filter((p) => (!role || role.split('|').includes(p.role)) && (!alive || p.alive));
const person = (role) => people(role)[0] || null;
const roleLabel = (p) => {
  const g = p.gender;
  switch (p.role) {
    case 'father': return '父'; case 'mother': return '母';
    case 'sibling': return p.older ? (g === 'M' ? '兄' : '姉') : (g === 'M' ? '弟' : '妹');
    case 'grandparent': return g === 'M' ? '祖父' : '祖母';
    case 'partner': return '恋人'; case 'spouse': return g === 'M' ? '夫' : '妻'; case 'ex_spouse': return '元配偶者';
    case 'child': return g === 'M' ? '息子' : '娘'; case 'grandchild': return '孫';
    default: return '';
  }
};
const roleEmoji = (p) => {
  const a = p.age, g = p.gender;
  if (a < 3) return '👶'; if (a < 13) return g === 'M' ? '👦' : '👧';
  if (a >= 65) return g === 'M' ? '👴' : '👵';
  return g === 'M' ? '👨' : '👩';
};

// ---- セーブ（docs/11：四半期ごと・選ぶたびに自動。手動セーブなし） ----
function save() { if (!G || G.ended) return; G.rng = RNG.s; Store.set('life', G); }
function loadLife() { const g = Store.get('life'); if (g && g.v === 1 && g.alive) { G = g; RNG.seed(g.rng); personSeq = g.people.length + 10; return true; } return false; }
function deleteLife() { Store.del('life'); G = null; }
const histories = () => Store.get('history', []);
function pushHistory(rec) { const h = histories(); h.unshift(rec); Store.set('history', h.slice(0, 60)); }
