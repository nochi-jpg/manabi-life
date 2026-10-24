'use strict';
// ===== テキストの差し込み（{name} など）と、動的な値（$pick など） =====
const Text = (() => {
  const P = () => D().text_pools;
  const pool = () => D().events_flow.textPools;
  const pk = (a) => (Array.isArray(a) ? pick(a) : a);
  const ageKey = () => (G.age < 20 ? 'young' : 'adult');
  const nm = (p) => (p ? p.name || roleLabel(p) : '');
  function schoolLabel() { const p = G.school && Menu.picked(G.school.pick); return p ? p.name : G.school ? G.school.name : ''; }
  function targetLabel() {
    const t = G.vars.target; if (!t || t === 'none') return '';
    const p = Menu.picked(t); if (p) return p.name;
    const s = Menu.school(t); if (s) return Menu.schoolName(s);
    const j = Menu.job(t); if (j) return j.label;
    return t;
  }
  const jobLabel = () => (G.job ? (Menu.job(G.job.id) || {}).label || '' : '');
  const rentOf = (k) => D().housing.rent[k][Econ.tierKey()];

  // {key} の値
  function val(k, ctx = {}) {
    const who = ctx.who, ch = ctx.child;
    switch (k) {
      case 'year': return calYear(); case 'month': return MONTH[G.q]; case 'age': return G.age;
      case 'name': case 'given': return G.given; case 'surname': return G.surname; case 'birthSurname': return G.birthSurname;
      case 'motherMaiden': return G.motherMaiden; case 'pref': return pref().name;
      case 'partner': return nm(person('partner')); case 'spouse': return nm(person('spouse'));
      case 'partnerSurname': return G.vars.partnerSurname || (person('partner') || person('spouse') || {}).surname || '';
      case 'partnerYears': { const p = person('partner'); return p ? Math.max(1, G.year - (p.since || G.year)) : 1; }
      case 'child': return nm(ch || people('child').slice(-1)[0]);
      case 'school': return schoolLabel(); case 'schoolName': return schoolLabel() || `${Menu.prefShort()}の小学校`;
      case 'target': case 'pick': return ctx.pickName || targetLabel();
      case 'job': case 'jobLabel': return jobLabel();
      case 'club': { const c = G.clubs[0] && Menu.club(G.clubs[0].id); return c ? c.label : '部活'; }
      case 'income': return Math.round(Econ.jobGross());
      case 'jobYears': return G.jobYears; case 'jobSat': return Math.round(G.stats.jobSatisfaction);
      case 'crush': return pk(P().crush[G.gender]);
      case 'someone': return pk(P().someone[ageKey()]);
      case 'place': return pk(P().place);
      case 'scamText': return pk(pool().scamText);
      case 'disasterType': return pk(pool().disasterType);
      case 'babyMilestone': { const b = pool().babyMilestone; return b[clamp(Math.floor(G.age * 0.9) + rint(-1, 0), 0, b.length - 1)]; }
      case 'studentDaily': { const sd = P().studentDaily[G.stage]; return pk(sd || pool().studentDaily); }
      case 'adultDaily': case 'seniorDaily': return pk(pool()[k]);
      case 'tripDest': return pk(pool().tripDest[G.stage] || pool().tripDest.elem);
      case 'kenshinResult': { const bad = G.stats.health < 60 || G.flags.dz_hypertension || G.flags.smoker || G.flags.heavy_drinker; ctx.kenshinBad = bad; return pk(P().kenshinResult[bad ? 'warn' : 'good']); }
      case 'sportsDayResult': return pk(P().sportsDayResult[G.talents.t_sport >= 65 ? 'hi' : G.talents.t_sport < 40 ? 'lo' : 'mid']);
      case 'homeworkResult': return pk(P().homeworkResult[G.stats.academic >= 55 ? 'hi' : 'lo']);
      case 'valentineText': return pk(P().valentineText[G.gender]);
      case 'gradComment': case 'seijinComment': case 'tripMemory': case 'festMemory': case 'tripPlace': case 'snowText': case 'firstBonusUse': case 'anniversaryText': case 'hobbyTrigger': case 'layoffType': case 'careReason': case 'creatorFlavor': return pk(P()[k]);
      case 'otoshidama': { if (ctx.otoshidama == null) ctx.otoshidama = pk(P().otoshidama) * (G.talents.familyWealth >= 65 ? 1.5 : G.talents.familyWealth < 25 ? 0.5 : 1); return Math.round(ctx.otoshidama).toLocaleString('ja-JP'); }
      case 'allowance': { const w = G.talents.familyWealth; return w < 15 ? 0.3 : w < 35 ? 0.5 : w < 65 ? 0.8 : 1.5; }
      case 'personName': return who ? (who.role === 'grandparent' ? (who.gender === 'M' ? 'おじいちゃん' : 'おばあちゃん') : roleLabel(who)) : '';
      case 'personAge': return who ? who.age : '';
      case 'parentName': { const p = who && ['father', 'mother'].includes(who.role) ? who : person('father|mother'); return p ? roleLabel(p) === '父' ? 'お父さん' : 'お母さん' : ''; }
      case 'siblingRelation': return ctx.sib ? roleLabel(ctx.sib) : '弟';
      case 'olderTitle': return G.gender === 'M' ? 'お兄ちゃん' : 'お姉ちゃん';
      case 'grandTitle': return G.gender === 'M' ? 'おじいちゃん' : 'おばあちゃん';
      case 'grandchildName': return nm(person('grandchild'));
      case 'newPref': return ctx.newPref ? prefOf(ctx.newPref).name : (ctx.newPref = newPref(), prefOf(ctx.newPref).name);
      case 'newTitle': return (Econ.curStep() || {}).t || ''; case 'nextTitle': return (Econ.nextStep() || {}).t || '';
      case 'examName': return ctx.examName || (Econ.nextStep() || {}).exam || ((G.vars.major === 'vo_pt') ? '理学療法士国家試験' : (G.vars.major === 'vo_beauty') ? '美容師国家試験' : '試験');
      case 'tuition': { const p = Menu.picked(G.vars.target); return p ? p.cost : 100; }
      case 'householdComment': return bandOf(G.talents.familyWealth).label === 'ふつう' ? '家計はふつう' : '家計は' + bandOf(G.talents.familyWealth).label;
      case 'commute': return G.vars.schoolAway ? '実家から通うのはむずかしい' : '実家から通える';
      case 'rentSingle': return rentOf('single'); case 'rentFamily': return rentOf('family'); case 'rentShare': return Math.round(rentOf('single') * 0.7);
      case 'repay': { const l = loan('scholar'); return l ? Math.round(l.yearly / 12 * 10) / 10 : 0; }
      case 'repayYears': { const l = loan('scholar'); return l ? Math.round(l.total / Math.max(1, l.yearly)) : 0; }
      case 'repayTotal': { const l = loan('scholar'); return l ? Math.round(l.total) : 0; }
      case 'benefitLeft': return G.vars.benefitLeft > 0 ? `あと${Math.round(G.vars.benefitLeft)}万円` : 'もらえる期間は終わった';
      case 'severance': return Math.round(severance());
      case 'pension': return Econ.pensionMonthly(); case 'pension2m': return Math.round(Econ.pensionMonthly() * 2 * 10) / 10;
      case 'bonus': return Math.round((G.lastDelta && G.lastDelta.bonus) || 0);
      case 'debt': return Math.round(Econ.totalDebt());
      case 'marriedYears': return G.year - (G.vars.marriedYear ?? G.year);
      case 'housePrice': return housePrice(); case 'downPayment': return Math.round(housePrice() * 0.1);
      case 'loanMonthly': { const l = loan('mortgage'); return l ? Math.round(l.yearly / 12 * 10) / 10 : 0; }
      case 'loanLeft': { const l = loan('mortgage'); return l ? Math.round(l.left) : 0; }
      case 'rateUp': { const l = loan('mortgage'); return l ? Math.round(l.left * 0.005 / 12 * 10) / 10 : 1; }
      case 'offerIncome': return Math.round(Econ.jobGross() * 1.2);
      case 'tokyoRatio': return '1.3倍';
      case 'crashPct': return ctx.crashPct || (ctx.crashPct = rint(20, 45));
      case 'cancerName': return ({ lung: '肺がん', stomach: '胃がん', colon: '大腸がん', breast: '乳がん' })[G.vars.cancerType] || 'がん';
      case 'cancerStage': return G.vars.cancerStage || 2;
      case 'billTotal': return Math.round(bill().total); case 'billPay': return Math.round(bill().pay);
      case 'careLevel': return who ? who.careLevel : 1;
      case 'family': {
        if (G.age === 0) { const f = G.people.filter((p) => p.alive && p.role !== 'grandparent').map(roleLabel); const gp = G.people.filter((p) => p.role === 'grandparent' && p.livesTogether).map(roleLabel); const all = [...f, ...gp]; return all.length ? all.join('・') : 'お母さん'; }
        return G.flags.married ? '家族' : '自分';
      }
      case 'childrenComment': return people('child').length ? `子ども${people('child').length}人の親権も決めなければならない。` : '子どもはいない。';
      case 'deathCause': return G.deathCause || '病気';
      case 'nextEikenLevel': return nextEiken().label;
      case 'entranceFee': return 30; case 'childTuition': return ch ? childTuition(ch) : 400;
      case 'childSchool': return ch ? ch.schoolLabel || '高校' : '高校';
      case 'childPath': return ch ? (P().childPath[ch.plan] || '進路を決めた') : '';
      case 'childJob': return ch ? ch.jobLabel || '会社員' : '';
      case 'inheritText': return ctx.inheritText || '';
      case 'lotteryResult': return ctx.lotteryResult || '';
      case 'round': return ctx.round || 1;
      case 'tourneyResult': return ctx.tourneyResult || '';
      case 'unitPrice': return D().housing.investment.unitPrice[Econ.tierKey()];
      case 'unitRent': return D().housing.investment.rentIncome[Econ.tierKey()];
      case 'rentalValue': return Math.round(G.vars.rentalValue || 0);
      case 'rentalLoanLeft': { const l = loan('investment'); return l ? Math.round(l.left) : 0; }
      case 'repairCost': return ctx.repairCost || (ctx.repairCost = rint(30, 150));
      case 'houseValue': return Math.round(G.vars.inheritHouseValue || 1500);
      case 'houseTax': return Math.round((G.vars.inheritHouseValue || 1500) * 0.012);
      case 'borrowTotal': return Math.round(Econ.totalDebt());
      default: return `{${k}}`;
    }
  }
  function fill(s, ctx = {}) { if (!s) return ''; return String(s).replace(/\{(\w+)\}/g, (m, k) => val(k, ctx)); }

  // ---- $ の値（effects・roll で使う） ----
  function dynValue(k, ctx = {}) {
    let m = k.match(/^(\w+)([+-]\d+)$/);
    if (m) return num(dynValue(m[1], ctx)) + +m[2];
    switch (k) {
      case 'pick': return ctx.pick ? ctx.pick.id : null;
      case 'menuRate': return ctx.pick ? ctx.pick.rate : 50;
      case 'targetRate': return targetRate();
      case 'target': return G.vars.target;
      case 'age': return G.age;
      case 'who': return ctx.who ? ctx.who.id : null;
      case 'parentId': return ctx.who ? ctx.who.id : (person('father|mother') || {}).id;
      case 'parentBusinessJob': { const p = people('father|mother').find((x) => x.employment === 'self_employed'); return p && p.job ? p.job : 'j_family_business'; }
      case 'ikkanHigh': { const sc = G.school && G.school.tmpl; const hs = D().schools.ikkanHigh[sc] || 'hs_pub_high'; const o = Menu.inst(Menu.school(hs), 0); const t = Menu.school(hs); const r = { ...o, emoji: t.emoji, name: Menu.schoolName(t), years: 3, cost: t.cost, stage: 'hs' }; Menu.remember(r); return r.id; }
      case 'affilFallback': { const r = { id: 'u_affil#lit', tmpl: 'u_private_mid', h: 52, dept: 'lit', emoji: '📖', name: '系列の私立大学 文学部', years: 4, cost: 100, stage: 'univ' }; Menu.remember(r); return r.id; }
      case 'examFlag': return G.vars.major === 'vo_pt' ? 'lic_pt' : 'lic_beauty';
      case 'pendingFlag': return ({ ev_m_kokushi_doctor: 'lic_doctor', ev_m_kokushi_dentist: 'lic_dentist', ev_m_kokushi_pharm: 'lic_pharmacist', ev_m_kokushi_nurse: 'lic_nurse', ev_m_license_exam: G.vars.major === 'vo_pt' ? 'lic_pt' : 'lic_beauty' })[G.vars.pendingExam] || 'lic_nurse';
      case 'pendingRate': return 75;
      case 'nextStepRate': return Math.round(Econ.nextStepRate(ctx.ev && ctx.ev.id === 'ev_m_promotion_exam' ? 'exam' : 'roll') * 100);
      case 'severance': return Math.round(severance());
      case 'earlyRetireBonus': return Math.round(severance() * 1.3);
      case 'downPayment': return Math.round(housePrice() * 0.1);
      case 'downPaymentUsed': return Math.round(housePrice() * 0.6 * 0.1);
      case 'acquisitionTax': return Math.round(housePrice() * 0.03);
      case 'loanAmount': return Math.round(housePrice() * 0.9);
      case 'loanAmountUsed': return Math.round(housePrice() * 0.6 * 0.9);
      case 'loanApproval': return loanApproval(housePrice() * 0.9);
      case 'loanApprovalUsed': return loanApproval(housePrice() * 0.6 * 0.9);
      case 'houseValue': return Math.round(G.vars.inheritHouseValue || 1500);
      case 'rentSingle': return rentOf('single'); case 'rentFamily': return rentOf('family'); case 'rentShare': return Math.round(rentOf('single') * 0.7);
      case 'rentCompany': return Math.round(rentOf('single') * D().housing.companyHousing.rentMul * 10) / 10;
      case 'moveInCost': return Math.round(rentOf('single') * 4);
      case 'moveInCostFamily': return Math.round(rentOf('family') * 4);
      case 'newPref': return ctx.newPref || (ctx.newPref = newPref());
      case 'motherMaiden': return G.motherMaiden;
      case 'partnerSurname': return G.vars.partnerSurname;
      case 'surname': return G.surname; case 'birthSurname': return G.birthSurname;
      case 'otoshidama': return (ctx.otoshidama || 10000) / 10000;
      case 'estate': return ctx.estate ?? 0;
      case 'scamAmount': return Math.min(Math.max(30, G.cash * 0.3), 300);
      case 'billPay': return bill().pay; case 'billInsurance': return bill().insurance;
      case 'childTuition': return ctx.child ? childTuition(ctx.child) : 400;
      case 'childTuitionHalf': return ctx.child ? childTuition(ctx.child) / 2 : 200;
      case 'childMedical': return 5;
      case 'childPath': return ctx.child ? (ctx.child.plan === 'univ' ? 'univ' : ctx.child.plan === 'voc' ? 'voc' : 'work') : 'none';
      case 'entranceFee': return 30;
      case 'unitRent': return D().housing.investment.rentIncome[Econ.tierKey()];
      case 'unitLoan': return D().housing.investment.unitPrice[Econ.tierKey()] - 200;
      case 'inheritRent': return Math.round(rentOf('family') * 0.8);
      case 'rentalValue': return Math.round(G.vars.rentalValue || 0);
      case 'rentalLoanLeft': { const l = loan('investment'); return l ? Math.round(l.left) : 0; }
      case 'repairCost': return ctx.repairCost || (ctx.repairCost = rint(30, 150));
      case 'houseTax': return Math.round((G.vars.inheritHouseValue || 1500) * 0.012);
      case 'matchedChild': return ctx.child ? ctx.child.id : null;
      case 'nextEikenFlag': return nextEiken().flag;
      case 'toeicFlag': return ctx.toeicFlag || 'toeic_600';
      case 'pickFlag': return ctx.pick ? (Menu.qual(ctx.pick.id) || {}).flag : null;
      case 'offerJob': return G.job ? G.job.id : 'j_sales';
      case 'sameCompanyLowAi': return 'j_office';
      case 'loanAmountRental': return D().housing.investment.unitPrice[Econ.tierKey()] - 200;
      default:
        if (k.startsWith('targetOrDefault:')) { const t = G.vars.target; return t && t !== 'none' ? t : k.split(':')[1]; }
        console.warn('未対応の値', k); return 0;
    }
  }
  const num = (v) => (typeof v === 'number' ? v : parseFloat(v) || 0);
  const loan = (t) => (G.loans || []).find((l) => l.type === t && l.left > 0);
  function housePrice() { return D().housing.buy.price[Econ.tierKey()]; }
  function loanApproval(amount) {
    const sc = D().housing.buy.mortgage.screening;
    if (sc.blockFlags.some((f) => G.flags[f])) return 3;
    const inc = Econ.jobGross() + (G.flags.married ? (person('spouse') || {}).income || 0 : 0);
    if (inc <= 0) return 3;
    let p = 0.9;
    if (amount > inc * sc.maxIncomeMul) p -= 0.5;
    if (sc.formsHard.includes(G.employment)) p -= 0.35;
    if (G.jobYears < sc.minJobYears) p -= 0.2;
    if (G.cash < 0) p -= 0.4;
    return Math.round(clamp(p, 0.03, 0.95) * 100);
  }
  function severance() { const y = G.jobYears || 0; return G.employment === 'civil_servant' ? y * 55 : y * 45; }
  function targetRate() {
    const p = Menu.picked(G.vars.target); if (p && p.rate != null) return p.rate;
    return 70;
  }
  function newPref() { const ps = D().prefectures.prefectures.filter((p) => p.id !== G.pref); return weighted(ps, (p) => p.population).id; }
  function bill() { const tot = rint(20, 120); const cap = 9 * 1.5; const pay = Math.min(tot * 0.3, cap) + rint(2, 10); return { total: tot, pay: Math.round(pay), insurance: G.flags.cancer_insurance ? 100 : G.flags.life_insurance ? 20 : 0 }; }
  function childTuition(c) { return c.plan === 'univ' ? 450 : c.plan === 'voc' ? 250 : 0; }
  function nextEiken() { const L = [['eiken_3', '英検3級'], ['eiken_2', '英検2級'], ['eiken_p1', '英検準1級'], ['eiken_1', '英検1級']]; const n = L.find(([f]) => !G.flags[f]) || L[3]; return { flag: n[0], label: n[1] }; }
  return { fill, val, dynValue, targetLabel, schoolLabel, jobLabel, housePrice, nextEiken, severance };
})();
