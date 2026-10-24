'use strict';
// ===== お金・税金・年金・出世（docs/09 §2-3, §5①、data/jobs.json, taxes.json, housing.json, ranks.json） =====
const Econ = (() => {
  const T = () => D().taxes;
  const tierKey = () => (G.pref === 'tokyo' ? 'tokyo' : tier());
  const WORKING = ['seishain', 'keiyaku', 'haken', 'part', 'freelance', 'self_employed', 'civil_servant', 'executive'];
  const working = () => WORKING.includes(G.employment);

  // ---- 給料 ----
  function salaryCurve(j, age, startAge) {
    const [s0, s1, pk] = j.salary || [200, 300, 45];
    const t = Math.min(1, Math.max(0, (age - startAge) / Math.max(1, pk - startAge)));
    let v = s0 + (s1 - s0) * Math.sin((Math.PI / 2) * t);
    if (age > pk) v *= Math.pow(0.995, age - pk);
    return v;
  }
  function salaryPreview(j) {
    const f = D().jobs.forms[j.form || 'seishain'] || { salaryMul: 1 };
    return Math.round((j.salary ? j.salary[0] : 200) * pref().wage * f.salaryMul);
  }
  // 本業の年収（額面・万円）
  function jobGross() {
    if (!G.job || !working()) return 0;
    const j = Menu.job(G.job.id);
    if (!j) return 0;
    if (j.wage) return Math.round(j.wage * j.hoursWeek * 50 / 10000); // バイト
    const f = D().jobs.forms[G.job.form] || D().jobs.forms.seishain;
    let v = salaryCurve(j, G.age, G.job.startAge ?? G.age) * pref().wage * (f.salaryMul ?? 1);
    v *= 1 + rankInc();
    v *= G.job.mul || 1;
    for (const [fl, up] of Object.entries(j.salaryFlagUp || {})) if (G.flags[fl]) v += up;
    if (G.flags.reemployed) v *= 0.6;
    if (G.job.hoursMul) v *= G.job.hoursMul;
    if (G.employment === 'leave') v *= 0.67;
    return Math.max(0, Math.round(v));
  }
  function sideGross() {
    let v = 0;
    if (G.job && G.job.part) { const p = Menu.job(G.job.part); if (p) v += p.wage * p.hoursWeek * 50 / 10000 * (G.focus === 'focus_parttime' ? 2 : 1); }
    if (G.vars.sideIncome) v += G.vars.sideIncome;
    return Math.round(v);
  }
  const annualIncome = () => jobGross() + sideGross() + pensionAnnual();
  const monthlyIncome = () => Math.round((jobGross() / (12 + (hasBonus() ? D().job_display.pay.bonusMonthsByForm[G.job.form] ?? 4 : 0))) * 10) / 10;
  const hasBonus = () => !!G.job && (D().jobs.forms[G.job.form] || {}).bonus === true && G.employment !== 'leave';

  // ---- 出世（ranks.json） ----
  function rankTrack() { if (!G.job) return null; return D().ranks.tracks.find((t) => t.jobs.includes(G.job.id)) || null; }
  function steps() { const t = rankTrack(); if (!t) return []; return (G.job.officer && t.officerSteps) || t.steps; }
  function nextStep() { const s = steps(); return s[(G.rank || 0) + 1] || null; }
  function curStep() { const s = steps(); return s[G.rank || 0] || null; }
  function rankInc() { const s = steps(); let v = 0; for (let i = 1; i <= (G.rank || 0) && i < s.length; i++) v += s[i].inc || 0.08; return v; }
  function nextStepRate(kind = 'roll') {
    const st = nextStep(); if (!st) return 0;
    const R = D().ranks.rules;
    const w = kind === 'exam' ? R.examWeights : R.rollWeights;
    let p = st.p || 0.2;
    for (const [k, x] of Object.entries(w)) p += ((Cond.statVal(k) - 50) / 100) * x;
    p += (R.focusBonus[G.focus] || 0) + (G.vars.promotionBonus || 0);
    return clamp(p, 0.03, 0.9);
  }
  const overtime = () => (G.job ? ((Menu.job(G.job.id) || {}).overtime || 10) + (G.job.overtimeDelta || 0) + (G.focus === 'focus_work' ? 10 : 0) : 0);
  const aiRisk = () => { const r = G.job && D().ai_impact.jobs[G.job.id]; return r ? r.risk : 0; };

  // ---- 年金（とてもざっくり：基礎年金＋厚生年金） ----
  function pensionMonthly() {
    const yrs = Math.min(40, G.hist.employeeYears || 0);
    const avg = (G.hist.employeeIncomeSum || 0) / Math.max(1, G.hist.employeeYears || 1);
    let m = 6.5 * Math.min(1, ((G.hist.paidYears || 0) + 2) / 40) + (avg * 0.005481 * yrs) / 12;
    const pa = G.vars.pensionAge || 65;
    if (pa > 65) m *= 1 + 0.007 * 12 * (pa - 65);
    if (pa < 65) m *= 1 - 0.004 * 12 * (65 - pa);
    return Math.round(m * 10) / 10;
  }
  const pensionAnnual = () => (G.vars.pensionAge && G.age >= G.vars.pensionAge ? pensionMonthly() * 12 : 0);

  // ---- 税金（taxes.json）年額 ----
  function empDeduction(x) {
    for (const [lim, f] of T().income.employmentDeduction) if (x <= lim) return typeof f === 'number' ? f : evalF(f, x);
    return 195;
  }
  function evalF(f, x) { const m = f.match(/^([\d.]+)x([+-][\d.]+)$/); return m ? +m[1] * x + +m[2] : 0; }
  function dependentsDeduction() {
    const d = T().income.dependents; let v = 0;
    const sp = person('spouse'); if (sp && (sp.income || 0) <= 103) v += d.spouse.deduction;
    for (const c of people('child')) { if (c.age >= 16 && c.age <= 18) v += d.child16to18.deduction; else if (c.age >= 19 && c.age <= 22) v += d.child19to22.deduction; }
    return v;
  }
  function incomeTaxes(gross) {
    if (gross <= 0) return { income: 0, resident: 0, si: 0, dep: 0, mortgage: 0 };
    const salaryLike = G.employment !== 'freelance' && G.employment !== 'self_employed';
    const si = salaryLike ? gross * (0.0915 + 0.05 + 0.0055 + (G.age >= 40 ? 0.009 : 0)) : 20.4 + gross * 0.08;
    const ded = salaryLike ? empDeduction(gross) : 65;
    const dep = dependentsDeduction();
    let taxable = Math.max(0, gross - ded - T().income.basicDeduction - si - dep);
    let it = 0, prev = 0;
    for (const [lim, r] of T().income.incomeTax.brackets) { if (taxable > prev) it += (Math.min(taxable, lim) - prev) * r; prev = lim; }
    let rt = taxable * 0.1;
    let mort = 0;
    if (G.flags.mortgage) { const l = (G.loans || []).find((x) => x.type === 'mortgage'); if (l && G.year - l.start < 13) { mort = Math.min(21, l.left * 0.007); const a = Math.min(it, mort); it -= a; rt = Math.max(0, rt - (mort - a)); } }
    // 扶養なしで計算したときとの差（リザルトの「安くなった理由」）
    return { income: Math.round(it * 10) / 10, resident: Math.round(rt * 10) / 10, si: Math.round(si * 10) / 10, dep, mortgage: mort };
  }

  // ---- 生活費（年・万円） ----
  function livingCost() {
    const base = { tokyo: 185, A: 175, B: 160, C: 150 }[tierKey()];
    let v = base * (G.vars.livingCostMul || 1);
    const sp = person('spouse'); if (sp && G.flags.married) v += 85;
    // 収入が多いほど使うお金も増える
    const net = (jobGross() + sideGross() + pensionAnnual()) * 0.78 + (sp && G.flags.married ? (sp.income || 0) * 0.78 : 0);
    if (net > 300) v += (net - 300) * 0.6;
    if (G.age >= 65) v += 15; // 医療・介護
    if (G.flags.lives_with_parents && !G.flags.married) v *= 0.6;
    return v;
  }
  const CHILD_COST = { baby: 70, nursery: 60, elem: 90, jhs: 130, hs: 140, univ: 180, univ_away: 280, voc: 160, none: 0, work: 0 };
  function childCosts() {
    let v = 0;
    for (const c of people('child')) {
      const st = c.costStage || (c.age < 3 ? 'baby' : c.age < 6 ? 'nursery' : c.age < 12 ? 'elem' : c.age < 15 ? 'jhs' : c.age < 18 ? 'hs' : 'none');
      v += CHILD_COST[st] ?? 0;
      v += c.extraCost || 0;
    }
    return v;
  }
  function childAllowanceYear() {
    let v = 0;
    for (const c of people('child')) { if (c.age < 3) v += 18; else if (c.age <= 18) v += 12; }
    return calYear() >= 2024 ? v : v * 0.8;
  }
  function rentYear() {
    if (G.flags.owns_house && !G.flags.renting) return (G.vars.condoFee || 0) * 12;
    return (G.vars.rentMonthly || 0) * 12;
  }
  function modsYear() {
    let v = 0;
    if (G.flags.smoker) v += 6; if (G.flags.heavy_drinker) v += 4; else if (G.flags.drinker) v += 1.5;
    if (G.flags.owns_car) v += 12; if (G.flags.pet) v += 15;
    if (G.flags.dz_diabetes) v += 2; if (G.flags.dz_hypertension) v += 1.2;
    if (G.flags.life_insurance) v += 6; if (G.flags.cancer_insurance) v += 3.6;
    if (G.flags.caregiving) v += G.vars.careCost || 30;
    if (G.flags.exercise_habit && G.vars.gym) v += 9.6;
    if (G.flags.nisa) v += 0; // 積み立ては資産に移すだけ
    for (const c of G.clubs) { const d = Menu.club(c.id); if (d && G.age >= 16) v += d.cost || 0; }
    for (const id of G.hobbies) { const hb = Menu.hobby(id); if (hb && G.age >= 16) v += hb.cost || 0; }
    return v;
  }
  function loansYear() {
    let v = 0;
    for (const l of G.loans || []) if (l.left > 0 && !l.paused) v += Math.min(l.left, l.yearly);
    return v;
  }
  const totalDebt = (noHouse) => Math.max(0, -G.cash) + (G.loans || []).filter((l) => !noHouse || (l.type !== 'mortgage' && l.type !== 'investment')).reduce((a, l) => a + Math.max(0, l.left), 0);
  const householdCash = () => G.household.cash ?? 100;

  // ---- 1季節ぶんのお金の出入り（毎枠の状態更新①） ----
  function quarter() {
    const q = G.q;
    const before = G.cash;
    let inc = 0, out = 0, bonus = 0;
    if (G.age < 16) {
      // 家計（見せない）
      const hh = G.household;
      hh.cash = (hh.cash ?? 100) + (hh.income * 0.06) / 4 - (hh.extraCost || 0) / 4;
      if (hh.cash < -100) { G.talents.familyWealth = Math.max(0, G.talents.familyWealth - 2); hh.cash = 0; }
      return;
    }
    const gross = jobGross();
    const side = sideGross();
    const pen = pensionAnnual();
    const taxes = incomeTaxes(gross + side);
    // 税・保険料を引いた手取り（年）
    const netYear = gross + side - taxes.income - taxes.resident - taxes.si;
    if (hasBonus()) {
      const bm = (D().job_display.pay.bonusMonthsByForm[G.job.form] ?? 4) * (G.vars.raiseMul && G.vars.raiseMul < 1 ? 0.9 : 1);
      const monthly = netYear / (12 + bm);
      inc += monthly * 3;
      if (q === 0 || q === 2) { bonus = monthly * bm / 2; inc += bonus; } // 賞与は6月（春）と12月（秋）
    } else inc += netYear / 4;
    inc += pen / 4;
    if (G.flags.welfare) inc += 30;
    if (G.vars.benefitLeft > 0) { const b = Math.min(G.vars.benefitLeft, G.vars.benefitQ || 0); inc += b; G.vars.benefitLeft -= b; G.received.unemployment = (G.received.unemployment || 0) + b; }
    if (G.flags.married) { const sp = person('spouse'); if (sp && sp.alive) inc += (sp.income || 0) * 0.78 / 4; }
    inc += childAllowanceYear() / 4; G.received.childAllowance = (G.received.childAllowance || 0) + childAllowanceYear() / 4;
    if (G.vars.rentIncomeMonthly && !G.flags.rental_vacant) inc += G.vars.rentIncomeMonthly * 3;
    // 学生：おこづかい・仕送り
    const student = Menu.isStudent();
    if (student) {
      const w = G.talents.familyWealth;
      inc += (w < 15 ? 0.3 : w < 35 ? 0.5 : w < 65 ? 0.8 : 1.5) * 3; // おこづかい（月）
      if (G.flags.living_alone && ['univ', 'univ_med', 'junior_college', 'vocational', 'grad_master', 'grad_doctor', 'grad_prof'].includes(G.stage)) inc += (w < 35 ? 4 : w < 65 ? 7 : 10) * 3;
      if (G.flags.scholarship_loan && G.school) { inc += 15; addLoan('scholar', 15, 0, 'scholar'); }
      out += (G.age < 18 ? 0.6 : 1.5) * 3; // 自分で使うお金
      out += (side * 0.75) / 4; // バイト代の多くは使う（服・遊び・スマホ）
      if (G.flags.living_alone) out += 6 * 3;
    } else {
      out += livingCost() / 4 + rentYear() / 4 + childCosts() / 4;
      if (G.flags.lives_with_parents && !G.vars.rentMonthly && G.age >= 18) out += 3 * 3;
    }
    out += modsYear() / 4 + loansYear() / 4;
    payLoans();
    // 投資（NISA の積み立て）
    if (G.flags.nisa && G.vars.nisaMonthly) { const m = G.vars.nisaMonthly * 3; out += m; G.assets += m; }
    // マイナスの利息（年15%）
    if (G.cash < 0) out += (-G.cash * 0.15) / 4;
    G.cash = G.cash + inc - out;
    // 記録
    G.lastDelta = { v: Math.round(G.cash - before), bonus: Math.round(bonus) };
    if (q === 3) yearRecord(gross + side, taxes, pen);
  }
  function addLoan(type, amount, rate, key) {
    G.loans = G.loans || [];
    let l = G.loans.find((x) => x.type === type && x.left > 0 && !x.closed);
    if (!l) { l = { type, left: 0, total: 0, yearly: 0, rate: rate || 0, start: G.year }; G.loans.push(l); }
    l.left += amount; l.total += amount;
    return l;
  }
  function payLoans() {
    for (const l of G.loans || []) {
      if (l.left <= 0 || l.paused || !l.yearly) continue;
      const pay = Math.min(l.left, l.yearly / 4);
      l.left = Math.max(0, l.left - pay + (l.left * (l.rate || 0)) / 4);
    }
  }
  function yearRecord(gross, taxes, pen) {
    const t = G.tax;
    const add = (k, v) => { t[k] = Math.round(((t[k] || 0) + v) * 10) / 10; };
    add('incomeTax', taxes.income); add('residentTax', taxes.resident); add('socialInsurance', taxes.si);
    // 消費税：生活費の約6割に10%
    add('consumptionTax', (livingCost() + childCosts()) * 0.6 * 0.09);
    const per = T().consumption;
    if (G.flags.smoker) add('tobaccoTax', per.tobaccoTax.perYear.smoker);
    if (G.flags.heavy_drinker) add('liquorTax', per.liquorTax.perYear.heavy_drinker); else if (G.flags.drinker) add('liquorTax', per.liquorTax.perYear.drinker);
    if (G.flags.owns_car) { add('gasolineTax', per.gasolineTax.perYear.owns_car); add('carTax', T().property.carTax.perYear.owns_car); }
    if (G.flags.owns_house) add('fixedAssetTax', (G.vars.houseValue || 3000) * 0.65 * 0.017);
    if (G.flags.owns_rental) add('fixedAssetTax', 10);
    if (taxes.dep) G.received.depDeduction = (G.received.depDeduction || 0) + taxes.dep * 0.15;
    if (taxes.mortgage) G.received.mortgageCredit = (G.received.mortgageCredit || 0) + taxes.mortgage;
    if (pen) G.received.pension = (G.received.pension || 0) + pen;
    G.hist.lifetimeIncome += gross + pen;
    if (gross > 0 && ['seishain', 'civil_servant', 'keiyaku', 'haken'].includes(G.employment)) { G.hist.employeeYears = (G.hist.employeeYears || 0) + 1; G.hist.employeeIncomeSum = (G.hist.employeeIncomeSum || 0) + gross; }
    if (gross > 0 || G.age >= 20) G.hist.paidYears = (G.hist.paidYears || 0) + 1;
  }
  // 家・投資の評価（資産）
  function assetsValue() { return Math.round(G.assets + (G.flags.owns_house ? G.vars.houseValue || 0 : 0) + (G.flags.owns_rental ? G.vars.rentalValue || 0 : 0)); }
  function yearAssets() {
    // 家は年2%目減り、投資は平均+4%（暴落イベントは別）
    if (G.flags.owns_house && G.vars.houseValue) G.vars.houseValue *= 1 - D().housing.buy.valueDecay;
    if (G.assets > 0) G.assets *= 1 + (G.flags.stock_trader || G.flags.crypto ? normal(0.04, 0.15) : normal(0.04, 0.06));
    if (G.flags.owns_rental && G.vars.rentalValue) G.vars.rentalValue *= 1 + (D().housing.investment.priceTrend[tierKey()] || 0);
  }
  return { jobGross, sideGross, annualIncome, monthlyIncome, hasBonus, salaryPreview, salaryCurve, rankTrack, nextStep, curStep, nextStepRate, steps, overtime, aiRisk, pensionMonthly, pensionAnnual, incomeTaxes, livingCost, childCosts, quarter, addLoan, totalDebt, householdCash, assetsValue, yearAssets, working, tierKey, WORKING };
})();
