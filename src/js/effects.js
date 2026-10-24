'use strict';
// ===== 効果 effects の実行（docs/09 §10-3, §10-3-2） =====
const Effects = (() => {
  const num = (v, ctx) => { if (typeof v === 'number') return v; if (typeof v !== 'string') return 0; return expr(v, ctx); };
  // "-$downPayment-$acquisitionTax" のような式
  function expr(s, ctx) {
    let t = 0;
    const parts = s.match(/[+-]?\$?[\w.:]+/g) || [];
    for (const p of parts) {
      const sign = p.startsWith('-') ? -1 : 1;
      const body = p.replace(/^[+-]/, '');
      const v = body.startsWith('$') ? Text.dynValue(body.slice(1), ctx) : parseFloat(body);
      t += sign * (typeof v === 'number' ? v : parseFloat(v) || 0);
    }
    return t;
  }
  const resolve = (v, ctx) => (typeof v === 'string' && v.startsWith('$') ? Text.dynValue(v.slice(1), ctx) : v);

  function stat(k, d) {
    if (!d) return;
    if (k in G.stats) G.stats[k] = clamp(G.stats[k] + d, 0, 100);
    else if (k.startsWith('subj.')) { const s = k.slice(5); if (s === 'All') { for (const x of Object.keys(G.subj)) G.subj[x] = clamp(G.subj[x] + d, 1, 99); } else G.subj[s] = clamp((G.subj[s] ?? 50) + d, 1, 99); }
    else if (k.startsWith('skill.')) G.skill[k.slice(6)] = clamp((G.skill[k.slice(6)] || 0) + d, 0, 100);
    else if (k === 'subjAll') for (const x of Object.keys(G.subj)) G.subj[x] = clamp(G.subj[x] + d, 1, 99);
  }
  function setFlag(f, on, ctx) {
    f = resolve(f, ctx); if (!f) return;
    if (G.mode === 'gentle' && on && ['arrest', 'hodou', 'divorced', 'widowed', 'conviction', 'dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast'].includes(f)) return;
    if (on) G.flags[f] = true; else delete G.flags[f];
    if (on && f === 'married') { G.vars.marriedYear = G.year; G.vars.marriageNo = (G.vars.marriageNo || 0) + 1; }
  }

  function apply(ef, ctx = {}) {
    if (!ef || typeof ef !== 'object') return;
    const logs = ctx.logs || (ctx.logs = []);
    for (const [k, v] of Object.entries(ef)) {
      switch (k) {
        case 'stats': for (const [s, d] of Object.entries(v)) stat(s, num(d, ctx)); break;
        case 'subj': for (const [s, d] of Object.entries(v)) stat('subj.' + s, num(d, ctx)); break;
        case 'skill': for (const [s, d] of Object.entries(v)) stat('skill.' + s, num(d, ctx)); break;
        case 'skillClub': { const c = G.clubs[0] && Menu.club(G.clubs[0].id); const sk = c && Object.keys(c.yearly || {}).find((x) => x.startsWith('skill.')); if (sk) stat(sk, v); break; }
        case 'cash': G.cash += num(v, ctx); break;
        case 'cash_household': G.household.cash = (G.household.cash ?? 100) + num(v, ctx); if (num(v, ctx) < -50) G.talents.familyWealth = Math.max(0, G.talents.familyWealth - 1); break;
        case 'cash_child': if (G.age >= 16) G.cash += num(v, ctx); else G.vars.childSavings = (G.vars.childSavings || 0) + num(v, ctx); break;
        case 'cashYearly': G.vars.recurring = G.vars.recurring || []; G.vars.recurring.push({ v: num(v, ctx), left: ef.yearsOf || 99, from: ctx.ev && ctx.ev.id }); break;
        case 'yearsOf': break;
        case 'debt': if (v === '=0') { G.loans = (G.loans || []).filter((l) => l.type === 'mortgage' && !ef.assetsSeize); if (G.cash < 0) G.cash = 0; } else Econ.addLoan('startup', num(v, ctx), 0.03).yearly = num(v, ctx) / 7; break;
        case 'debtMul': for (const l of G.loans || []) if (l.type !== 'mortgage') { l.left *= v; } if (G.cash < 0) G.cash *= v; break;
        case 'assetsSeize': G.assets = 0; G.vars.houseValue = 0; G.loans = (G.loans || []).filter(() => false); break;
        case 'set': (v || []).forEach((f) => setFlag(f, true, ctx)); break;
        case 'clear': (v || []).forEach((f) => setFlag(f, false, ctx)); break;
        case 'setByStage': if (v[G.stage]) setFlag(v[G.stage], true, ctx); break;
        case 'setIfPositive': if ((ctx.estate || 0) > 0) v.forEach((f) => setFlag(f, true, ctx)); break;
        case 'chanceSet': for (const [f, p] of Object.entries(v)) if (chance(p)) setFlag(f, true, ctx); break;
        case 'counter': for (const [c, d] of Object.entries(v)) { G.counters[c] = (G.counters[c] || 0) + num(d, ctx); G.counterYear = G.counterYear || {}; G.counterYear[c] = G.year; } break;
        case 'var': for (const [n, x] of Object.entries(v)) {
          if (x === '+1') G.vars[n] = (G.vars[n] || 0) + 1;
          else { const r = resolve(x, ctx); G.vars[n] = r; if (n === 'surname') G.surname = r; if (n === 'target' && ctx.pick && r === ctx.pick.id) Menu.remember(ctx.pick); }
          if (n === 'like3' || n === 'like6') Engine.onLike(n);
        } break;
        case 'focus': { const f = resolve(v, ctx); if (f) Engine.setFocus(f, true); break; }
        case 'school': School.apply(v, ctx); break;
        case 'nextStage': School.setStage(v); break;
        case 'extendStage': if (G.school) G.school.years += v; break;
        case 'job': Work.apply(v, ctx); break;
        case 'club': Clubs.apply(v, ctx); break;
        case 'hobby': if (v.add) { const id = resolve(v.add, ctx); if (id && !G.hobbies.includes(id)) G.hobbies.push(id); } break;
        case 'person': People.apply(v, ctx); break;
        case 'personRelation': for (const [r, d] of Object.entries(v)) { const tg = r === '$parent' ? (ctx.who ? [ctx.who] : people('father|mother')) : r === 'child' && ctx.child ? [ctx.child] : people(r); tg.forEach((p) => (p.relation = clamp(p.relation + d, 0, 100))); } break;
        case 'personSet': if (ctx.who) for (const [a, b] of Object.entries(v)) ctx.who[a] = b === '+1' ? (ctx.who[a] || 0) + 1 : b; break;
        case 'childSet': { const c = ctx.child || people('child').slice(-1)[0]; if (c) Object.assign(c, v); break; }
        case 'childRoll': { const c = ctx.child; if (c) { if (v === 'juken') c.juken = chance(0.5); c.extraCost = (c.extraCost || 0); } break; }
        case 'childCostStage': { const c = ctx.child; if (c) { const st = resolve(v, ctx); c.costStage = st === 'univ' && chance(0.4) ? 'univ_away' : st; if (st === 'none') c.stage = 'work'; } break; }
        case 'childAllowance': break; // 毎季節の計算で入る
        case 'childBurden': { const c = people('child').find((x) => x.age >= 25); if (c) c.relation = clamp(c.relation - 5, 0, 100); break; }
        case 'childOrphanCheck': break;
        case 'schedule': for (const s of v) { if (s.ifAdult && G.age < 18) continue; Engine.schedule(s.event, rangeInt(s.inYears || [0, 0]), s.season, ctx); } break;
        case 'log': logs.push(Text.fill(v, ctx)); break;
        case 'rentMonthly': G.vars.rentMonthly = num(v, ctx); break;
        case 'rentIncomeMonthly': G.vars.rentIncomeMonthly = num(v, ctx); break;
        case 'rentIncomeMul': G.vars.rentIncomeMonthly = (G.vars.rentIncomeMonthly || 0) * v; break;
        case 'vacantMonths': G.cash -= (G.vars.rentIncomeMonthly || 5) * v; break;
        case 'riskMul': G.vars.riskMul = G.vars.riskMul || {}; for (const [e, m] of Object.entries(v)) G.vars.riskMul[e] = (G.vars.riskMul[e] || 1) * m; break;
        case 'deathRiskMul': G.vars.deathRiskMul = (G.vars.deathRiskMul || 1) * v; break;
        case 'delay': break;
        case 'move': Life.move(resolve(v.to, ctx), ctx); break;
        case 'householdCost': G.household.extraCost = (G.household.extraCost || 0) + v; break;
        case 'householdStress': stat('stress', v); break;
        case 'wealthDelta': G.talents.familyWealth = clamp(G.talents.familyWealth + v, 0, 100); G.household.income = wealthIncome(G.talents.familyWealth); break;
        case 'allowance': G.vars.childSupport = true; break;
        case 'splitAssets': G.cash = G.cash / 2; G.assets /= 2; break;
        case 'custody': People.custody(v); break;
        case 'loan': { const amt = num(v.amount, ctx); const l = Econ.addLoan(v.type, amt, v.rate); l.yearly = annuity(amt, v.rate || 0, v.years || 10); l.start = G.year; if (v.type === 'mortgage') { G.vars.houseValue = Text.housePrice(); } break; }
        case 'loanClose': G.loans = (G.loans || []).map((l) => (l.type === v ? { ...l, left: 0 } : l)); break;
        case 'loanPrepay': { const l = (G.loans || []).find((x) => x.type === 'mortgage'); if (l) { l.left = Math.max(0, l.left - v); G.cash -= v; } break; }
        case 'loanRate': case 'loanRateUp': { const l = (G.loans || []).find((x) => x.type === 'mortgage'); if (l) { l.rate = k === 'loanRate' ? v : (l.rate || 0) + v; l.yearly = annuity(l.left, l.rate, Math.max(5, 35 - (G.year - l.start))); } break; }
        case 'repayMul': { const l = (G.loans || []).find((x) => x.type === 'scholar'); if (l) l.yearly *= v; break; }
        case 'repayYearsMul': break;
        case 'pauseRepay': { const l = (G.loans || []).find((x) => x.type === 'scholar'); if (l) { l.paused = true; Engine.schedule('__unpause', v, null, ctx); } break; }
        case 'roll': break; // 効果の中の判定（説明用）
        case 'interest': G.cash -= 3; break;
        case 'earlyDetect': if (ctx.kenshinBad) G.vars.kenshinFlag = true; break;
        case 'setCancerFlag': if (G.mode !== 'gentle') setFlag('dz_cancer_' + (G.vars.cancerType || 'stomach'), true, ctx); break;
        case 'recoverIn': Engine.schedule('ev_f_recover_depression', rangeInt(v), null, ctx); break;
        case 'promotionBonus': G.vars.promotionBonus = (G.vars.promotionBonus || 0) + v; break;
        case 'jobOvertimeDelta': if (G.job) G.job.overtimeDelta = (G.job.overtimeDelta || 0) + v; break;
        case 'jobHoursMul': if (G.job) G.job.hoursMul = (G.job.hoursMul || 1) * v; break;
        case 'jobLoadDelta': if (G.job) { G.job.loadDelta = G.job.loadDelta || { physical: 0, mental: 0 }; G.job.loadDelta.physical += v.physical || 0; G.job.loadDelta.mental += v.mental || 0; } break;
        case 'hqMove': setFlag('hq_assign', true, ctx); break;
        case 'benefit': { const g = Econ.jobGross() || G.vars.lastGross || 200; G.vars.benefitLeft = Math.round(g * 0.6 * 0.5); G.vars.benefitQ = Math.round(G.vars.benefitLeft / 2); break; }
        case 'incomeMul': if (G.job) G.job.mul = (G.job.mul || 1) * v; break;
        case 'raiseMul': G.vars.raiseMul = v; break;
        case 'sideIncome': G.vars.sideIncome = Math.round(rangeVal(v)); break;
        case 'invest': Life.invest(v, ctx); break;
        case 'selfCare': G.vars.selfCare = v; G.vars.careCost = v * 15; break;
        case 'abroad': if (v === true) { const c = ctx.child; if (c) c.extraCost = (c.extraCost || 0) + 0; G.cash -= 200; } else { const a = resolve(v, ctx); const s = Menu.school(a); if (s) { (s.grant || []).forEach((f) => setFlag(f, true)); for (const [x, d] of Object.entries(s.growth || {})) stat(x in G.stats ? x : 'subj.' + x, d); if (G.age >= 16) G.cash -= s.cost; else G.household.cash -= s.cost; } } break;
        case 'insuranceIf': if (G.flags[v]) G.cash += 200; break;
        case 'insurancePayout': { const p = num(v, ctx); G.cash += p; G.received.insurance = (G.received.insurance || 0) + p; break; }
        case 'sellHouse': if (G.flags.owns_house) { const l = (G.loans || []).find((x) => x.type === 'mortgage'); G.cash += (G.vars.houseValue || 1500) - (l ? l.left : 0); if (l) l.left = 0; setFlag('owns_house', false); setFlag('mortgage', false); G.vars.houseValue = 0; G.vars.rentMonthly = 8; setFlag('renting', true); } break;
        case 'inheritanceSmooth': G.vars.will = true; break;
        case 'inheritance': People.inherit(ctx); break;
        case 'survivorPension': G.vars.survivorPension = true; break;
        case 'incomeLossDays': if (G.job) G.cash -= Math.round(Econ.jobGross() / 250 * v); break;
        case 'commuteCost': break;
        case 'renewContract': G.jobYears = G.jobYears; break;
        case 'menuNext': ctx.menuNext = v; break;
        case 'showCash': G.flags.showCash = true; break;
        case 'scholarRepayStartIfLoan': if (G.flags.scholarship_loan) Engine.schedule('ev_m_scholar_repay', 0, 'Q2', ctx); break;
        case 'clearIfCareTarget': if (ctx.who && G.vars.careTarget === ctx.who.id) v.forEach((f) => setFlag(f, false)); break;
        case 'grantGraduateFlags': School.graduateFlags(); break;
        case 'teacherLicenseIfCourse': if (G.flags.teacher_course) { setFlag(G.vars.major === 'edu' ? 'lic_teacher_elem' : 'lic_teacher_sec', true); if (G.vars.major === 'edu') setFlag('lic_teacher_sec', true); } break;
        case 'rankUp': Work.rankUp(ctx); break;
        case 'endGame': Engine.die(G.deathCause || '病気'); break;
        case 'autoplayChoices': G.vars.autoplay = v; break;
        case 'livingCostMul': G.vars.livingCostMul = (G.vars.livingCostMul || 1) * v; break;
        case 'silent': case 'silentIfSmall': ctx.silent = !!v && (k === 'silent' || (G.lastDelta && G.lastDelta.bonus < 5)); break;
        default: if (!Effects.warned[k]) { Effects.warned[k] = 1; console.warn('未対応の効果', k); }
      }
    }
  }
  const annuity = (P, r, n) => (r > 0 ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / Math.max(1, n));
  return { apply, stat, setFlag, num, resolve, annuity, warned: {} };
})();

// ===== 学校 =====
const School = {
  apply(v, ctx) {
    if (v.enter) {
      let id = Effects.resolve(v.enter, ctx);
      if (id === 'jh_free_or_el_free') id = G.age < 12 ? 'el_free' : 'jh_public';
      if (!id || id === 'none') return;
      if (Menu.job(id) && !Menu.school(id.split('#')[0])) return; // 就職先が target に入っているとき
      this.enter(id, ctx);
    }
    if (v.leave) this.leave(v.leave);
    if (v.transfer) { const id = Effects.resolve(v.transfer, ctx); this.enter(id, ctx); }
  },
  enter(id, ctx = {}) {
    const p = Menu.picked(id) || (ctx.pick && ctx.pick.id === id ? ctx.pick : null);
    const tmplId = (p && p.tmpl) || id.split('#')[0];
    const t = Menu.school(tmplId) || {};
    if (D().schools.preschool.some((x) => x.id === tmplId) && !t.stage) { for (const [k, d] of Object.entries(t.effects || {})) Effects.stat(k, d); return; } // 家庭で過ごす
    const stage = (p && p.stage) || t.stage || (D().schools.postSecondary.vocational.some((x) => x.id === tmplId) ? 'vocational' : D().schools.postSecondary.juniorCollege.some((x) => x.id === tmplId) ? 'junior_college' : 'univ');
    const years = (p && p.years) || t.years || { elem: 6, free_school: 6, jhs: 3, hs: 3, hs_corr: 3, hs_night: 4, kosen: 5, nursery: 3, kindergarten: 3, univ: 4, univ_med: 6, junior_college: 2, vocational: 2, grad_master: 2, grad_doctor: 3, grad_prof: 2 }[stage] || 3;
    const name = (p && p.name) || (t.label ? Menu.schoolName(t) : id);
    if (p) Menu.remember(p);
    G.school = { id, tmpl: tmplId, pick: id, name, emoji: t.emoji || (p && p.emoji) || '🏫', years, yearIn: 1, quality: t.quality || 1, cost: (p && p.cost) ?? t.cost ?? 0, h: p ? p.h : null };
    G.stage = stage;
    (t.grant || []).forEach((f) => Effects.setFlag(f, true));
    if (D().schools.preschool.some((x) => x.id === tmplId)) { for (const [k, d] of Object.entries(t.effects || {})) { if (k === 'subj') for (const [a, b] of Object.entries(d)) G.vars['pre_' + a] = b; else if (k in G.stats) Effects.stat(k, d); } G.household.extraCost = (G.household.extraCost || 0) + (t.cost || 0); }
    if (p && p.dept) { G.vars.major = p.dept; const d = Menu.dept(p.dept); if (d) (d.autoSet || []).forEach((f) => Effects.setFlag(f, true)); }
    else if (['vocational', 'grad_master', 'grad_doctor', 'grad_prof'].includes(stage)) G.vars.major = tmplId;
    if (p && (p.city || p.where === 'abroad')) { G.vars.schoolAway = true; if (p.city === 'tokyo' && G.pref !== 'tokyo') Effects.setFlag('moved_to_tokyo', true); }
    else G.vars.schoolAway = false;
    if (p && p.entry) { if (G.age >= 18 && G.flags.scholarship_loan) G.cash -= 0; G.household.cash = (G.household.cash ?? 100) - p.entry; }
    if (tmplId === 'vo_civil') G.flags.vo_civil_bonus = true;
    if (stage === 'elem' && !G.subjInit) Engine.initSubjects();
    G.vars.target = 'none';
  },
  leave(how) {
    if (!G.school) return;
    if (how === 'graduate') this.graduateFlags();
    if (how === 'dropout') { const m = { hs: 'edu_hs_dropout', hs_corr: 'edu_hs_dropout', hs_night: 'edu_hs_dropout', univ: 'edu_univ_dropout', univ_med: 'edu_univ_dropout' }[G.stage]; if (m) Effects.setFlag(m, true); }
    G.lastSchool = G.school.name;
    G.school = null; G.stage = 'none';
    G.clubs = G.clubs.filter((c) => (Menu.club(c.id) || {}).age); // 部活は学校を出たら終わり（習い事は残す）
    if (G.job && G.job.form === 'student_part') { G.job = null; G.employment = 'none'; }
  },
  graduateFlags() {
    const st = G.stage, t = G.school ? Menu.school(G.school.tmpl) : null;
    const F = { jhs: ['edu_jhs_grad'], hs: ['edu_hs_grad'], hs_corr: ['edu_hs_grad'], hs_night: ['edu_hs_grad'], kosen: ['edu_kosen_grad', 'edu_hs_grad'], univ: ['edu_univ_grad'], univ_med: ['edu_univ_grad', 'edu_med_grad'], junior_college: ['edu_jc_grad'], vocational: ['edu_vocational_grad'], grad_master: ['edu_master_grad'], grad_doctor: ['edu_doctor_grad'], grad_prof: ['edu_master_grad'] }[st] || [];
    F.forEach((f) => Effects.setFlag(f, true));
    if (t) { (t.onGraduate || []).forEach((f) => Effects.setFlag(f, true)); (t.grantOnGrad || []).forEach((f) => Effects.setFlag(f, true)); for (const [f, p] of Object.entries(t.onGraduateChance || {})) if (chance(p)) Effects.setFlag(f, true); }
  },
  setStage(st) {
    if (st === 'ronin') { if (G.school) this.leave('graduate'); G.stage = 'ronin'; G.counters.ronin_years = (G.counters.ronin_years || 0) + 1; G.school = { id: 'ronin', tmpl: 'ronin', name: '予備校', emoji: '📚', years: 1, yearIn: 1, quality: 1.05, cost: 80 }; return; }
    if (st === 'hikikomori') { G.stage = 'hikikomori'; return; }
    G.stage = st;
  },
};

// ===== 仕事 =====
const Work = {
  apply(v, ctx) {
    if (v.hire) { const id = Effects.resolve(v.hire, ctx); if (id) this.hire(id, v.form, ctx); }
    if (v.fallback && !G.job) this.hire(v.fallback, null, ctx);
    if (v.form && !v.hire) this.setForm(v.form);
    if (v.quit) this.quit(v.quit);
    if (v.retire) this.retire();
    if (v.reemploy) { Effects.setFlag('reemployed', true); }
    if (v.leave) { G.employment = 'leave'; Effects.setFlag('leave_exp', true); Engine.schedule('__return_leave', v.leave, null, ctx); }
    if (v.returnFromLeave && G.employment === 'leave') G.employment = G.job ? G.job.form : 'none';
    if (v.riskFire && chance(v.riskFire)) this.quit('fired');
    if (v.riskQuit && chance(v.riskQuit)) this.quit('self');
  },
  hire(id, form, ctx) {
    const j = Menu.job(id); if (!j) return;
    if (j.wage) { // 学生アルバイト（本業とは別）
      if (Menu.isStudent() || form === 'student_part') { G.job = G.job && !G.job.part ? { ...G.job, part: id } : { id: null, part: id, form: 'student_part' }; if (!G.job.id) G.employment = 'student_part'; return; }
    }
    const old = G.job && G.job.id;
    let f = form || j.form || 'seishain';
    if (!form && !j.form && j.nonRegularRate && chance(j.nonRegularRate * 0.6)) f = chance(0.5) ? 'keiyaku' : 'haken';
    if (j.id === 'j_parttime_general') f = 'part';
    // 出世の段：同じ track なら1段下げて引きつぐ
    const oldTrack = Econ.rankTrack();
    G.job = { id, form: f, startAge: Math.min(G.age, (G.job && G.job.startAge) ?? G.age), since: G.year, mul: 1 };
    const nt = Econ.rankTrack();
    G.rank = oldTrack && nt && oldTrack.id === nt.id ? Math.max(0, (G.rank || 0) - 1) : 0;
    G.counters.promotion_level = G.rank;
    G.jobYears = 0;
    G.employment = f === 'student_part' ? 'student_part' : f;
    (j.grantOnHire || []).forEach((x) => Effects.setFlag(x, true));
    if (j.blackRisk && chance(j.blackRisk)) Effects.setFlag('black_company', true); else if (old) Effects.setFlag('black_company', false);
    Effects.setFlag('naitei', false); Effects.setFlag('job_hunting', false);
    if (j.careerEndAge) G.vars.careerEnd = rangeInt(j.careerEndAge);
    G.vars.workAway = false;
  },
  setForm(f) { if (!G.job) return; G.job.form = f; G.employment = f; if (!['seishain', 'civil_servant'].includes(f)) G.rank = 0; },
  quit(how) {
    if (!G.job) return;
    G.vars.lastGross = Econ.jobGross();
    G.lastJob = Menu.job(G.job.id) ? Menu.job(G.job.id).label : '';
    G.job = null; G.rank = 0; G.jobYears = 0;
    G.employment = how === 'retire' ? 'retired' : 'unemployed';
    if (how === 'fired') Effects.setFlag('unemployment_exp', true);
    Effects.setFlag('manager', false);
  },
  retire() { this.quit('retire'); G.employment = 'retired'; Effects.setFlag('retired_flag', true); },
  rankUp(ctx) {
    const s = Econ.nextStep(); if (!s) return;
    G.rank = (G.rank || 0) + 1; G.counters.promotion_level = G.rank;
    if (s.mgr) Effects.setFlag('manager', true);
  },
};

// ===== 部活・習い事 =====
const Clubs = {
  apply(v, ctx) {
    if (v.join) { const id = Effects.resolve(v.join, ctx); if (id) this.join(id); }
    if (v.quit) { const c = G.clubs.shift(); if (c) G.vars.quitClub = c.id; }
  },
  join(id) {
    const c = Menu.club(id); if (!c) return;
    if (G.clubs.some((x) => x.id === id)) return;
    // 合計 time ≤ 4（docs clubs.json）
    let total = G.clubs.reduce((a, x) => a + ((Menu.club(x.id) || {}).time || 0), 0);
    while (G.clubs.length && total + (c.time || 0) > D().clubs.rules.maxTime) { const r = G.clubs.shift(); total -= (Menu.club(r.id) || {}).time || 0; }
    if (c.id === 'c_none' || c.id === 'u_none') return;
    G.clubs.push({ id, since: G.year });
    (c.set || []).forEach((f) => Effects.setFlag(f, true));
  },
};

// ===== 人物 =====
const People = {
  apply(v, ctx) {
    if (v.add) this.add(v.add, ctx, v);
    if (v.promote) { const [a, b] = v.promote.split('>'); const p = person(a); if (p) { p.role = b; p.since = G.year; if (b === 'spouse') { p.income = p.income || Math.round(normal(300, 120)); } } }
    if (v.end) { const [a, b] = v.end.split('>'); const p = person(a); if (p) { if (b === 'apart') { p.apart = true; p.role = a; p.livesApart = true; p.alive = true; p.away = true; G.people = G.people.filter((x) => x !== p); G.vars.apartParent = p; } else { p.role = b || 'ex'; } } }
    if (v.kill) { const target = v.kill === '$who' ? ctx.who : person(v.kill); if (target) this.kill(target, ctx); }
    if (v.relation) { const tg = v.relation === 'spouse' || v.relation === 'partner' ? person(v.relation) : ctx.who; if (tg) tg.relation = clamp(tg.relation + (v.delta || 0), 0, 100); }
  },
  add(role, ctx, v = {}) {
    const N = D().names;
    if (role === 'partner') {
      const g = G.gender === 'M' ? 'F' : 'M';
      const p = newPerson('partner', { name: pick(N.given[g])[0], gender: g, age: clamp(G.age + rint(-3, 3), Math.max(G.age - 5, 11), 120), since: G.year, relation: rint(55, 75), surname: pick(N.surnames.filter((s) => s[0] !== G.surname))[0] });
      G.people.push(p); G.vars.partnerSurname = p.surname; G.counters.partners_past = (G.counters.partners_past || 0) + 1;
    } else if (role === 'sibling') {
      const d = ctx.sibData || {};
      const p = newPerson('sibling', { name: d.name || pick(N.given[d.gender || 'M'])[0], gender: d.gender || (chance(0.5) ? 'M' : 'F'), age: 0, older: false });
      G.people.push(p); ctx.sib = p;
    } else if (role === 'child') {
      const g = chance(0.51) ? 'M' : 'F';
      const p = newPerson('child', { name: pick(N.given[g])[0], gender: g, age: 0, relation: 80, born: calYear() });
      G.people.push(p); ctx.child = p;
    } else if (role === 'grandchild') {
      const par = ctx.child; const g = chance(0.5) ? 'M' : 'F';
      const p = newPerson('grandchild', { name: pick(N.given[g])[0], gender: g, age: 0, relation: 85, parentIds: par ? [par.id] : [] });
      G.people.push(p);
    }
  },
  kill(p, ctx) {
    if (G.mode === 'gentle') return;
    p.alive = false; p.diedAge = p.age; p.diedYear = calYear();
    if (p.role === 'spouse') { G.flags.married = false; delete G.flags.married; G.flags.widowed = true; }
    if (p.role === 'partner') delete G.flags.has_partner;
    if (G.vars.careTarget === p.id) { delete G.flags.caregiving; G.vars.careTarget = 'none'; }
    if (p.role === 'father' || p.role === 'mother') ctx.estate = this.estate(p);
  },
  estate(p) {
    const w = G.talents.familyWealth;
    const base = w < 15 ? normal(-100, 200) : w < 35 ? normal(200, 300) : w < 65 ? normal(900, 600) : w < 85 ? normal(3000, 1500) : normal(9000, 4000);
    const sibs = people('sibling').length + 1;
    return Math.round(base / sibs / (person('father') && person('mother') ? 2 : 1));
  },
  inherit(ctx) {
    const e = ctx.estate ?? 0;
    if (e > 0) { const exempt = 3000 + 600 * (people('sibling').length + 1); let tax = 0; if (e > exempt) tax = (e - exempt) * 0.15; G.cash += e - tax; G.tax.inheritanceTax = (G.tax.inheritanceTax || 0) + tax; ctx.inheritText = `親の遺産を相続した。${Math.round(e - tax).toLocaleString('ja-JP')}万円が入った。`; }
    else ctx.inheritText = D().text_pools.inheritMinus;
  },
  custody(how) {
    const kids = people('child').filter((c) => c.age < 20);
    if (!kids.length) return;
    const mine = how === 'court' ? chance(G.gender === 'F' ? 0.85 : 0.2) : chance(G.gender === 'F' ? 0.8 : 0.3);
    if (mine) { Effects.setFlag('single_parent', true); }
    else { kids.forEach((c) => { c.livesApart = true; }); G.vars.childSupport = 4 * kids.length; }
  },
};

// ===== 住まい・投資など =====
const Life = {
  move(to, ctx) {
    if (!to) return;
    let id = to;
    if (to === 'home') id = G.birthPref; else if (to === 'random') id = Text.dynValue('newPref', ctx);
    if (!prefOf(id)) return;
    if (id !== G.pref) { G.pref = id; Effects.stat('social', -15); G.counters.moves = (G.counters.moves || 0) + 1; }
    if (id === 'tokyo' && G.birthPref !== 'tokyo') Effects.setFlag('moved_to_tokyo', true);
    if (to === 'home' && G.flags.moved_to_tokyo) Effects.setFlag('u_turn', true);
  },
  invest(v, ctx) {
    if (v.monthly) { G.vars.nisaMonthly = v.monthly; }
    if (v.sellAll) { G.cash += G.assets; G.assets = 0; G.vars.nisaMonthly = 0; Effects.setFlag('nisa', false); }
    if (v.buy) { G.cash -= v.buy; G.assets += v.buy; }
    if (v.hold) { /* 何もしない：数年で回復する */ }
  },
};
