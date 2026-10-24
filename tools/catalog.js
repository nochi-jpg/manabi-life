#!/usr/bin/env node
// data/events_*.json から、人が読むためのイベント一覧 docs/10-event-catalog.md を自動生成する。
// 使い方: node tools/catalog.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8')).events;

const age = (w) => (w && w.age ? (w.age[0] === w.age[1] ? `${w.age[0]}歳` : `${w.age[0]}〜${w.age[1]}歳`) : '');
const season = (w) => (w && w.season ? w.season.map((s) => ({ Q1: '春', Q2: '夏', Q3: '秋', Q4: '冬' }[s])).join('・') : '');
const cond = (w = {}) => {
  const p = [];
  if (w.stage) p.push(`在籍:${w.stage.join('/')}`);
  if (w.all) p.push(`必要:${w.all.join(',')}`);
  if (w.any) p.push(`どれか:${w.any.join(',')}`);
  if (w.none) p.push(`除外:${w.none.join(',')}`);
  if (w.region) p.push(`地域:${w.region.join('')}`);
  if (w.employment) p.push(`雇用:${w.employment.join('/')}`);
  if (w.person) p.push(`人物:${[].concat(w.person).map((x) => x.role).join(',')}`);
  if (w.child) p.push('子どもあり');
  if (w.yearsLeft) p.push(`最終学年-${w.yearsLeft - 1}`);
  if (w.jobYears) p.push(`勤続${w.jobYears.join('/')}年`);
  return p.join(' / ');
};
const choices = (e) => {
  const cs = e.choices || (e.fail && e.fail.choices) || [];
  return cs.map((c) => (c.menu ? `［候補リスト:${c.menu.source}］` : c.label)).filter(Boolean).join('<br>');
};
const esc = (s) => String(s || '').replace(/\|/g, '｜').replace(/\n/g, ' ');

let md = '# 10 イベント一覧（自動生成）\n\n> このファイルは `node tools/catalog.js` で `data/events_*.json` から生成しています。直接編集せず、JSONを直してから再生成してください。\n\n';
const sections = [
  ['events_mandatory.json', '必須イベント（条件を満たすと必ず起こる）'],
  ['events_random.json', 'ランダム選択肢イベント'],
  ['events_flow.json', '流れるだけイベント'],
];
for (const [f, title] of sections) {
  const evs = load(f);
  md += `## ${title}（${evs.length}件）\n\n| | ID | 時期 | 条件 | 文章 | 選択肢 |\n|---|---|---|---|---|---|\n`;
  for (const e of evs) {
    const w = e.when || {};
    const when = [age(w), season(w), e.risk ? `確率:${e.risk}` : ''].filter(Boolean).join(' ');
    const text = e.text || (e.success && e.success.text) || '';
    md += `| ${e.emoji || ''} | \`${e.id}\` | ${esc(when)} | ${esc(cond(w))} | ${esc(text)} | ${esc(choices(e))} |\n`;
  }
  md += '\n';
}
fs.writeFileSync(path.join(root, 'docs', '10-event-catalog.md'), md);
console.log('docs/10-event-catalog.md を生成しました');
