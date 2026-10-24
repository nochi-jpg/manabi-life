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

  // ---- 生活レベル ----
  const LEVELS = { save: { l: '節約', mul: 0.8, e: '🪙', d: '−20%・満足感↓' }, normal: { l: 'ふつう', mul: 1, e: '🙂', d: 'いまの生活' }, comfy: { l: 'ゆとり', mul: 1.2, e: '☕', d: '＋20%・満足感↑' }, lux: { l: 'ぜいたく', mul: 1.5, e: '💎', d: '＋50%・満足感↑↑' } };
  const lifeLevel = () => (G.flags.welfare ? 'save' : LEVELS[G.vars.lifeLevel] ? G.vars.lifeLevel : 'normal');
  // 自分の世帯の年収（子どものおこづかいのめやす）
  function homeIncome() { try { return Fam.householdIncome().total || 0; } catch (e) { return annualIncome(); } }
  // 親の年収（自分がおこづかいをもらうとき）
  function parentsIncome() { const ps = people('father|mother').filter((p) => p.alive); const v = ps.reduce((a, p) => a + (p.income || 0), 0); return v || [300, 450, 600, 800, 1100][Math.min(4, Math.floor(G.talents.familyWealth / 20))]; }
  function myPocket() { const st = G.stage === 'elem' ? 'elem' : G.stage === 'jhs' ? 'jhs' : G.stage === 'hs' ? 'hs' : Menu.isStudent() && G.age >= 18 ? 'univ' : null; return st ? Math.max(0.1, pocketMoney(st, parentsIncome())) : 0; }
  // ---- 生活費（年・万円） ----
  function livingCost() {
    const sp = Fam.spouseHome();
    if (G.flags.welfare) return 140 + (sp ? 60 : 0); // 生活保護：最低限の生活費（医療費は無料）
    const base = { tokyo: 185, A: 175, B: 160, C: 150 }[tierKey()];
    let v = base * (G.vars.livingCostMul || 1);
    if (sp) v += 85;
    // 収入が多いほど使うお金も増える
    const net = (jobGross() + sideGross() + pensionAnnual()) * 0.78 + (sp ? (sp.income || 0) * 0.78 : 0);
    // 収入が多いほど使うお金も増える（ふえた分の6割）。子どもがいる家は、その分を子どもの費用にあてる
    if (net > 260) v += Math.max(0, (net - 260) * 0.68 - childCosts() * 0.68);
    if (G.age >= 65) v += 15; // 医療・介護
    if (G.cash < 0) v *= 0.85; // お金がないときは節約する
    v *= LEVELS[lifeLevel()].mul;
    if (G.flags.lives_with_parents && !G.flags.married && !G.vars.parentsMovedIn) v *= 0.6;
    else if (people('father|mother').some((p) => p.together && p.alive)) v *= G.vars.parentsMovedIn ? 0.92 : 0.85; // 親と同じ世帯：親も生活費を出してくれる
    return v;
  }
  // 子ども1人の年間費用（公立のばあい。食費・服・学習費。私立・受験塾などは extraCost）
  // univ_away・abroad は仕送りをのぞいた学費・生活費（仕送りは c.sendMoney 万円/月、ふつうは7万円）
  const CHILD_COST = { baby: 55, nursery: 50, elem: 70, jhs: 100, hs: 110, univ: 160, univ_away: 170, abroad: 320, voc: 140, none: 0, work: 0 };
  const STAGE_L = { baby: '0〜2歳', nursery: '保育園・幼稚園', elem: '小学生', jhs: '中学生', hs: '高校生', univ: '大学（自宅から）', univ_away: '大学（ひとり暮らし）', abroad: '海外の大学（留学）', voc: '専門学校' };
  // おこづかい（月・万円）：全国平均（小学生 約0.1万・中学生 約0.25万・高校生 約0.5万・大学生 約1万）を、家の年収（600万円が平均）で増減
  const POCKET = { elem: 0.1, jhs: 0.25, hs: 0.5, univ: 1, voc: 1 };
  const pocketMul = (income) => clamp((income || 0) / 600, 0.5, 2);
  function pocketMoney(stage, income) { const b = POCKET[stage]; return b ? Math.round(b * pocketMul(income) * 100) / 100 : 0; }
  const AWAY = ['univ_away', 'abroad'];
  const SCHOOL_STAGES = ['univ', 'univ_away', 'abroad', 'voc'];
  // 子ども1人の1年の費用（奨学金を借りたら学費は半分くらい・仕送り・おこづかいをふくむ）
  function childCost1(c, income) {
    const st = childStage(c);
    let v = (CHILD_COST[st] ?? 0) * (SCHOOL_STAGES.includes(st) ? (c.selfTuition ? 0.25 : c.scholar ? 0.6 : 1) : 1);
    if (AWAY.includes(st)) v += (c.sendMoney ?? 7) * 12;
    else v += pocketMoney(st, income) * 12;
    v += c.extraCost || 0;
    if (G.flags.near_parents && c.age < 6) v -= 15;
    return Math.max(0, v);
  }
  const childNote = (c, income) => { const st = childStage(c); const n = [STAGE_L[st] || '']; if (AWAY.includes(st)) n.push(`仕送り 月${c.sendMoney ?? 7}万`); else if (POCKET[st]) n.push(`おこづかい 月${round1(pocketMoney(st, income)).toFixed(1)}万`); if (c.selfTuition && SCHOOL_STAGES.includes(st)) n.push('学費は本人'); else if (c.scholar && SCHOOL_STAGES.includes(st)) n.push('奨学金あり'); return n.filter(Boolean).join('・'); };
  const childStage = (c) => c.costStage || (c.age < 3 ? 'baby' : c.age < 6 ? 'nursery' : c.age < 12 ? 'elem' : c.age < 15 ? 'jhs' : c.age < 18 ? 'hs' : 'none');
  // 費用がかかる子ども：いっしょに住む未成年＋仕送りしている学生（別れた相手が育てる子は養育費のほう）
  const costKids = () => people('child').filter((c) => !c.withEx && !c.livesApart && (c.together || ['univ', 'univ_away', 'abroad', 'voc'].includes(c.costStage)));
  function childCosts() {
    let v = 0;
    const inc = homeIncome();
    for (const c of costKids()) v += childCost1(c, inc);
    return Math.max(0, v);
  }
  function childAllowanceYear() {
    let v = 0;
    for (const c of costKids()) { if (c.age < 3) v += 18; else if (c.age <= 18) v += 12; }
    return calYear() >= 2024 ? v : v * 0.8;
  }
  function rentYear() {
    if (G.flags.owns_house && !G.flags.renting) return (G.vars.condoFee || 0) * 12;
    return (G.vars.rentMonthly || 0) * 12;
  }
  const LOAN_L = { scholar: ['🎓', '奨学金の返済'], mortgage: ['🏠', '住宅ローン'], car: ['🚗', '車のローン'], investment: ['🏢', '投資マンションのローン'], startup: ['💼', '事業のローン'], settle: ['⚖️', '債務整理の分割返済'] };
  // 支出の内わけ（年・万円）。q=季節ごとに払う／rec=年の初めにまとめて
  function expenses() {
    const it = [];
    const add = (e, l, y, note = '', o = {}) => { if (y > 0.04) it.push({ e, l, y, note, q: o.q !== false, save: !!o.save, kind: o.kind || '' }); };
    if (G.age < 16) return { items: it, total: 0 };
    if (Menu.isStudent()) {
      add('🧃', '自分で使うお金', Math.max(myPocket(), G.age < 18 ? 0.2 : 0.8) * 12 * 0.9, `おこづかい 月${round1(myPocket()).toFixed(1)}万円から`);
      if (G.flags.self_pay_school) add('📱', '通信費', 0.6 * 12, 'スマホ代（自分で払う）');
      const side = sideGross(); if (side) add('👕', 'バイト代で使うお金', side * 0.75, '服・遊び・スマホ');
      if (G.flags.living_alone) add('🏠', 'ひとり暮らしの生活費', 72, '食費・光熱費など');
    } else {
      const lc = livingCost(); const n = Fam.household().length + 1;
      add('🍚', '食費・日用品', lc * 0.52, `${n}人ぶん`, { kind: 'life' });
      add('💡', '水道・電気・ガス', lc * 0.12, '', { kind: 'life' });
      add('📱', '通信費', lc * 0.08, 'スマホ・ネット', { kind: 'life' });
      add('👔', '服・交際・その他', lc * 0.28, '', { kind: 'life' });
      add('🏠', G.flags.owns_house && !G.flags.renting ? '管理費・修繕' : '家賃', rentYear(), G.flags.welfare ? '住宅扶助' : pref().name);
      { const hi = homeIncome(); for (const c of costKids()) add('👶', `子ども（${c.name}）`, childCost1(c, hi), childNote(c, hi)); }
      if (G.flags.lives_with_parents && !G.vars.rentMonthly && G.age >= 18 && !G.flags.married && !G.vars.parentsMovedIn) add('🏠', '家に入れるお金', 36, '実家ぐらし');
    }
    if (G.flags.smoker) add('🚬', 'たばこ', 6); if (G.flags.heavy_drinker) add('🍺', 'お酒', 4); else if (G.flags.drinker) add('🍺', 'お酒', 1.5);
    if (G.flags.owns_car) add('🚗', '車', 12, 'ガソリン・保険・駐車場');
    if (G.flags.pet) add('🐶', 'ペット', 15);
    if (G.flags.long_commute) add('🚃', '通勤（遠い職場）', 6, '会社の補助をこえる分');
    if (G.flags.dz_diabetes || G.flags.dz_hypertension) add('💊', '通院・薬', (G.flags.dz_diabetes ? 2 : 0) + (G.flags.dz_hypertension ? 1.2 : 0));
    if (G.flags.life_insurance || G.flags.cancer_insurance) add('🛡️', '保険', (G.flags.life_insurance ? 6 : 0) + (G.flags.cancer_insurance ? 3.6 : 0), [G.flags.life_insurance ? '医療保険' : '', G.flags.cancer_insurance ? 'がん保険' : ''].filter(Boolean).join('・'));
    if (G.flags.caregiving) add('🤲', '介護', G.vars.careCost || 30, 'ヘルパー・おむつなど');
    if (G.flags.exercise_habit && G.vars.gym) add('🏋️', 'ジム', 9.6);
    let lh = 0; const lhn = [];
    const parentsPay = Menu.isStudent() && !G.flags.self_pay_school; // 学生の習い事・教育費は、ふつうは親が出してくれる
    for (const c of G.clubs) { const d = Menu.club(c.id); if (d && G.age >= 16 && d.cost && !parentsPay) { lh += d.cost; lhn.push(d.label.replace(/（.*）/, '')); } }
    for (const id of G.hobbies) { const hb = Menu.hobby(id); if (hb && G.age >= 16 && hb.cost) { lh += hb.cost; lhn.push(hb.label.replace(/（.*）/, '')); } }
    add('🎮', '習い事・趣味', lh, lhn.slice(0, 2).join('・') + (lhn.length > 2 ? 'など' : ''));
    for (const l of G.loans || []) if (l.left > 0 && !l.paused && l.yearly) { const [e, lb] = LOAN_L[l.type] || ['💳', 'ローン']; add(e, lb, Math.min(l.left, l.yearly), `のこり${man(l.left)}万円`); }
    if (G.cash < 0) add('💳', 'カードローンの利息', Math.min(-G.cash, Math.max(50, annualIncome() / 3)) * 0.15, '年15%');
    for (const sp of G.vars.support || []) if (sp.pay) { const c = G.people.find((p) => p.id === sp.id); add('📄', '養育費', sp.monthly * 12, c ? `${c.name}が18歳まで` : ''); }
    for (const r of G.vars.recurring || []) if (r.v < 0) add('🧾', ({ ev_r_parent_care: '介護施設', ev_r_transfer: '単身赴任', ev_r_nisetai: '帰省・仕送り' })[r.from] || '毎年の支払い', -r.v, `あと${r.left}年`, { q: false });
    if (G.flags.nisa && G.vars.nisaMonthly) add('📈', 'NISAの積み立て', G.vars.nisaMonthly * 12, '資産にうつる', { save: true });
    return { items: it, total: it.reduce((a, x) => a + x.y, 0) };
  }
  // 1年ぶんの手取り（自分・配偶者）
  function netIncomeYear() {
    const gross = jobGross() + sideGross();
    const t = incomeTaxes(gross);
    const sp = Fam.spouseHome();
    return { self: gross - t.income - t.resident - t.si + pensionAnnual(), spouse: sp ? (sp.income || 0) * 0.78 : 0, allowance: childAllowanceYear(), support: Math.max(0, Fam.supportYearly()), rent: G.vars.rentIncomeMonthly && !G.flags.rental_vacant ? G.vars.rentIncomeMonthly * 12 : 0 };
  }
  function loansYear() {
    let v = 0;
    for (const l of G.loans || []) if (l.left > 0 && !l.paused) v += Math.min(l.left, l.yearly);
    return v;
  }
  const loansLeft = (noHouse) => (G.loans || []).filter((l) => !noHouse || (l.type !== 'mortgage' && l.type !== 'investment')).reduce((a, l) => a + Math.max(0, l.left), 0);
  // 住宅ローン・投資ローン・奨学金・債務整理の分割をのぞいた借金（カードローンをふくむ）
  const consumerDebt = () => Math.max(0, -G.cash) + (G.loans || []).filter((l) => !['mortgage', 'investment', 'scholar', 'settle'].includes(l.type)).reduce((a, l) => a + Math.max(0, l.left), 0);
  const totalDebt = (noHouse) => Math.max(0, -G.cash) + loansLeft(noHouse);
  // 正味の財産：現金＋資産（投資・家）−借金
  const netWorth = () => Math.round(G.cash + assetsValue() - loansLeft());
  // すぐに使えるお金（現金＋投資）
  const liquid = () => G.cash + Math.max(0, G.assets);
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
    if (G.flags.welfare) { const w = welfareQ(); inc += w; G.received.welfare = (G.received.welfare || 0) + w; }
    if (G.vars.benefitLeft > 0) { const b = Math.min(G.vars.benefitLeft, G.vars.benefitQ || 0); inc += b; G.vars.benefitLeft -= b; G.received.unemployment = (G.received.unemployment || 0) + b; }
    const sp = Fam.spouseHome(); if (sp && G.flags.married) inc += (sp.income || 0) * 0.78 / 4;
    inc += childAllowanceYear() / 4; G.received.childAllowance = (G.received.childAllowance || 0) + childAllowanceYear() / 4;
    for (const s of G.vars.support || []) if (!s.pay) inc += s.monthly * 3;
    if (G.vars.rentIncomeMonthly && !G.flags.rental_vacant) inc += G.vars.rentIncomeMonthly * 3;
    // 学生：おこづかい・仕送り
    const student = Menu.isStudent();
    if (student) {
      const w = G.talents.familyWealth;
      if (!G.flags.living_alone) inc += myPocket() * 3; // おこづかい（月）：全国平均×親の年収
      if (G.flags.living_alone && !G.flags.allowance_cut && ['univ', 'univ_med', 'junior_college', 'vocational', 'grad_master', 'grad_doctor', 'grad_prof'].includes(G.stage)) inc += (w < 35 ? 4 : w < 65 ? 7 : 10) * 3;
      if (G.flags.scholarship_loan && G.school) { inc += 15; addLoan('scholar', 15, 0, 'scholar'); G.vars.scholarBorrowed = (G.vars.scholarBorrowed || 0) + 15; }
    }
    const ex = expenses();
    for (const x of ex.items) if (x.q && !x.save) out += x.y / 4;
    payLoans();
    // 投資（NISA の積み立て）
    if (G.flags.nisa && G.vars.nisaMonthly) { const m = G.vars.nisaMonthly * 3; out += m; G.assets += m; }
    G.cash = G.cash + inc - out;
    // 現金が足りないときは、投資を売ってあてる（持っているのに借金をするのはおかしいので）
    if (G.cash < 0 && G.assets > 1 && G.age >= 18) {
      const s = Math.min(G.assets, -G.cash + 30);
      G.assets -= s; G.cash += s;
      if (G.vars.soldYear !== G.year) { G.vars.soldYear = G.year; Fam.notice('📉', `現金が足りなくなったので、投資（NISAなど）を${man(s)}万円分売って、生活費と返済にあてた。`, 'money'); }
    }
    // お金が足りないときは、生活を切りつめる（自動で「節約」に）
    if (G.cash < -30 && G.age >= 18 && !student && !G.flags.welfare && lifeLevel() !== 'save') {
      G.vars.lifeLevel = 'save'; G.vars.autoSave = true;
      Fam.notice('🪙', 'お金が足りないので、生活レベルを「節約」に下げた（食費や交際費を切りつめる）。支出のボタンからいつでも変えられる。', 'money');
    }
    if (G.vars.autoSave && lifeLevel() === 'save' && G.cash > Math.max(100, expenses().total / 2)) {
      G.vars.lifeLevel = 'normal'; G.vars.autoSave = false;
      Fam.notice('🙂', 'お金に少し余裕ができたので、生活レベルを「ふつう」にもどした。', 'money');
    }
    // 記録
    G.lastDelta = { v: Math.round(G.cash - before), bonus: Math.round(bonus), inc: Math.round(inc), out: Math.round(out) };
    // 赤字が続いた季節の数（NISAの積み立ては貯金なので数えない）
    { const nisaQ = G.flags.nisa && G.vars.nisaMonthly ? G.vars.nisaMonthly * 3 : 0; const flow = G.cash - before + nisaQ; G.vars.defQ = flow < -3 ? (G.vars.defQ || 0) + 1 : 0; G.vars.lastQ = { inc: Math.round(inc), out: Math.round(out - nisaQ) }; }
    if (q === 3) yearRecord(gross + side, taxes, pen);
  }
  // 生活保護の支給（季節）
  function welfareQ() { return Math.max(0, (livingCost() + rentYear()) / 4 - (jobGross() * 0.85 + pensionAnnual()) / 4); }
  function addLoan(type, amount, rate, key) {
    G.loans = G.loans || [];
    let l = G.loans.find((x) => x.type === type && x.left > 0 && !x.closed);
    if (!l) { l = { type, left: 0, total: 0, yearly: 0, rate: rate || 0, start: G.year }; G.loans.push(l); }
    l.left += amount; l.total += amount;
    return l;
  }
  // 奨学金の返済を始める（借りた額で返す年数が決まる：日本学生支援機構のめやす）
  function scholarStart() {
    for (const l of G.loans || []) if (l.type === 'scholar' && l.left > 0) {
      const yrs = clamp(Math.round(9 + l.total / 40), 9, 20);
      l.yearly = Math.round((l.left / yrs) * 10) / 10; l.years = yrs; l.start = G.year;
    }
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
  return { consumerDebt, myPocket, parentsIncome, homeIncome, childCost1, pocketMoney, jobGross, sideGross, annualIncome, monthlyIncome, hasBonus, salaryPreview, salaryCurve, rankTrack, nextStep, curStep, nextStepRate, steps, overtime, aiRisk, pensionMonthly, pensionAnnual, incomeTaxes, livingCost, childCosts, childAllowanceYear, quarter, addLoan, totalDebt, loansLeft, netWorth, liquid, householdCash, assetsValue, yearAssets, working, tierKey, WORKING, expenses, netIncomeYear, welfareQ, LEVELS, lifeLevel, costKids, childStage, LOAN_L, scholarStart };
})();
