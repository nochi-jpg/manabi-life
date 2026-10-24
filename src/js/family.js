'use strict';
// ===== 家族・世帯（1人ずつの状態と、年ごとの進行） =====
// 人物 p のおもな項目：
//   pref（住んでいる県）・together（主人公と同じ世帯＝同居）・health（0〜100）・illness（病名 or null）・careLevel（要介護）
//   employment（seishain/part/keiyaku/self_employed/homemaker/retired/student/none/leave）・job・jobLabel・jobEmoji・jobPref（職場の県）
//   income（年収・万円。年金もここ）・assets（貯金など・万円）・relation（関係）
const Fam = (() => {
  // ---- となりの県（通勤できるのはここまで） ----
  const ADJ0 = {
    aomori: ['iwate', 'akita'], iwate: ['akita', 'miyagi'], miyagi: ['akita', 'yamagata', 'fukushima'], akita: ['yamagata'],
    yamagata: ['fukushima', 'niigata'], fukushima: ['niigata', 'gunma', 'tochigi', 'ibaraki'], ibaraki: ['tochigi', 'saitama', 'chiba'],
    tochigi: ['gunma', 'saitama'], gunma: ['saitama', 'nagano', 'niigata'], saitama: ['nagano', 'yamanashi', 'tokyo', 'chiba'],
    chiba: ['tokyo', 'kanagawa'], tokyo: ['kanagawa', 'yamanashi'], kanagawa: ['yamanashi', 'shizuoka'], niigata: ['nagano', 'toyama'],
    toyama: ['nagano', 'gifu', 'ishikawa'], ishikawa: ['gifu', 'fukui'], fukui: ['gifu', 'shiga', 'kyoto'], yamanashi: ['shizuoka', 'nagano'],
    nagano: ['shizuoka', 'aichi', 'gifu'], gifu: ['aichi', 'mie', 'shiga'], shizuoka: ['aichi'], aichi: ['mie'], mie: ['shiga', 'kyoto', 'nara', 'wakayama'],
    shiga: ['kyoto'], kyoto: ['nara', 'osaka', 'hyogo'], osaka: ['nara', 'wakayama', 'hyogo'], hyogo: ['tottori', 'okayama', 'tokushima'],
    nara: ['wakayama'], tottori: ['okayama', 'shimane', 'hiroshima'], shimane: ['hiroshima', 'yamaguchi'], okayama: ['hiroshima', 'kagawa'],
    hiroshima: ['yamaguchi', 'ehime'], yamaguchi: ['fukuoka'], tokushima: ['kagawa', 'ehime', 'kochi'], kagawa: ['ehime'], ehime: ['kochi'],
    fukuoka: ['saga', 'oita', 'kumamoto'], saga: ['nagasaki'], kumamoto: ['oita', 'miyazaki', 'kagoshima'], oita: ['miyazaki'], miyazaki: ['kagoshima'],
  };
  const ADJ = {};
  for (const [a, bs] of Object.entries(ADJ0)) for (const b of bs) { (ADJ[a] = ADJ[a] || []).push(b); (ADJ[b] = ADJ[b] || []).push(a); }
  const near = (a, b) => !!a && !!b && (a === b || (ADJ[a] || []).includes(b));
  const prefName = (id) => (prefOf(id) || {}).name || '';

  const ILL = [['肺炎', 0, 25], ['骨折', 0, 20], ['高血圧', 1, 8], ['糖尿病', 1, 10], ['心臓の病気', 0, 30], ['がん', 0, 35], ['脳卒中', 1, 35], ['腰の病気', 0, 12]];
  const WORKING = ['seishain', 'part', 'keiyaku', 'haken', 'self_employed', 'civil_servant', 'leave'];
  const isWorking = (p) => WORKING.includes(p.employment);

  // ---- 人物の初期値（古いセーブにも使う） ----
  function fill(p, g = G) {
    if (p.pref == null) p.pref = p.role === 'partner' || p.role === 'spouse' || p.role === 'child' || p.role === 'grandchild' ? g.pref : g.birthPref || g.pref;
    if (p.together == null) p.together = ['father', 'mother', 'sibling'].includes(p.role) ? !!g.flags.lives_with_parents || g.age < 18 : p.role === 'grandparent' ? !!p.livesTogether : p.role === 'spouse' ? !g.flags.separated : p.role === 'child' ? !p.livesApart : false;
    if (p.health == null) p.health = clamp(Math.round(92 - Math.max(0, p.age - 50) * 0.9 + normal(0, 5)), 20, 100);
    if (p.illness === undefined) p.illness = null;
    if (p.careLevel == null) p.careLevel = 0;
    if (p.assets == null) p.assets = 0;
    if (p.income == null) p.income = 0;
    if (!p.employment) p.employment = p.age < 6 ? 'none' : p.age < 22 && ['sibling', 'child', 'grandchild'].includes(p.role) ? 'student' : p.job === 'homemaker' ? 'homemaker' : p.income > 0 ? 'seishain' : 'none';
    if (p.jobPref == null && isWorking(p)) p.jobPref = p.pref;
    return p;
  }
  function migrate(g) {
    for (const p of g.people) fill(p, g);
    if (g.talents.t_music == null) g.talents.t_music = Math.round(clamp(g.talents.t_art + normal(0, 12), 1, 99));
    if (g.subj && g.subj.music == null) g.subj.music = Math.round(clamp((g.subj.art ?? 50) + normal(0, 8), 1, 99));
    if (g.skill && g.skill.music == null) g.skill.music = 0;
    if (g.job && g.job.pref == null) g.job.pref = g.pref;
    g.vars.lifeLevel = g.vars.lifeLevel || 'normal';
    g.noticeQ = g.noticeQ || [];
  }

  // ---- 仕事をわりあてる（配偶者・恋人・子ども・きょうだい） ----
  function assignJob(p, o = {}) {
    if (p.age < 18) { p.employment = p.age < 6 ? 'none' : 'student'; p.income = 0; return; }
    const js = D().jobs.jobs.filter((j) => !j.viaEventOnly && j.salary && (j.eduMin || 0) <= 3 && !j.requires);
    const j = weighted(js, (x) => (x.salary[0] > 150 ? 1 : 0.3) * ((x.tags || []).includes('entertain') ? 0.1 : 1));
    if (!j) return;
    const r = rnd();
    const form = o.form || (p.gender === 'F' ? (r < 0.5 ? 'seishain' : r < 0.85 ? 'part' : 'keiyaku') : r < 0.75 ? 'seishain' : r < 0.9 ? 'keiyaku' : 'part');
    p.job = j.id; p.jobLabel = j.label; p.jobEmoji = j.emoji; p.employment = form; p.jobPref = p.pref; p.jobStart = p.jobStart || Math.min(p.age, 23);
    p.income = jobIncome(p);
  }
  function jobIncome(p) {
    if (!isWorking(p) || !p.job) return 0;
    const j = Menu.job(p.job); if (!j || !j.salary) return Math.max(0, p.income || 0);
    const f = D().jobs.forms[p.employment] || D().jobs.forms.seishain || { salaryMul: 1 };
    let v = Econ.salaryCurve(j, p.age, p.jobStart ?? 23) * ((prefOf(p.jobPref || p.pref) || pref()).wage || 1) * (f.salaryMul ?? 1);
    if (p.employment === 'part') v *= 0.45;
    if (p.employment === 'leave') v *= 0.67;
    if (p.reemployed) v *= 0.6;
    return Math.max(0, Math.round(v * (p.mul || 1)));
  }
  const pensionOf = (p) => Math.round(p.employment === 'homemaker' || p.wasPart ? rint(75, 90) : rint(150, 220));

  // ---- 呼び名 ----
  function callName(p) {
    if (!p) return '';
    if (p.role === 'grandparent') return `${p.side === 'mother' ? '母方' : '父方'}の${p.gender === 'M' ? 'おじいちゃん' : 'おばあちゃん'}`;
    if (p.role === 'father') return 'お父さん'; if (p.role === 'mother') return 'お母さん';
    if (p.role === 'spouse' || p.role === 'partner' || p.role === 'child' || p.role === 'sibling' || p.role === 'grandchild') return p.name || roleLabel(p);
    return roleLabel(p);
  }

  // ---- 世帯 ----
  const household = () => G.people.filter((p) => p.alive && p.together);
  const spouseHome = () => { const s = person('spouse'); return s && s.together ? s : null; };
  function householdIncome() {
    const self = Math.round(Econ.annualIncome());
    const ord = ['spouse', 'partner', 'father', 'mother', 'child', 'grandparent', 'sibling'];
    const others = household().filter((p) => p.income > 0).sort((a, b) => ord.indexOf(a.role) - ord.indexOf(b.role)).map((p) => ({ p, v: Math.round(p.income) }));
    return { self, others, total: self + others.reduce((a, x) => a + x.v, 0) };
  }
  function householdAssets() {
    const self = Econ.netWorth();
    const ord = ['spouse', 'partner', 'father', 'mother', 'child', 'grandparent', 'sibling'];
    const others = household().filter((p) => (p.assets || 0) > 0).sort((a, b) => ord.indexOf(a.role) - ord.indexOf(b.role)).map((p) => ({ p, v: Math.round(p.assets) }));
    return { self, others, total: self + others.reduce((a, x) => a + x.v, 0) };
  }
  // 「東京都・賃貸（妻・長男と3人）」
  function livingLabel() {
    const hh = household();
    const kind = G.flags.lives_dorm ? '寮' : G.flags.company_housing ? '社宅' : G.flags.owns_house ? '持ち家' : hh.some((p) => p.role === 'father' || p.role === 'mother') && !G.vars.parentsMovedIn ? '実家' : G.flags.welfare ? '公営住宅' : G.age < 18 ? '実家' : '賃貸';
    if (!hh.length) return `${pref().name}・${kind}（ひとり暮らし）`;
    const order = ['spouse', 'partner', 'child', 'father', 'mother', 'grandparent', 'sibling', 'grandchild'];
    const names = hh.slice().sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role)).map((p) => roleShort(p));
    const uniq = []; for (const n of names) if (!uniq.includes(n)) uniq.push(n);
    const who = uniq.length > 3 ? uniq.slice(0, 3).join('・') + 'など' : uniq.join('・');
    return `${pref().name}・${kind}（${who}と${hh.length + 1}人）`;
  }
  function roleShort(p) {
    if (p.role === 'child') { const kids = people('child').filter((c) => c.gender === p.gender).sort((a, b) => b.age - a.age); const i = kids.indexOf(p); return (p.gender === 'M' ? ['長男', '次男', '三男', '四男'] : ['長女', '次女', '三女', '四女'])[Math.max(0, i)] || roleLabel(p); }
    return roleLabel(p);
  }

  // フラグを人物の状態に合わせる（毎季節）
  function sync() {
    const par = people('father|mother').filter((p) => p.together);
    if (par.length) G.flags.lives_with_parents = true; else if (G.age >= 18 || !people('father|mother').length) delete G.flags.lives_with_parents;
    // 未成年は家族といっしょに暮らす
    if (G.age < 18 && !G.flags.lives_dorm) for (const p of people('father|mother|sibling')) if (p.pref === G.pref && !p.away) p.together = true;
    const sp = person('spouse');
    if (sp && G.flags.married && !G.flags.separated) { sp.together = true; sp.pref = G.pref; }
    for (const p of G.people) if (p.together && p.alive) p.pref = G.pref;
    if (G.flags.married || household().length) delete G.flags.living_alone;
    // 面倒を見ている親の介護度
    if (G.job && G.job.pref == null) G.job.pref = G.pref;
  }

  // 主人公が引っ越した（Life.move から）。いっしょに住む人は同じ県へ。職場が遠くなったら仕事のこと
  function moved(from, to, o = {}) {
    if (from === to) return;
    for (const p of G.people) {
      if (!p.alive || !p.together) continue;
      const parentKeep = (p.role === 'father' || p.role === 'mother' || p.role === 'grandparent') && G.age >= 18 && !o.withParents && !G.vars.parentsMovedIn;
      if (parentKeep) { p.together = false; continue; }
      p.pref = to;
      if (o.spouseJob && p.role === 'spouse') p.jobPref = to;
      if (isWorking(p) && p.jobPref && !near(p.jobPref, to)) { quitPerson(p, '引っ越しで'); }
    }
    if (o.withJob && G.job) G.job.pref = to;
    jobCheck(o);
  }
  // 職場までの距離をたしかめる
  function jobCheck(o = {}) {
    if (!G.job || !G.job.id || !Econ.working() || G.flags.remote_work) { delete G.flags.long_commute; return; }
    const jp = G.job.pref || G.pref;
    if (jp === G.pref) { delete G.flags.long_commute; return; }
    if (near(jp, G.pref)) { if (!G.flags.long_commute) notice('🚃', `${prefName(G.pref)}から${prefName(jp)}の職場まで通うことになった。通勤時間が長くなる。`, 'work', { stress: 4 }); G.flags.long_commute = true; return; }
    const lab = (Menu.job(G.job.id) || {}).label || '仕事';
    Work.quit('self');
    notice('🚪', `${prefName(jp)}の職場には通えないので、${lab}の仕事をやめた。${prefName(G.pref)}で新しい仕事をさがす。`, 'work');
    if (!o.noSearch) Engine.schedule('ev_r_job_search', 0);
  }
  function quitPerson(p, why = '') {
    const was = p.jobLabel;
    p.employment = p.age >= 60 ? 'retired' : 'none'; p.income = 0; p.job = null; p.jobLabel = ''; p.jobEmoji = '';
    p.lookingWork = p.age < 60;
    if (p.role === 'spouse') notice('🧳', `${why}${p.name}は${was || '仕事'}をやめた。新しい仕事をさがしている。`, 'family');
  }

  // 親（ctx.who）のところへ引っ越す／親を呼ぶ
  function moveToWho(p, together) {
    if (!p) return;
    const from = G.pref;
    if (p.pref !== G.pref) { Life.move(p.pref, {}, { keepParents: true }); }
    if (together) { p.together = true; G.vars.parentsMovedIn = false; if (G.vars.rentMonthly) G.vars.rentMonthly = 0; Effects.setFlag('renting', false); }
    else G.flags.near_parents = true;
    void from;
  }
  function whoMoveIn(p) {
    if (!p) return;
    p.pref = G.pref; p.together = true; G.vars.parentsMovedIn = true;
    if (isWorking(p) && p.jobPref && !near(p.jobPref, G.pref)) quitPerson(p);
    if (!G.flags.owns_house) G.vars.rentMonthly = Math.round(((G.vars.rentMonthly || D().housing.rent.family[Econ.tierKey()]) + 4) * 10) / 10;
  }

  // ---- 1年の進行（Engine.agePeople から） ----
  function yearOf(p) {
    // 健康
    const tgt = p.age < 50 ? 92 : clamp(92 - (p.age - 50) * 1.1, 15, 92);
    p.health = clamp(p.health + (tgt - p.health) * 0.25 + normal(0, 2), 5, 100);
    if (p.illness) {
      const il = ILL.find((x) => x[0] === p.illness) || [p.illness, 0, 20];
      if (!il[1] && chance(0.55)) { p.illness = null; p.health = clamp(p.health + 10, 0, 100); }
    } else if (p.age >= 25 && chance(curve({ 25: 0.01, 45: 0.03, 60: 0.06, 75: 0.12, 90: 0.2 }, p.age))) {
      const il = pick(ILL); p.illness = il[0]; p.health = clamp(p.health - il[2], 5, 100);
      if (['father', 'mother', 'spouse', 'child', 'sibling'].includes(p.role) && (p.role !== 'child' || p.age >= 18)) notice('🏥', `${callName(p)}が${il[0]}で入院した。`, 'family', null, p);
    }
    // 仕事・年金・貯金
    if (isWorking(p)) {
      if (!p.incomeCal) { p.incomeCal = true; const m0 = p.mul || 1; p.mul = 1; const raw = jobIncome(p); p.mul = raw > 0 && p.income > 0 ? clamp(p.income / raw, 0.3, 3) : m0; }
      p.income = jobIncome(p);
      if (p.age >= 60 && !p.reemployed && p.employment !== 'self_employed') {
        if (chance(0.55)) { p.reemployed = true; p.income = jobIncome(p); }
        else retire(p);
      } else if (p.age >= 65 && (p.employment !== 'self_employed' || chance(0.25))) retire(p);
      if (isWorking(p)) p.assets = Math.max(0, (p.assets || 0) + p.income * (p.role === 'spouse' && p.together ? 0 : 0.08));
      if (p.leaveUntil && G.year >= p.leaveUntil) { p.employment = p.formBeforeLeave || 'seishain'; p.leaveUntil = 0; p.income = jobIncome(p); }
    } else if (p.employment === 'retired') {
      if (!(p.role === 'spouse' && p.together)) p.assets = Math.max(0, (p.assets || 0) - Math.max(0, 200 - p.income) * 0.4);
    } else if (p.lookingWork && p.age < 60 && chance(0.6)) {
      p.lookingWork = false; assignJob(p, { form: chance(0.5) ? 'part' : 'seishain' });
      if (p.role === 'spouse') notice('💼', `${p.name}が${p.jobLabel}として働き始めた。`, 'family', null, p);
    }
    if (p.age >= 65 && !isWorking(p) && p.employment !== 'retired' && ['father', 'mother', 'spouse', 'grandparent', 'sibling'].includes(p.role)) { p.employment = 'retired'; p.income = pensionOf(p); }
    // きょうだい：大人になる
    if (p.role === 'sibling') siblingYear(p);
  }
  function retire(p) {
    p.wasPart = p.employment === 'part';
    p.employment = 'retired'; p.reemployed = false; p.income = pensionOf(p);
    if (['father', 'mother', 'spouse'].includes(p.role)) notice('🌸', `${callName(p)}が仕事を引退した。これからは年金で暮らす（年${p.income}万円くらい）。`, 'family', null, p);
  }
  function siblingYear(p) {
    if (p.age === 18 || p.age === 22) {
      if (p.employment === 'student' && (p.age === 22 || chance(0.45))) { assignJob(p); }
    }
    if (p.age >= 18 && p.together && G.age >= 1 && chance(p.age >= 22 ? 0.3 : 0.15)) {
      p.together = false; p.pref = chance(0.6) ? p.pref : pick(['tokyo', 'osaka', 'aichi', 'fukuoka', 'kanagawa']);
      notice('🧳', `${roleLabel(p)}の${p.name}が家を出て、${prefName(p.pref)}で暮らし始めた。`, 'family', null, p);
    }
    if (p.age >= 26 && !p.married && chance(0.08)) { p.married = true; notice('💒', `${roleLabel(p)}の${p.name}が結婚した。`, 'family', null, p); }
    if (p.married && (p.kids || 0) < 2 && p.age < 42 && chance(0.12)) { p.kids = (p.kids || 0) + 1; notice('👶', `${roleLabel(p)}の${p.name}に子どもが生まれた。${G.given}は${G.gender === 'M' ? 'おじさん' : 'おばさん'}になった。`, 'family', null, p); }
  }
  // 子ども（大人になってから）
  function childAdultYear(c) {
    if ((c.stage === 'work_start' || c.stage === 'work') && c.employment !== 'seishain' && c.employment !== 'part' && !c.job) { assignJob(c); c.jobPref = c.pref; }
    if (isWorking(c)) c.income = jobIncome(c);
    if (c.age >= 18 && c.together && (c.awayAt && c.age >= c.awayAt)) {
      c.together = false; c.pref = c.awayPref || c.pref;
      notice('🧳', `${c.name}が${prefName(c.pref)}でひとり暮らしを始めた。家が少し静かになった。`, 'family', null, c);
    } else if (c.age >= 20 && c.together && isWorking(c) && chance(0.18)) {
      c.together = false; if (chance(0.35)) c.pref = pick(['tokyo', 'osaka', 'aichi', 'fukuoka', 'kanagawa', c.pref]);
      notice('🧳', `${c.name}が家を出て、${prefName(c.pref)}で暮らし始めた。`, 'family', null, c);
    }
  }

  // ---- ひとこと（タイムラインに出す） ----
  function notice(e, t, cat = 'family', fx = null, who = null) {
    G.noticeQ = G.noticeQ || [];
    if (fx) for (const [k, d] of Object.entries(fx)) Effects.stat(k, d);
    G.noticeQ.push({ e, t, cat, fx: fx ? Object.entries(fx).map(([k, d]) => ({ k, d })) : null, who: who ? who.id : null });
  }

  // ---- 離婚：財産分与・親権・養育費 ----
  function divorce(how) {
    const sp = person('spouse'); if (!sp) return;
    const kids = people('child').filter((c) => c.age < 18 && c.together);
    const mine = how === 'court' ? chance(G.gender === 'F' ? 0.85 : 0.25) : chance(G.gender === 'F' ? 0.8 : 0.3);
    // 財産分与：結婚してからの財産を半分ずつ（家とローンは自分に残す）
    const mineNow = Math.max(0, G.cash) + G.assets;
    const total = mineNow + (sp.assets || 0);
    const share = total / 2;
    let diff = share - mineNow;
    if (diff < 0) { const c = Math.min(Math.max(0, G.cash), -diff); G.cash -= c; diff += c; if (diff < 0) G.assets = Math.max(0, G.assets + diff); }
    else G.cash += diff;
    sp.assets = share;
    const out = [`財産分与：夫婦の財産 ${man(total)}万円を半分ずつに分けた（自分の分は ${man(share)}万円）。`];
    sp.role = 'ex_spouse'; sp.together = false; sp.exYear = G.year;
    delete G.flags.married; delete G.flags.separated; G.flags.divorced = true;
    if (kids.length) {
      // 養育費（裁判所の算定表のめやす：払う側の年収と人数で）
      const payer = mine ? sp : null;
      const inc = mine ? (sp.income || 200) : Math.max(150, Econ.annualIncome());
      const per = clamp(Math.round(inc * ({ 1: 0.1, 2: 0.15, 3: 0.18 }[Math.min(3, kids.length)]) / 12 / kids.length * 10) / 10, 1, 8);
      G.vars.support = G.vars.support || [];
      for (const c of kids) G.vars.support.push({ id: c.id, monthly: per, pay: !mine });
      if (mine) { Effects.setFlag('single_parent', true); out.push(`子ども（${kids.map((c) => c.name).join('・')}）は自分が育てる。${sp.name}から1人月${per}万円の養育費を、18歳になるまで受け取る。`); }
      else { kids.forEach((c) => { c.together = false; c.livesApart = true; c.pref = sp.pref; }); out.push(`子ども（${kids.map((c) => c.name).join('・')}）は${sp.name}が育てる。1人月${per}万円の養育費を、18歳になるまで払う。`); }
      void payer;
    } else out.push('子どもはいないので、養育費はない。');
    return out;
  }
  // 別居
  function separate(kidsGo) {
    const sp = person('spouse'); if (!sp) return;
    sp.together = false; G.flags.separated = true; G.vars.sepYear = G.year;
    if (kidsGo) for (const c of people('child')) if (c.together && c.age < 18) { c.together = false; c.withEx = true; }
  }
  function reunite() {
    const sp = person('spouse'); if (!sp) return;
    sp.together = true; delete G.flags.separated;
    for (const c of people('child')) if (c.withEx) { c.together = true; c.withEx = false; }
  }
  // 養育費の終わり（毎年）
  function supportYear() {
    const S = G.vars.support || [];
    for (const s of S) {
      const c = G.people.find((p) => p.id === s.id);
      if (!c || !c.alive || c.age >= 18) { s.done = true; if (c) notice('📄', `${c.name}が18歳になり、養育費の${s.pay ? '支払い' : '受け取り'}が終わった。`, 'money'); }
    }
    G.vars.support = S.filter((s) => !s.done);
  }
  const supportYearly = () => (G.vars.support || []).reduce((a, s) => a + (s.pay ? -1 : 1) * s.monthly * 12, 0);

  // 家族からの援助（借金の相談など）。出した人の資産がへる
  function bailout(need) {
    const givers = G.people.filter((p) => p.alive && ['father', 'mother', 'spouse', 'sibling'].includes(p.role) && (p.assets || 0) > 30);
    const can = givers.reduce((a, p) => a + p.assets * (p.role === 'spouse' ? 0.6 : 0.35), 0);
    const amt = Math.round(Math.min(need, can));
    if (amt < 10) return { amt: 0, who: [] };
    let left = amt; const who = [];
    for (const p of givers.sort((a, b) => b.assets - a.assets)) { if (left <= 0) break; const g = Math.min(left, p.assets * (p.role === 'spouse' ? 0.6 : 0.35)); p.assets -= g; left -= g; who.push(callName(p)); }
    return { amt, who };
  }
  const familyCanHelp = () => G.people.some((p) => p.alive && ['father', 'mother', 'spouse', 'sibling'].includes(p.role) && (p.assets || 0) > 80);

  // 人物の「いまの様子」
  function statusLabel(p) {
    if (!p.alive) return `🕊️ ${p.diedYear || ''}年に亡くなった`;
    if (p.careLevel >= 1) return `🤲 要介護${p.careLevel}${p.inFacility ? '（施設）' : ''}`;
    if (p.employment === 'student' || (p.age >= 6 && p.age < 18 && ['child', 'sibling', 'grandchild'].includes(p.role))) return `🎒 ${kidStage(p)}`;
    if (p.age < 6) return p.age < 3 ? '👶 赤ちゃん' : '🧸 保育園・幼稚園';
    if (p.employment === 'retired') return '🌴 年金ぐらし';
    if (p.employment === 'homemaker') return '🏠 専業主婦（夫）'.replace('主婦（夫）', p.gender === 'M' ? '主夫' : '主婦');
    if (p.employment === 'leave') return `🍼 育休中（${p.jobLabel || ''}）`;
    if (isWorking(p)) return `${p.jobEmoji || '💼'} ${p.jobLabel || '会社員'}${p.employment === 'part' ? '（パート）' : ''}`;
    if (p.lookingWork) return '🔍 仕事をさがしている';
    return '🏠 家で過ごしている';
  }
  function kidStage(p) { const a = p.age; if (p.stage === 'work_start' || p.stage === 'work') return '社会人'; return a < 3 ? '赤ちゃん' : a < 6 ? '保育園・幼稚園' : a < 12 ? '小学生' : a < 15 ? '中学生' : a < 18 ? '高校生' : a < 22 ? '大学生など' : '社会人'; }

  return { near, prefName, fill, migrate, assignJob, jobIncome, callName, household, spouseHome, householdIncome, householdAssets, livingLabel, roleShort, sync, moved, jobCheck, quitPerson, moveToWho, whoMoveIn, yearOf, childAdultYear, notice, divorce, separate, reunite, supportYear, supportYearly, bailout, familyCanHelp, statusLabel, kidStage, isWorking, pensionOf };
})();
