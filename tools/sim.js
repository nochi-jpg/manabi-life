#!/usr/bin/env node
// まなびライフ 人生シミュレーター（画面なしでエンジンだけ動かす）
//   node tools/sim.js [人数=200] [mode=real|gentle] [--log]
// 選択肢はランダム（メニューは合格率の高い方を少し選びやすく）。エラー・警告・統計を出す。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
require('./build.js'); // data.gen.js を最新に
const N = +process.argv[2] || 200;
const MODE = process.argv[3] || 'real';
const LOG = process.argv.includes('--log');

const store = {};
const warns = {};
const ctx = {
  console: { log: (...a) => console.log(...a), warn: (...a) => { const k = a.join(' '); warns[k] = (warns[k] || 0) + 1; }, error: (...a) => console.error(...a) },
  window: {}, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
  document: { querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} },
  Math, JSON, Date, performance: { now: () => 0 }, setTimeout, clearTimeout, requestAnimationFrame: () => {},
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/js', f), 'utf8'), ctx, { filename: f });
for (const f of ['data.gen.js', 'util.js']) load(f);
vm.runInContext('var Audio2={se(){},bgm(){},loopSe(){return()=>{}},setDuck(){},forLife(){return""}};var Options={get(){return{}}};var asset=(p)=>p;', ctx);
for (const f of ['state.js', 'cond.js', 'text.js', 'econ.js', 'menu.js', 'effects.js', 'family.js', 'engine.js']) load(f);
// const は vm のグローバルに出ないので、取り出し用の関数を作る
vm.runInContext('globalThis.__api={get G(){return G},set G(v){G=v},newLife,Engine,Menu,Econ,Cond,Fam,people,person,D,STAT_KEYS};', ctx);
const api = ctx.__api;

const fired = {};
const stats = { ages: [], choices: [], causes: {}, jobs: {}, edu: {}, married: 0, kids: 0, cash: [], happy: [], errors: [], stuck: 0, popups: {} };
for (let n = 0; n < N; n++) {
  try {
    const g = api.newLife({ gender: Math.random() < 0.5 ? 'M' : 'F', surname: '佐藤', given: 'テスト', kana: ['さとう', 'てすと'], happinessType: 'hp_self', mode: MODE });
    api.G = g;
    api.Engine.begin();
    let steps = 0;
    while (api.G.alive && steps < 20000) {
      steps++;
      let r = api.Engine.next();
      if (LOG && r.posts) for (const p of r.posts) console.log(`${p.y}/${p.m} ${p.age}歳 ${p.e} ${p.t}${p.chosen ? '  ▶' + p.chosen : ''}`);
      let guard = 0;
      while (r.choice && guard++ < 5) {
        const v = r.choice;
        if (v.type === 'lessons') { const keep = {}; v.items.forEach((x) => (keep[x.id] = !x.quit)); r = api.Engine.chooseLessons(keep); continue; }
        stats.popups[v.ev] = (stats.popups[v.ev] || 0) + 1;
        let oi = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * v.opts.length);
        // 子どものうちは「働く」「行かない」をあまり選ばない（ふつうの子の選び方に近づける）
        if (api.G.age < 18 && /働|行かず|やめ/.test(v.opts[oi].label || '') && Math.random() < 0.9) oi = 0;
        const o = v.opts[oi];
        let item = null;
        if (o.menu) { const its = o.items.slice(0, 5); item = its.slice().sort((a, b) => (b.rate ?? 50) - (a.rate ?? 50))[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * its.length)]; }
        r = v.ev === '__menuNext' ? api.Engine.chooseMenuNext(item) : api.Engine.choose(oi, item);
        if (LOG && r.posts) for (const p of r.posts) console.log(`${p.y}/${p.m} ${p.age}歳 ${p.e} ${p.t}${p.chosen ? '  ▶' + p.chosen : ''}`);
      }
      if (r.end) break;
    }
    const G = api.G;
    if (G.alive) stats.stuck++;
    stats.ages.push(G.age); (stats['ages' + G.gender] = stats['ages' + G.gender] || []).push(G.age); stats.choices.push(G.choiceCount);
    stats.causes[G.deathCause] = (stats.causes[G.deathCause] || 0) + 1;
    const jr = (G.jobRecord || []).filter((x) => x.l !== '引退');
    const mainJob = jr.length ? jr[0].l : 'なし';
    stats.jobs[mainJob] = (stats.jobs[mainJob] || 0) + 1;
    const edu = G.flags.edu_doctor_grad ? '博士' : G.flags.edu_master_grad ? '修士' : G.flags.edu_univ_grad ? '大卒' : G.flags.edu_jc_grad || G.flags.edu_vocational_grad || G.flags.edu_kosen_grad ? '短大専門高専' : G.flags.edu_hs_grad ? '高卒' : '中卒';
    stats.edu[edu] = (stats.edu[edu] || 0) + 1;
    if (G.vars.marriageNo) stats.married++;
    stats.kids += api.people('child', false).length;
    for (const p of G.log) fired[p.id] = (fired[p.id] || 0) + 1;
    stats.cash.push(Math.round(G.cash)); if (G.cash < (stats.minCash ?? 0)) { stats.minCash = G.cash; stats.worst = { cash: G.hist.cash, income: G.hist.income, flags: Object.keys(G.flags).join(','), emp: G.employment, job: G.job && G.job.id, loans: G.loans, rec: G.vars.recurring, kids: api.people('child', false).length, log: G.log.filter((p) => p.cat === 'money' || p.kind === 'choice').slice(-25).map((p) => p.age + ' ' + p.t + (p.chosen ? ' ▶' + p.chosen : '')) }; }
    for (const a of [25, 30, 45, 60, 75]) { if (G.hist.cash[a] != null) { (stats['c' + a] = stats['c' + a] || []).push(G.hist.cash[a]); (stats['i' + a] = stats['i' + a] || []).push(G.hist.income[a]); } } stats.happy.push(G.hist.happiness.reduce((a, b) => a + b, 0) / Math.max(1, G.hist.happiness.length));
  } catch (e) { stats.errors.push(e.stack.split('\n').slice(0, 4).join(' | ')); }
}
const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log(`=== ${N}人の人生（${MODE}） ===`);
console.log(`寿命 平均${avg(stats.ages)}歳 / 選択の回数 平均${avg(stats.choices)} / 最期の所持金 中央値${med(stats.cash)}万 / 満足感の平均 ${avg(stats.happy)}`);
console.log(`寿命 男${avg(stats.agesM || [])} 女${avg(stats.agesF || [])}`);
console.log('所持金の中央値（年齢別）', [25, 30, 45, 60, 75].map((a) => `${a}歳:${med(stats['c' + a] || [0])}万/年収${med(stats['i' + a] || [0])}`).join(' '));
console.log(`いちばん低い最期の所持金 ${Math.round(stats.minCash)}万`);
if (process.argv.includes('--worst')) console.log(JSON.stringify(stats.worst, null, 0));
console.log('死因', JSON.stringify(stats.causes));
console.log('学歴', stats.edu);
console.log(`結婚 ${(stats.married / N * 100).toFixed(0)}% / 子ども 平均${(stats.kids / N).toFixed(2)}人 / 終わらなかった ${stats.stuck}`);
console.log('最初の仕事（上位）', Object.entries(stats.jobs).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}:${v}`).join(' '));
if (process.argv.includes('--popups')) console.log(Object.entries(stats.popups).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${k}:${(v / N).toFixed(2)}`).join(' '));
if (process.argv.includes('--fired')) console.log(Object.entries(fired).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
if (Object.keys(warns).length) console.log('警告', warns);
if (stats.errors.length) { console.log(`エラー ${stats.errors.length}件`); [...new Set(stats.errors)].slice(0, 8).forEach((e) => console.log('  ' + e)); process.exitCode = 1; }
