#!/usr/bin/env node
// まなびライフ データ整合性チェッカー
// 使い方: node tools/validate.js
// フラグのつづり間違い・存在しないイベント参照・不変条件（docs/09 §9）違反を見つける。
'use strict';
const fs = require('fs');
const path = require('path');
const D = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));

const flagsDoc = D('flags.json');
const files = ['events_mandatory.json', 'events_random.json', 'events_flow.json'];
const eventsByFile = Object.fromEntries(files.map((f) => [f, D(f).events]));
const schools = D('schools.json');
const jobs = D('jobs.json');
const clubs = D('clubs.json');
const prefs = D('prefectures.json');
const random = D('events_random.json');

const errors = [];
const warns = [];
const err = (where, msg) => errors.push(`✗ ${where}: ${msg}`);
const warn = (where, msg) => warns.push(`△ ${where}: ${msg}`);

// ---------- 辞書 ----------
const FLAGS = new Set(Object.values(flagsDoc.flags).flatMap((g) => Object.keys(g)));
const STAGES = new Set(Object.keys(flagsDoc.stages));
const EMPLOY = new Set(Object.keys(flagsDoc.employment));
const FOCUS = new Set(flagsDoc.focus);
const LIKES = new Set(flagsDoc.likes);
const COUNTERS = new Set([...Object.keys(flagsDoc.counters), 'examTries']);
const VARS = new Set(Object.keys(flagsDoc.vars));
const ROLES = new Set(flagsDoc.personRoles);
const STATS = new Set(flagsDoc.stats);
const SUBJ = new Set(flagsDoc.subjects);
const SKILLS = new Set(flagsDoc.skills);
const TALENTS = new Set(flagsDoc.talents);

const allEvents = Object.values(eventsByFile).flat();
const EVENT_IDS = new Set();
for (const [f, evs] of Object.entries(eventsByFile)) {
  for (const e of evs) {
    if (!e.id) err(f, 'id のないイベントがある');
    if (EVENT_IDS.has(e.id)) err(e.id, 'イベントIDが重複');
    EVENT_IDS.add(e.id);
  }
}

const JOB_IDS = new Set(jobs.jobs.map((j) => j.id).concat(jobs.partTimeJobs.map((j) => j.id)));
const CLUB_IDS = new Set([...clubs.lessons, ...clubs.jhsClubs, ...clubs.hsClubsExtra, ...clubs.univCircles].map((c) => c.id));
const ps = schools.postSecondary;
const SCHOOL_IDS = new Set([
  ...schools.preschool, ...schools.elementary, ...schools.juniorHigh, ...schools.highSchool,
  ...ps.universityTiers, ...ps.juniorCollege, ...ps.vocational, ...ps.graduate, ...ps.abroad,
].map((s) => s.id));
const DEPT_IDS = new Set(ps.departments.map((d) => d.id));
const QUAL_IDS = new Set(random.qualifications.map((q) => q.id));
const MENU_SOURCES = new Set([
  'schools.preschool', 'schools.elementary', 'schools.juniorHigh', 'schools.highSchool', 'schools.postByPlan',
  'schools.vocational', 'schools.graduate', 'schools.abroad', 'jobs.jobs', 'jobs.partTimeJobs', 'jobs.midCareer', 'jobs.civil',
  'clubs.lessons', 'clubs.jhsClubs', 'clubs.hsClubs', 'clubs.univCircles', 'clubs.current', 'focus', 'qualifications',
]);
const SPECIAL_SCHOOL = new Set(['jh_free_or_el_free']);

const isDyn = (v) => typeof v === 'string' && (v.startsWith('$') || v.startsWith('='));
const checkFlag = (where, f) => { if (!isDyn(f) && !FLAGS.has(f)) err(where, `未定義のフラグ「${f}」`); };
const checkFlags = (where, arr) => (Array.isArray(arr) ? arr : []).forEach((f) => checkFlag(where, f));

// ---------- 再帰的に走査 ----------
function walkWhen(where, w) {
  if (!w || typeof w !== 'object') return;
  checkFlags(where + '.when.all', w.all);
  checkFlags(where + '.when.any', w.any);
  checkFlags(where + '.when.none', w.none);
  (w.stage || []).forEach((s) => { if (!STAGES.has(s)) err(where, `未定義のstage「${s}」`); });
  (w.employment || []).forEach((s) => { if (!EMPLOY.has(s)) err(where, `未定義のemployment「${s}」`); });
  if (w.stat) Object.keys(w.stat).forEach((k) => { if (!STATS.has(k)) err(where, `未定義のstat「${k}」`); });
  if (w.talent) Object.keys(w.talent).forEach((k) => { if (!TALENTS.has(k)) err(where, `未定義のtalent「${k}」`); });
  if (w.subj) Object.keys(w.subj).forEach((k) => { if (!SUBJ.has(k)) err(where, `未定義の教科「${k}」`); });
  if (w.var) Object.keys(w.var).forEach((k) => { if (!VARS.has(k)) err(where, `未定義のvar「${k}」`); });
  if (w.counter) Object.keys(w.counter).forEach((k) => { if (!COUNTERS.has(k)) err(where, `未定義のcounter「${k}」`); });
  if (w.club) w.club.forEach((c) => { if (!CLUB_IDS.has(c)) err(where, `未定義のclub「${c}」`); });
  if (w.jobId) w.jobId.forEach((j) => { if (!JOB_IDS.has(j)) err(where, `未定義のjob「${j}」`); });
  if (w.after) w.after.split('|').forEach((id) => { if (!EVENT_IDS.has(id)) err(where, `after の参照先がない「${id}」`); });
  const persons = Array.isArray(w.person) ? w.person : w.person ? [w.person] : [];
  persons.forEach((p) => p.role && p.role.split('|').forEach((r) => { if (!ROLES.has(r)) err(where, `未定義の人物role「${r}」`); }));
  if (w.person && persons.some((p) => p.jobIn)) persons.forEach((p) => (p.jobIn || []).forEach((j) => { if (!JOB_IDS.has(j)) err(where, `jobIn の職業がない「${j}」`); }));
}

function walkEffects(where, ef) {
  if (!ef || typeof ef !== 'object') return;
  checkFlags(where + '.set', ef.set);
  checkFlags(where + '.clear', ef.clear);
  if (ef.stats) Object.keys(ef.stats).forEach((k) => { if (!STATS.has(k)) err(where, `未定義のstat「${k}」`); });
  if (ef.subj) Object.keys(ef.subj).forEach((k) => { if (!SUBJ.has(k)) err(where, `未定義の教科「${k}」`); });
  if (ef.skill) Object.keys(ef.skill).forEach((k) => { if (!SKILLS.has(k)) err(where, `未定義のskill「${k}」`); });
  if (ef.counter) Object.keys(ef.counter).forEach((k) => { if (!COUNTERS.has(k)) err(where, `未定義のcounter「${k}」`); });
  if (ef.var) Object.keys(ef.var).forEach((k) => { if (!VARS.has(k)) err(where, `未定義のvar「${k}」`); });
  if (ef.focus && !isDyn(ef.focus) && !FOCUS.has(ef.focus)) err(where, `未定義のfocus「${ef.focus}」`);
  if (ef.nextStage && !STAGES.has(ef.nextStage)) err(where, `未定義のstage「${ef.nextStage}」`);
  (ef.schedule || []).forEach((s) => { if (!EVENT_IDS.has(s.event)) err(where, `scheduleの参照先がない「${s.event}」`); });
  if (ef.job) {
    for (const k of ['hire', 'fallback']) if (ef.job[k] && !isDyn(ef.job[k]) && !JOB_IDS.has(ef.job[k])) err(where, `未定義のjob「${ef.job[k]}」`);
    if (ef.job.form && !EMPLOY.has(ef.job.form)) err(where, `未定義の雇用形態「${ef.job.form}」`);
  }
  if (ef.club && ef.club.join && !isDyn(ef.club.join) && !CLUB_IDS.has(ef.club.join)) err(where, `未定義のclub「${ef.club.join}」`);
  if (ef.school && ef.school.enter && !isDyn(ef.school.enter) && !SCHOOL_IDS.has(ef.school.enter) && !SPECIAL_SCHOOL.has(ef.school.enter)) err(where, `未定義の学校「${ef.school.enter}」`);
  if (ef.person) {
    const p = ef.person;
    if (p.add && !ROLES.has(p.add)) err(where, `person.add の role がない「${p.add}」`);
    if (p.promote) p.promote.split('>').forEach((r) => { if (!ROLES.has(r)) err(where, `person.promote の role がない「${r}」`); });
    if (p.end) { const r = p.end.split('>')[0]; if (!ROLES.has(r)) err(where, `person.end の role がない「${r}」`); }
    if (p.kill && !isDyn(p.kill) && !ROLES.has(p.kill)) err(where, `person.kill の role がない「${p.kill}」`);
    if (p.relation && !ROLES.has(p.relation)) err(where, `person.relation の role がない「${p.relation}」`);
  }
}

// 選択肢・成功・失敗を含めて、効果ブロックを全部取り出す
function effectBlocks(node, prefix, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.effects) out.push([prefix, node.effects, node]);
  for (const k of ['success', 'fail', 'after']) {
    if (node[k]) {
      const n = node[k];
      if (n.effects) out.push([`${prefix}.${k}`, n.effects, node]);
      else if (!n.choices && !n.roll) out.push([`${prefix}.${k}`, n, node]);
      if (n.choices) n.choices.forEach((c, i) => effectBlocks(c, `${prefix}.${k}.choice${i}`, out));
      if (n.roll && (n.success || n.fail)) effectBlocks(n, `${prefix}.${k}`, out);
    }
  }
  (node.choices || []).forEach((c, i) => effectBlocks(c, `${prefix}.choice${i}`, out));
  return out;
}

// ---------- イベントのチェック ----------
const licenseOwner = { lic_doctor: 'ev_m_kokushi_doctor', lic_dentist: 'ev_m_kokushi_dentist', lic_pharmacist: 'ev_m_kokushi_pharm', lic_lawyer: 'ev_m_shihou', lic_nurse: 'ev_m_kokushi_nurse' };

for (const e of allEvents) {
  const w = e.when || {};
  walkWhen(e.id, w);
  (e.choices || []).forEach((c, i) => {
    if (c.when) walkWhen(`${e.id}.choice${i}`, c.when);
    if (c.menu && !MENU_SOURCES.has(c.menu.source)) err(`${e.id}.choice${i}`, `未定義のmenu source「${c.menu.source}」`);
  });
  if (e.fail && e.fail.choices) e.fail.choices.forEach((c, i) => {
    if (c.when) walkWhen(`${e.id}.fail.choice${i}`, c.when);
    if (c.menu && !MENU_SOURCES.has(c.menu.source)) err(`${e.id}.fail.choice${i}`, `未定義のmenu source「${c.menu.source}」`);
  });
  if (e.kind === 'choice' && !e.choices && !(e.fail && e.fail.choices)) err(e.id, '選択肢イベントなのに choices がない');
  if (e.kind === 'flow' && e.choices) err(e.id, '流れるだけイベントに choices がある');
  if (!e.text && e.kind === 'flow' && !e.success) warn(e.id, 'テキストがない');

  const blocks = effectBlocks(e, e.id);
  for (const [where, ef, owner] of blocks) {
    walkEffects(where, ef);
    const cw = Object.assign({}, w, (owner && owner.when) || {});
    const all = new Set([...(w.all || []), ...((owner.when || {}).all || [])]);
    const any = new Set([...(w.any || []), ...((owner.when || {}).any || [])]);
    const none = new Set([...(w.none || []), ...((owner.when || {}).none || [])]);
    const persons = [].concat(w.person || []).concat((owner.when || {}).person || []);
    const hasRoleAlive = (re) => persons.some((p) => p.role && re.test(p.role) && p.alive !== false);
    const sets = new Set(ef.set || []);

    // I-2 子ども
    if (ef.person && ef.person.add === 'child') {
      if (!(all.has('married') || any.has('married') || any.has('has_partner'))) err(where, 'I-2違反：子どもを追加するのに結婚/恋人の条件がない');
      if (!hasRoleAlive(/spouse|partner/)) err(where, 'I-2違反：子どもを追加するのに配偶者/恋人の生存条件がない');
    }
    // I-1 孫
    if (ef.person && ef.person.add === 'grandchild') {
      if (!(w.child && w.child.married === true)) err(where, 'I-1違反：孫を追加するのに「結婚している子」の条件がない');
      if (!ef.person.parentFrom) err(where, 'I-1違反：孫に親（parentFrom）が指定されていない');
    }
    // I-3 結婚
    if (sets.has('married') && !none.has('married')) err(where, 'I-3違反：結婚中に再度結婚できてしまう（when.none に married が必要）');
    if (ef.person && ef.person.promote === 'partner>spouse' && !all.has('has_partner')) err(where, 'I-3違反：恋人がいないのに結婚に昇格');
    // I-4 離婚・死別
    if ((sets.has('divorced') || sets.has('widowed')) && !all.has('married')) err(where, 'I-4違反：結婚していないのに離婚/死別');
    // I-5/I-6 介護
    if (sets.has('caregiving') && !hasRoleAlive(/father|mother|spouse|grandparent/)) err(where, 'I-6違反：介護対象の生存条件がない');
    if (ef.person && ef.person.kill && !isDyn(ef.person.kill) && !hasRoleAlive(new RegExp(ef.person.kill))) err(where, 'I-5違反：生存条件なしで人物を死亡させている');
    if (ef.person && ef.person.kill === '$who' && persons.length === 0 && !w.child) err(where, 'I-5違反：$who の対象条件がない');
    // I-11 資格は決められたイベントだけで付く
    for (const [lic, owner2] of Object.entries(licenseOwner)) if (sets.has(lic) && e.id !== owner2) err(where, `I-11違反：${lic} は ${owner2} 以外で付けられない`);
    // I-8 学歴
    if (sets.has('edu_master_grad') && !all.has('edu_univ_grad')) err(where, 'I-8違反：大卒条件なしで修士');
    // 逮捕は14歳以上
    if (sets.has('arrest')) { const a = (w.age || [0])[0]; if (a < 14) err(where, '逮捕は14歳以上（when.age の下限を14以上に）'); }
    // 補導は20歳未満のみ
    if (sets.has('hodou')) { const a = (w.age || [0, 99])[1]; if (a >= 20) err(where, '補導は20歳未満のみ'); }
    // I-14 車
    if (sets.has('owns_car') && !all.has('lic_car')) err(where, 'I-14違反：免許なしで車を持つ');
  }
}

// ---------- データファイル側のフラグ参照 ----------
for (const j of jobs.jobs) {
  checkFlags(`jobs.${j.id}.requires`, j.requires);
  checkFlags(`jobs.${j.id}.excludes`, j.excludes);
  checkFlags(`jobs.${j.id}.grantOnHire`, j.grantOnHire);
  Object.keys(j.bonusFlags || {}).forEach((f) => checkFlag(`jobs.${j.id}.bonusFlags`, f));
  if (j.exam && !EVENT_IDS.has(j.exam)) err(`jobs.${j.id}`, `exam イベントがない「${j.exam}」`);
  if (j.viaEventOnly && !EVENT_IDS.has(j.viaEventOnly)) err(`jobs.${j.id}`, `viaEventOnly イベントがない「${j.viaEventOnly}」`);
  if (j.hitEvent && !EVENT_IDS.has(j.hitEvent)) err(`jobs.${j.id}`, `hitEvent がない「${j.hitEvent}」`);
  const [s0, s1] = j.salary; if (s0 > s1) err(`jobs.${j.id}`, '初任年収がピークより高い');
  if (['j_teacher_elem', 'j_teacher_sec', 'j_police', 'j_civil_national', 'j_civil_local', 'j_firefighter', 'j_sdf', 'j_lawyer'].includes(j.id) && !(j.excludes || []).includes('arrest')) err(`jobs.${j.id}`, 'I-12違反：逮捕歴の除外がない');
}
const allSchools = [...schools.preschool, ...schools.elementary, ...schools.juniorHigh, ...schools.highSchool, ...ps.universityTiers, ...ps.juniorCollege, ...ps.vocational, ...ps.graduate, ...ps.abroad];
for (const s of allSchools) {
  checkFlags(`schools.${s.id}.grant`, s.grant);
  checkFlags(`schools.${s.id}.onGraduate`, s.onGraduate);
  checkFlags(`schools.${s.id}.grantOnGrad`, s.grantOnGrad);
  if (Array.isArray(s.requires)) checkFlags(`schools.${s.id}.requires`, s.requires);
  if (s.stage && !STAGES.has(s.stage)) err(`schools.${s.id}`, `未定義のstage「${s.stage}」`);
  if (s.exam && s.exam.startsWith && s.exam.startsWith('ev_') && !EVENT_IDS.has(s.exam)) err(`schools.${s.id}`, `exam イベントがない「${s.exam}」`);
  if (s.examFlag) checkFlag(`schools.${s.id}.examFlag`, s.examFlag);
  Object.keys(s.onGraduateChance || {}).forEach((f) => checkFlag(`schools.${s.id}.onGraduateChance`, f));
}
for (const d of ps.departments) {
  checkFlags(`dept.${d.id}.autoSet`, d.autoSet);
  if (d.exam && !EVENT_IDS.has(d.exam)) err(`dept.${d.id}`, `exam イベントがない「${d.exam}」`);
  if (d.stage && !STAGES.has(d.stage)) err(`dept.${d.id}`, `未定義のstage「${d.stage}」`);
}
for (const g of ps.graduate) if (g.requires) { checkFlags(`graduate.${g.id}`, g.requires); if (g.stage === 'grad_doctor' && !g.requires.includes('edu_master_grad')) err(`graduate.${g.id}`, 'I-8違反：博士は修士修了が必要'); }
for (const c of [...clubs.lessons, ...clubs.jhsClubs, ...clubs.hsClubsExtra, ...clubs.univCircles]) {
  checkFlags(`clubs.${c.id}.set`, c.set);
  checkFlags(`clubs.${c.id}.grantOnAchieve`, c.grantOnAchieve);
  (c.riskEvents || []).forEach((id) => { if (!EVENT_IDS.has(id)) err(`clubs.${c.id}`, `riskEvents がない「${id}」`); });
  if (typeof c.tourney === 'string' && !EVENT_IDS.has(c.tourney)) err(`clubs.${c.id}`, `tourney イベントがない「${c.tourney}」`);
  if (c.event && !EVENT_IDS.has(c.event)) err(`clubs.${c.id}`, `event がない「${c.event}」`);
}
for (const q of random.qualifications) { checkFlag(`qual.${q.id}`, q.flag); checkFlags(`qual.${q.id}.requires`, q.requires); checkFlags(`qual.${q.id}.requiresAny`, q.requiresAny); }
for (const [m, f] of Object.entries(flagsDoc.modifiers)) if (!FLAGS.has(f)) err(`modifiers.${m}`, `紐づくフラグがない「${f}」`);
const popSum = prefs.prefectures.reduce((a, p) => a + p.population, 0);
if (prefs.prefectures.length !== 47) err('prefectures', `都道府県が${prefs.prefectures.length}件（47件必要）`);

// ---------- 到達できないフラグ（だれも set しないのに条件で使われている） ----------
const setSomewhere = new Set();
for (const e of allEvents) for (const [, ef] of effectBlocks(e, e.id)) { (ef.set || []).forEach((f) => setSomewhere.add(f)); Object.values(ef.setByStage || {}).forEach((f) => { checkFlag(e.id + '.setByStage', f); setSomewhere.add(f); }); }
[...allSchools.flatMap((s) => [...(s.grant || []), ...(s.onGraduate || []), ...(s.grantOnGrad || []), ...Object.keys(s.onGraduateChance || {}), s.examFlag].filter(Boolean)),
 ...ps.departments.flatMap((d) => d.autoSet || []),
 ...[...clubs.lessons, ...clubs.jhsClubs, ...clubs.hsClubsExtra, ...clubs.univCircles].flatMap((c) => [...(c.set || []), ...(c.grantOnAchieve || [])]),
 ...random.qualifications.map((q) => q.flag), ...jobs.jobs.flatMap((j) => j.grantOnHire || []),
 // エンジンが自動で付けるフラグ（docs/09 §4, §5）
 'edu_univ_grad', 'edu_jc_grad', 'edu_vocational_grad', 'edu_kosen_grad', 'edu_med_grad', 'edu_doctor_grad', 'edu_master_grad', 'lic_teacher_elem', 'lic_teacher_sec',
 'single_parent', 'debt_card', 'lives_with_parents', 'manager', 'reemployed', 'black_company', 'union_member', 'freelance_exp', 'leave_exp', 'glasses', 'dz_allergy', 'dz_asthma',
 'injury_sports', 'burnout', 'life_insurance', 'cancer_insurance', 'community_role', 'crypto', 'intern_exp', 'lives_dorm', 'dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast',
 'pro_athlete_exp', 'inheritance', 'lottery_win', 'captain', 'edu_jhs_private', 'naitei_school', 'job_hunting', 'lic_bike', 'eiken_3', 'eiken_2', 'eiken_p1', 'eiken_1', 'toeic_600', 'toeic_800', 'toeic_900',
 'lic_cook', 'lic_beauty', 'lic_pt', 'lic_pilot', 'lic_care', 'lic_nursery', 'edu_workingholiday', 'edu_abroad_degree', 'edu_abroad_hs', 'edu_abroad_univ', 'edu_elem_private', 'sports_recommend',
].forEach((f) => setSomewhere.add(f));
const used = new Set();
for (const e of allEvents) { const w = e.when || {}; [...(w.all || []), ...(w.any || [])].forEach((f) => used.add(f)); }
for (const f of used) if (!setSomewhere.has(f) && !isDyn(f)) warn('到達不能', `「${f}」は条件で使われているが、どこでも付与されない`);
for (const f of FLAGS) if (!setSomewhere.has(f) && !used.has(f)) warn('未使用', `「${f}」はどこでも使われていない`);

// ---------- 結果 ----------
const count = (f) => eventsByFile[f].length;
const choiceN = allEvents.filter((e) => e.kind === 'choice').length;
console.log('=== まなびライフ データ検証 ===');
console.log(`イベント: 必須 ${count('events_mandatory.json')} / ランダム ${count('events_random.json')} / 流れる ${count('events_flow.json')}（選択肢あり ${choiceN}）`);
console.log(`フラグ ${FLAGS.size} / 職業 ${jobs.jobs.length} / バイト ${jobs.partTimeJobs.length} / 学校テンプレ ${SCHOOL_IDS.size} / 学部 ${DEPT_IDS.size} / 部活・習い事・サークル ${CLUB_IDS.size} / 資格 ${QUAL_IDS.size} / 都道府県 ${prefs.prefectures.length}（人口計 ${popSum}万）`);
warns.forEach((w) => console.log(w));
errors.forEach((e) => console.log(e));
console.log(errors.length ? `\nエラー ${errors.length}件` : '\n✓ エラーなし');
process.exit(errors.length ? 1 : 0);
