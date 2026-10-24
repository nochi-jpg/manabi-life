'use strict';
// ===== 条件 when の判定（docs/09 §10-1） =====
const OPS = ['<', '<=', '>', '>=', '==', '!='];
function cmp(v, op, x) {
  switch (op) { case '<': return v < x; case '<=': return v <= x; case '>': return v > x; case '>=': return v >= x; case '==': return v == x; case '!=': return v != x; default: return false; } // eslint-disable-line eqeqeq
}
const isOpSpec = (s) => Array.isArray(s) && s.length === 2 && OPS.includes(s[0]);
const inRange = (v, r) => (Array.isArray(r) ? v >= r[0] && v <= r[1] : v === r);
// [op,x] / [a,b] / 値のリスト（"!x" は否定） のどれでも判定
function matchSpec(v, spec, ctx) {
  if (isOpSpec(spec)) return cmp(v, spec[0], dyn(spec[1], ctx));
  if (Array.isArray(spec)) {
    const neg = spec.filter((s) => typeof s === 'string' && s.startsWith('!'));
    if (neg.length && neg.length === spec.length) return !neg.some((s) => String(v) === s.slice(1));
    return spec.some((s) => s === v || String(s) === String(v));
  }
  return spec === v;
}

// ---- 値の読み出し ----
const ageOf = () => G.age;
function statVal(k) {
  if (k in G.stats) return G.stats[k];
  if (k in G.talents) return G.talents[k];
  if (k.startsWith('subj.')) return G.subj[k.slice(5)] ?? 0;
  if (k.startsWith('skill.')) { const s = k.slice(6); if (s === 'club') return clubSkill(); return G.skill[s] ?? 0; }
  if (k === 'cash') return G.cash;
  if (k === 'age') return G.age;
  if (k === 'income') return Econ.annualIncome();
  if (k === 'rural') return pref().rural;
  if (k in (G.counters || {})) return G.counters[k] || 0;
  if (['promotion_level', 'job_changes', 'partners_past', 'ronin_years', 'repeat_years', 'hodou_count', 'hospital_count', 'moves', 'lottery_spent', 'examTries'].includes(k)) return G.counters[k] || 0;
  if (k === 'partnerRelation') { const p = person('partner'); return p ? p.relation : 50; }
  if (k === 'childRelation') { const cs = people('child').filter((c) => c.alive && c.age >= 17 && c.age <= 18); return cs.length ? cs[0].relation : 50; }
  if (k === 'spouseRelation') { const p = person('spouse'); return p ? p.relation : 50; }
  if (k === 'parentsRelation') return G.vars.parentsRelation ?? 60;
  if (k === 'parentAge') { const ps = people('father|mother'); return ps.length ? Math.max(...ps.map((p) => p.age)) : 0; }
  if (k === 'spouseAge') { const p = person('spouse'); return p ? p.age : 0; }
  if (k === 'familyWealth') return G.talents.familyWealth;
  if (k === 'netWorth') return Econ.netWorth();
  if (k === 'liquid') return Econ.liquid();
  if (k === 'assets') return G.assets;
  if (k === 'householdIncome') return Fam.householdIncome().total;
  if (k === 'kids') return people('child').length;
  return 0;
}
// 「$xxx」などの動的な値
function dyn(v, ctx) {
  if (typeof v !== 'string' || !v.startsWith('$')) return v;
  return Text.dynValue(v.slice(1), ctx);
}
const hasFlag = (f) => {
  if (!f) return false;
  if (f.startsWith('focus_')) return G.focus === f;
  if (f.startsWith('like_')) return likeMain() === f;
  return !!G.flags[f];
};
function likeMain() { return G.vars.like6 || G.vars.like3 || 'like_none'; }
function clubSkill() {
  const c = G.clubs[0]; if (!c) return 0;
  const def = Menu.club(c.id); if (!def) return 0;
  const k = Object.keys(def.yearly || {}).find((x) => x.startsWith('skill.'));
  return k ? G.skill[k.slice(6)] || 0 : 0;
}

// ---- 人物の条件 ----
function personMatch(p, c) {
  if (c.role && !c.role.split('|').includes(p.role)) return false;
  if (c.alive === true && !p.alive) return false;
  if (c.alive === false && p.alive) return false;
  if (c.fertile) { const female = p.gender === 'F' ? p : G.gender === 'F' ? null : null; const bp = p.gender === 'F' ? p.age : G.gender === 'F' ? G.age : 99; if (!(bp >= 18 && bp <= 45) || G.age < 18) return false; void female; }
  if (c.employment && !c.employment.includes(p.employment || (p.job && /self|farmer|fisher|family_business|carpenter/.test(p.job) ? 'self_employed' : 'seishain'))) return false;
  if (c.jobIn && !c.jobIn.includes(p.job)) return false;
  if (c.jobTransfer && !(p.job && (Menu.job(p.job) || {}).transfer)) return false;
  if (c.jobOvertimeMin && !(p.job && ((Menu.job(p.job) || {}).overtime || 0) >= c.jobOvertimeMin)) return false;
  if (c.relationMin != null && p.relation < c.relationMin) return false;
  if (c.relationMax != null && p.relation > c.relationMax) return false;
  if (c.years != null && (G.year - (p.since || G.year)) < c.years) return false;
  if (c.careLevelMin != null && (p.careLevel || 0) < c.careLevelMin) return false;
  if (c.age && !inRange(p.age, c.age)) return false;
  if (c.ageMax != null && p.age > c.ageMax) return false;
  if (c.noFlag && p[c.noFlag]) return false;
  if (c.wishNot && p.wish === c.wishNot) return false;
  if (c.livesTogether && !p.together) return false;
  if (c.together === true && !p.together) return false;
  if (c.together === false && p.together) return false;
  if (c.working === true && !Fam.isWorking(p)) return false;
  if (c.working === false && Fam.isWorking(p)) return false;
  if (c.healthMax != null && (p.health ?? 80) > c.healthMax) return false;
  if (c.ill && !p.illness) return false;
  if (c.notInFacility && p.inFacility) return false;
  if (c.widowed && people('father|mother').filter((x) => x !== p).length) return false;
  if (c.married != null && !!p.married !== c.married) return false;
  return true;
}
function childMatch(p, c) {
  if (p.role !== 'child') return false;
  if (c.alive !== false && !p.alive) return false;
  if (c.age && !inRange(p.age, c.age)) return false;
  if (c.married != null && !!p.married !== c.married) return false;
  if (c.plan && p.plan !== c.plan) return false;
  if (c.stage && !c.stage.includes(p.stage)) return false;
  if (c.noFlag && p[c.noFlag]) return false;
  if (c.together === true && !p.together) return false;
  if (c.together === false && p.together) return false;
  if (c.birthParentAge) { const a = p.gender === 'F' ? p.age : (p.spouseAge || p.age - 2); if (!inRange(a, c.birthParentAge)) return false; }
  return true;
}

// ---- 本体 ----
// ctx: { ev, who（人物条件で選ばれた人）, child } を書きこむ
function test(w, ctx = {}) {
  if (!w) return true;
  for (const [k, v] of Object.entries(w)) {
    if (!testKey(k, v, ctx)) return false;
  }
  return true;
}
function testKey(k, v, ctx) {
  const ev = ctx.ev || {};
  switch (k) {
    case 'age': return inRange(G.age, v);
    case 'season': return v.includes(SEASONS[G.q]);
    case 'once': if (v === 'perMarriage') return !G.once[ev.id + '@' + (G.vars.marriageNo || 0)]; return !G.once[ev.id];
    case 'region': return v.includes(tier()) || v.includes(pref().region);
    case 'regionNot': return !v.includes(tier());
    case 'talent': return Object.entries(v).every(([t, s]) => matchSpec(G.talents[t] ?? statVal(t), s, ctx));
    case 'stat': return Object.entries(v).every(([t, s]) => matchSpec(G.stats[t], s, ctx));
    case 'subj': return Object.entries(v).every(([t, s]) => matchSpec(G.subj[t], s, ctx));
    case 'money': return Object.entries(v).every(([t, s]) => t === 'householdOrCash' ? matchSpec(G.age < 16 ? Econ.householdCash() : G.cash, s, ctx) : matchSpec(t === 'cash' ? G.cash : statVal(t), s, ctx));
    case 'var': return Object.entries(v).every(([t, s]) => { let val = G.vars[t]; if (val === undefined) val = t === 'target' || t === 'pendingExam' ? 'none' : (t === 'schoolAway' || t === 'workAway') ? false : val; return matchSpec(val, s, ctx); });
    case 'counter': return Object.entries(v).every(([t, s]) => matchSpec(G.counters[t] || 0, s, ctx));
    case 'stage': return v.includes(G.stage);
    case 'consumerDebt': return matchSpec(Econ.consumerDebt(), v, ctx); // 住宅・投資・奨学金・整理中のローンをのぞいた借金
    case 'awayFromHome': { const par = people('father|mother').find((p) => p.alive); return (!!par && par.pref !== G.pref) === !!v; } // 親が生きていて、ちがう県に住んでいる
    case 'poorHome': return Engine.poorHome() === !!v; // とても貧しい家（親に「自分で出して」と言われる）
    case 'jukuOk': return Engine.jukuOk() === !!v; // 中学受験の塾に通わせられる家計か（世帯年収）
    case 'employment': return v.includes(G.employment);
    case 'all': return v.every((f) => hasFlag(dyn(f, ctx)));
    case 'none': return !v.some((f) => hasFlag(dyn(f, ctx)));
    case 'any': return v.some((f) => hasFlag(dyn(f, ctx)));
    case 'cooldownYears': { const last = G.lastFired[ev.id]; return last == null || G.year - last >= v; }
    case 'yearsLeft': return !!G.school && schoolYearsLeft() === v;
    case 'yearInStage': return !!G.school && (Array.isArray(v) ? inRange(G.school.yearIn, v) : G.school.yearIn === v);
    case 'lessonsLess': return G.clubs.filter((c) => Engine.isLesson(c.id)).length < v; // 習い事の数が v 個より少ない（4つまで）
    case 'noLesson': return !G.clubs.some((c) => c.id === v);
    case 'jobYears': return !!G.job && (Array.isArray(v) ? v.includes(G.jobYears) : G.jobYears === v);
    case 'after': return true; // 並び順だけ（engine で後ろに回す）
    case 'person': {
      const cs = Array.isArray(v) ? v : [v];
      for (const c of cs) { const m = G.people.filter((p) => personMatch(p, c)); if (!m.length) return false; if (!ctx.who) ctx.who = pick(m); }
      return true;
    }
    case 'child': { if (ctx.child && ctx.child.role === 'child') return childMatch(ctx.child, v); const m = G.people.filter((p) => childMatch(p, v)); if (!m.length) return false; ctx.child = pick(m); return true; }
    case 'childrenLess': return people('child', false).length < v;
    case 'marriedYears': { if (!G.flags.married) return false; const y = G.year - (G.vars.marriedYear ?? G.year); return Array.isArray(v) ? inRange(y, v) : y === v; }
    case 'marriedYearsIn': { if (!G.flags.married) return false; const y = G.year - (G.vars.marriedYear ?? G.year); return v.includes(y) && G.q === 0; }
    case 'hasClub': return G.clubs.length > 0 === !!v;
    case 'clubTourney': return G.clubs.some((c) => { const d = Menu.club(c.id); return d && d.tourney === true; });
    case 'club': return G.clubs.some((c) => v.includes(c.id));
    case 'hasRankTrack': return !!Econ.rankTrack() === !!v;
    case 'nextStepExam': { const s = Econ.nextStep(); return !!s && !!s.exam === !!v; }
    case 'nextStepYearsMet': { const s = Econ.nextStep(); return !!s && G.jobYears >= (s.y || 0) - (G.rankYearsOffset || 0) === !!v; }
    case 'contractEnd': { const f = D().jobs.forms[G.job && G.job.form]; return !!f && !!f.maxYears && G.jobYears > 0 && G.jobYears % f.maxYears === 0 && G.q === 3; }
    case 'jobOvertime': return matchSpec(Econ.overtime(), v, ctx);
    case 'jobTransfer': return !!G.job && !!(Menu.job(G.job.id) || {}).transfer;
    case 'jobCat': return !!G.job && v.includes((Menu.job(G.job.id) || {}).cat);
    case 'jobId': return !!G.job && v.includes(G.job.id);
    case 'careerEnd': { const j = G.job && Menu.job(G.job.id); return !!j && !!j.careerEndAge && G.age >= j.careerEndAge + (G.vars.careerExtra || 0); }
    case 'debtOverIncome': { if (Menu.isStudent()) return false; const sch = (G.loans || []).filter((l) => l.type === 'scholar' || l.type === 'settle').reduce((a, l) => a + Math.max(0, l.left), 0); return Econ.totalDebt(true) - sch - Math.max(0, G.assets) - Math.max(0, G.cash) > Math.max(50, Econ.annualIncome()) * v; }
    case 'welfareNeed': {
      if (G.age < 18 || Menu.isStudent() || Econ.liquid() >= 10 || Econ.annualIncome() >= 160 + (G.flags.married ? 80 : 0)) return !v;
      const help = Fam.household().some((p) => (['father', 'mother'].includes(p.role) && (p.assets || 0) > 300) || (p.role === 'spouse' && (p.income || 0) > 200));
      return !help === !!v;
    }
    case 'notStudent': return !Menu.isStudent() === !!v;
    case 'liquid': return matchSpec(Econ.liquid(), v, ctx);
    case 'netWorth': return matchSpec(Econ.netWorth(), v, ctx);
    case 'assets': return matchSpec(G.assets, v, ctx);
    case 'homeAway': { const par = people('father|mother'); const hp = par.length ? par[0].pref : G.birthPref; return (G.pref !== hp && !par.some((p) => p.together)) === !!v; }
    case 'whoTogether': return !!ctx.who && !!ctx.who.together === !!v;
    case 'whoSamePref': return !!ctx.who && (ctx.who.pref === G.pref && !ctx.who.together) === !!v;
    case 'whoFar': return !!ctx.who && !Fam.near(ctx.who.pref, G.pref) === !!v;
    case 'whoNearPref': return !!ctx.who && (ctx.who.pref !== G.pref && Fam.near(ctx.who.pref, G.pref)) === !!v;
    case 'whoOtherPref': return !!ctx.who && (ctx.who.pref !== G.pref) === !!v;
    case 'selfWorking': return (Econ.working() && !!G.job && !!G.job.id) === !!v;
    case 'selfEmp': return v.includes(G.employment);
    case 'spouseWorking': { const sp = person('spouse'); return (!!sp && Fam.isWorking(sp) && sp.employment !== 'leave') === !!v; }
    case 'spouseEmp': { const sp = person('spouse'); return !!sp && v.includes(sp.employment); }
    case 'parentHelpable': return people('father|mother').some((p) => p.age < 78 && !p.careLevel && !p.together) === !!v;
    case 'familyCanHelp': return Fam.familyCanHelp() === !!v;
    case 'kidsTogether': return matchSpec(people('child').filter((c) => c.together).length, v, ctx);
    case 'whoRich': return !!ctx.who && ((ctx.who.assets || 0) >= 300) === !!v;
    case 'kidsN': return matchSpec(people('child').length, v, ctx);
    case 'incomeBelowMinimum': return Econ.annualIncome() < 160 + (G.flags.married ? 80 : 0);
    case 'income': return matchSpec(Econ.annualIncome(), v, ctx);
    case 'notMax': return !G.flags[v];
    case 'counterIncreasedThisYear': return (G.counterYear || {})[v] === G.year;
    case 'year': return inRange(calYear(), v);
    case 'date': { const [y, m] = v.split('-').map(Number); return calYear() === y && MONTH[G.q] === m; }
    case 'repayFinished': return (G.loans || []).filter((l) => l.type === 'scholar').every((l) => l.left <= 0) && !!G.flags.scholarship_loan_repaying && (G.loans || []).some((l) => l.type === 'scholar');
    case 'loanFinished': { const l = (G.loans || []).find((x) => x.type === v); return !!l && l.left <= 0; }
    case 'likeTalentGap': { const m = { like_outdoor: 't_sport', like_book: 't_academic', like_draw: 't_art', like_math: 't_academic', like_game: 't_academic' }[likeMain()]; return !!m && G.talents[m] < 40; }
    case 'schoolTripYear': return !!G.school && schoolYearsLeft() === 1 && ['elem', 'jhs', 'hs'].includes(G.stage) && (G.stage === 'hs' ? G.q === 2 : G.q === 0);
    case 'climate': return v.includes(pref().climate);
    case 'ruralMin': return pref().rural >= v;
    case 'physicalLoadMin': return G.stats.physicalLoad >= v;
    case 'pensionStartsNow': return !!G.vars.pensionAge && G.age === G.vars.pensionAge && G.q === 0;
    case 'companyHousing': return !!G.job && !!(Menu.job(G.job.id) || {}).companyHousing || ['civil_servant'].includes(G.employment) || (G.job && ['j_police', 'j_sdf', 'j_firefighter', 'j_maker_tech', 'j_factory', 'j_bank', 'j_trading'].includes(G.job.id));
    case 'aiRisk': return matchSpec(Econ.aiRisk(), v, ctx);
    case 'aiRiskMax': return Econ.aiRisk() < v;
    case 'aiWavePassed': { const r = G.job && D().ai_impact.jobs[G.job.id]; return !!r && calYear() >= (r.wave || 2035); }
    case 'engine': return false; // エンジンが直接起こす
    case 'tier': return v.includes(tier());
    case 'wealthMin': return G.talents.familyWealth >= v;
    case 'flags': return test(v, ctx);
    case 'note': return true;
    default:
      if (!Cond.warned[k]) { Cond.warned[k] = 1; console.warn('未対応の条件', k); }
      return true;
  }
}
// 重みの補正（weight.mul / riskMul の条件文字列）
function term(s) {
  if (!s) return false;
  let m = s.match(/^([\w.]+)\s*(>=|<=|>|<|==)\s*([\d.]+)$/);
  if (m) return cmp(statVal(m[1]), m[2], +m[3]);
  m = s.match(/^(\w+):(.+)$/);
  if (m) {
    const [, a, b] = m;
    switch (a) {
      case 'club': return b === 'c_none' ? G.clubs.length === 0 : G.clubs.some((c) => c.id === b);
      case 'circle': return G.clubs.some((c) => c.id === b);
      case 'region': return tier() === b;
      case 'employment': return G.employment === b;
      case 'gender': return G.gender === b;
      case 'jobCat': return !!G.job && (Menu.job(G.job.id) || {}).cat === b;
      case 'stage': return G.stage === b;
      case 'dept': return G.vars.major === b;
      case 'child': return people('child').length > 0;
      case 'var': { const [k, val] = b.split('='); return String(G.vars[k]) === val; }
      default: return false;
    }
  }
  switch (s) {
    case 'likeMismatch': { const c = G.clubs[0] && Menu.club(G.clubs[0].id); return !!c && !(c.tags || []).includes(likeMain()); }
    case 'incomeStable': return ['seishain', 'civil_servant'].includes(G.employment);
    case 'parentCareNeed': return people('father|mother').some((p) => p.careLevel >= 1);
    default: return hasFlag(s);
  }
}
function weightOf(wt) {
  if (!wt) return 1;
  let w = wt.base ?? 1;
  for (const [t, m] of wt.mul || []) if (term(t)) w *= m;
  return w;
}
function riskMulOf(list) {
  let m = 1;
  for (const [t, x] of list || []) {
    if (x === 'curve') { const th = G.talents[t] ?? 50; m *= 1.5 - th / 100; continue; }
    if (term(t)) m *= x;
  }
  return m;
}
const schoolYearsLeft = () => (G.school ? G.school.years - G.school.yearIn + 1 : 0);
const Cond = { test, term, weightOf, riskMulOf, matchSpec, statVal, hasFlag, likeMain, personMatch, childMatch, warned: {}, dyn, cmp };
