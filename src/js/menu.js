'use strict';
// ===== 選択肢メニュー（学校・職業・部活・重点方針など）と合格率（docs/09 §6） =====
const Menu = (() => {
  const S = () => D().schools, J = () => D().jobs, C = () => D().clubs;
  const allSchools = () => { const s = S(), ps = s.postSecondary; return [...s.preschool, ...s.elementary, ...s.juniorHigh, ...s.highSchool, ...ps.universityTiers, ...ps.juniorCollege, ...ps.vocational, ...ps.graduate, ...ps.abroad]; };
  const school = (id) => allSchools().find((x) => x.id === id);
  const dept = (id) => S().postSecondary.departments.find((d) => d.id === id);
  const job = (id) => J().jobs.find((x) => x.id === id) || J().partTimeJobs.find((x) => x.id === id);
  const allClubs = () => { const c = C(); return [...c.lessons, ...c.jhsClubs, ...c.hsClubsExtra, ...c.univCircles, ...(c.adultLessons || [])]; };
  const club = (id) => allClubs().find((x) => x.id === id);
  const hobby = (id) => C().hobbies.find((x) => x.id === id);
  const qual = (id) => D().events_random.qualifications.find((q) => q.id === id);

  // 都道府県名から「〇〇県立」などをつくる
  const prefShort = () => pref().name.replace(/[都道府県]$/, '');
  const prefSuffix = () => pref().name.slice(-1);
  function schoolName(t, inst) {
    let l = t.label;
    if (l.startsWith('県立')) l = prefShort() + prefSuffix() + '立' + l.slice(2);
    else if (/^(私立|公立|国立)/.test(l) || /大学|短期大学|専門学校|高専|高校|中学|小学校|幼稚園|保育園|スクール/.test(l)) l = prefShort() + 'の' + l;
    if (inst && inst.city) l = l.replace(prefShort() + 'の', inst.city + 'の');
    return l;
  }

  // ---- 偏差値と合格率 ----
  const SUBJ_ALL = { jpn: 1, math: 1, sci: 1, soc: 1, eng: 1 };
  // 重みのキーの値（教科・技術・才能・ステータス）
  function wv(k) {
    if (k.startsWith('skill.')) return G.skill[k.slice(6)] || 0;
    if (k.startsWith('subj.')) return G.subj[k.slice(5)] ?? 50;
    if (k === 'academic') return G.stats.academic;
    if (k in G.talents) return G.talents[k] ?? 50;
    if (k in G.stats) return G.stats[k];
    return G.subj[k] ?? 50;
  }
  function selfHensachi(weights) {
    const w = weights && Object.keys(weights).length ? weights : SUBJ_ALL;
    let s = 0, n = 0;
    for (const [k, x] of Object.entries(w)) {
      const v = wv(k);
      s += v * x; n += x;
    }
    return 25 + (n ? s / n : 50) * 0.5;
  }
  const rateOf = (d) => Math.round(logistic(d) * 100);
  function reportAvg() { const r = G.reports[G.reports.length - 1]; if (!r) return 3; const v = Object.values(r.grades).filter((x) => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 3; }
  function examBonus(t) {
    let b = 0;
    if (reportAvg() >= 4) b += 2;
    if (G.flags.national_tournament) b += 3;
    if (G.counters.ronin_years) b += G.counters.ronin_years === 1 ? 2 : 1;
    if (t && t.recommendBonus && reportAvg() >= 4) b += t.recommendBonus / 2;
    return b;
  }
  // 学校のインスタンス（偏差値を範囲内で決める）。県とテンプレで固定（同じ人生なら同じ学校）
  function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
  function inst(t, i = 0, extra = '') {
    const r = t.hensachi;
    const hv = Array.isArray(r) && r[1] > 0 ? Math.round(r[0] + (r[1] - r[0]) * seeded(G.seed + t.id + i + extra)) : null;
    return { id: `${t.id}#${i}${extra ? '#' + extra : ''}`, tmpl: t.id, h: hv };
  }
  // 選んだものを覚えておく（target の表示・入学に使う）
  function remember(o) { G.picked = G.picked || {}; G.picked[o.id] = { id: o.id, tmpl: o.tmpl, h: o.h, name: o.name, emoji: o.emoji, dept: o.dept, years: o.years, cost: o.cost, where: o.where, city: o.city, rate: o.rate, stage: o.stage, pref: o.commute ? null : o.pref, commute: o.commute }; }
  const picked = (id) => (G.picked || {})[id] || null;

  // ---- 学費 ----
  function univCost(t, d) {
    const c = S().postSecondary.cost;
    let ct = c[t.costByType] || c.private;
    let y = ct.yearly, e = ct.entry || 0;
    if (d && d.costOverride) y = d.costOverride[t.costByType === 'national' ? 'national' : 'private'] || y;
    else if (t.costByType === 'private' && d && d.track === 'rikei') y += c.private.rikeiPlus;
    return { entry: e, yearly: y };
  }

  // ---- メニュー本体 ----
  // 戻り値: [{ id, emoji, label, sub, rate(0-100|null), data }]
  function build(src, filter, ctx = {}) {
    switch (src) {
      case 'schools.preschool': return S().preschool.filter((s) => Cond.test(s.when || {}, {})).map((s) => item(s, { sub: s.cost ? `年${s.cost}万円` : '費用はほぼなし' }));
      case 'schools.elementary': return S().elementary.filter((s) => s.exam && s.exam !== false && Cond.test(s.when || {}, {})).map((s) => { const r = s.exam === 'lottery' ? 15 : s.exam === 'interview' ? 60 : rateOf(selfHensachi({ jpn: 1, math: 1 }) - 52); return item(s, { rate: r, sub: `年${s.cost}万円` }); });
      case 'schools.juniorHigh': return jhsMenu();
      case 'schools.highSchool': return hsMenu(filter);
      case 'schools.postByPlan': return postMenu(filter);
      case 'schools.vocational': return vocMenu();
      case 'schools.graduate': return gradMenu();
      case 'schools.abroad': return S().postSecondary.abroad.filter((a) => a.id !== 'ab_wh' && (!a.age || (G.age >= a.age[0] && G.age <= a.age[1]))) // ワーキングホリデーは学校の留学ではないので出さない.map((a) => item(a, { sub: `約${a.cost}万円` }));
      case 'schools.affiliatedDepts': return affilMenu();
      case 'jobs.jobs': return jobMenu('new', filter);
      case 'jobs.midCareer': return jobMenu('mid', filter);
      case 'jobs.civil': return jobMenu('civil', filter);
      case 'jobs.partTimeJobs': return J().partTimeJobs.filter((p) => G.age >= (p.minAge || 16) && (!p.requires || !p.requires.stage || p.requires.stage.includes(G.stage))).map((p) => item(p, { sub: `時給${p.wage}円・週${p.hoursWeek}時間` }));
      case 'clubs.lessons': return C().lessons.filter((l) => !l.viaEventOnly).filter((l) => !l.age || (G.age >= l.age[0] && G.age <= l.age[1])).filter((l) => !(l.id === 'ls_juku' && G.age >= 15)).filter(lessonHere).filter((l) => !G.clubs.some((c) => c.id === l.id)).map((l) => item(l, { sub: `年${l.cost}万円・${Engine.lessonEffText ? Engine.lessonEffText(l) : ''}` }));
      case 'clubs.adultLessons': return (C().adultLessons || []).filter((l) => !l.age || (G.age >= l.age[0] && G.age <= l.age[1])).filter((l) => !G.clubs.some((c) => c.id === l.id)).map((l) => item(l, { sub: `年${l.cost}万円` }));
      case 'clubs.jhsClubs': return C().jhsClubs.map((l) => item(l, { sub: clubSub(l) }));
      case 'clubs.hsClubs': return [...C().jhsClubs.filter((c) => !C().hsClubsExtra.some((x) => x.label === c.label)), ...C().hsClubsExtra].map((l) => item(l, { sub: clubSub(l) }));
      case 'clubs.univCircles': return C().univCircles.map((l) => item(l, { sub: clubSub(l) }));
      case 'clubs.current': return G.clubs.map((c) => item(club(c.id) || { id: c.id, emoji: '🎒', label: c.id }, {}));
      case 'clubs.hobbies': return C().hobbies.filter((x) => (!x.age || (G.age >= x.age[0] && G.age <= x.age[1])) && !G.hobbies.includes(x.id)).map((x) => item(x, { sub: x.cost ? `年${x.cost}万円くらい` : '' }));
      case 'focus': return focusMenu();
      case 'qualifications': return qualMenu();
      default: console.warn('未対応のメニュー', src); return [];
    }
  }
  // その地域に教室があるか（都会にしかない習い事もある）
  function lessonHere(l) { const t = l.tiers || l.tier; if (t && !t.includes(tier())) return false; if (l.climate && !l.climate.includes(pref().climate)) return false; return true; }
  function item(t, o = {}) { return { id: t.id, tmpl: t.id, emoji: t.emoji || '・', label: t.label, name: t.label, sub: o.sub || '', rate: o.rate ?? null, ...o }; }
  const clubSub = (l) => ['', 'ゆるめ', 'ふつう', 'ほぼ毎日'][l.time || 0] + (l.cost ? `・年${l.cost}万円` : '');

  function jhsMenu() {
    const out = [];
    for (const t of S().juniorHigh) {
      if (t.id === 'jh_public' || t.exam === false) continue;
      if (G.vars.ikkanOnly && t.id !== 'jh_public_ikkan') continue;
      if (!Cond.test(t.when || {}, {})) continue;
      const n = t.countByTier ? t.countByTier[tier()] || 0 : (tier() === 'C' ? 0 : 1);
      for (let i = 0; i < Math.max(1, n); i++) {
        if (t.countByTier && !n) break;
        const s = inst(t, i);
        const hs = selfHensachi(t.subjects);
        let rate = rateOf(hs - s.h + examBonus(t) + (G.clubs.some((c) => c.id === 'ls_juken_juku') ? 3 : 0));
        if (t.exam === 'tekisei') rate = Math.round(rate * 0.45);
        out.push({ ...s, emoji: t.emoji, label: schoolName(t), name: schoolName(t), sub: `偏差値${s.h}・年${t.cost}万円`, rate, cost: t.cost, stage: t.stage });
      }
    }
    return out.sort((a, b) => b.h - a.h);
  }
  function hsMenu(filter) {
    const out = [];
    const mul = D().prefectures.tiers[tier()].schoolChoices;
    for (const t of S().highSchool) {
      if (t.when && t.when.tier && !t.when.tier.includes(tier())) continue;
      if (t.when && t.when.wealthMin && G.talents.familyWealth < t.when.wealthMin) continue;
      if (t.id === 'hs_priv_sports' && !(G.flags.national_tournament || (G.skill.sport || 0) >= 50)) continue;
      const n = t.always ? 1 : Math.max(0, Math.round((t.countByTier ? t.countByTier[tier()] || 0 : 1) * (tier() === 'A' ? 1 : mul / (tier() === 'B' ? 0.6 : 0.35))));
      const cnt = Math.min(n, t.always ? 1 : 3);
      for (let i = 0; i < cnt; i++) {
        const s = inst(t, i);
        const hs = selfHensachi(t.subjects);
        const rate = t.hensachi && t.hensachi[1] === 0 ? 97 : rateOf(hs - s.h + examBonus(t));
        // 東京都は私立高校の授業料を助成（所得制限なし・都内私立の平均授業料 年49万円くらいまで）
        const tokyoAid = G.pref === 'tokyo' && t.id.startsWith('hs_priv');
        const cost = tokyoAid ? t.cost - 49 : t.cost;
        out.push({ ...s, emoji: t.emoji, label: schoolName(t), name: schoolName(t), sub: s.h ? `偏差値${s.h}・年${cost}万円${tokyoAid ? '（都の助成あり）' : ''}` : (t.exam === 'document' ? '書類と面接' : '面接のみ') + `・年${cost}万円`, rate, cost, years: t.years || 3, stage: t.stage });
      }
    }
    // 成績に合わせて、挑戦校〜安全校の順に（先生と親が出す候補）
    const me = selfHensachi();
    return out.sort((a, b) => Math.abs((a.h ?? 30) - me - 2) - Math.abs((b.h ?? 30) - me - 2));
  }
  function trackOk(d) { if (d.track === 'both') return true; if (G.flags.track_rikei) return d.track === 'rikei'; if (G.flags.track_bunkei) return d.track === 'bunkei'; return true; }
  function postMenu(filter) {
    const plan = G.vars.plan;
    if (plan === 'jc') return S().postSecondary.juniorCollege.map((t) => { const s = inst(t, 0); return { ...s, emoji: t.emoji, label: schoolName(t), name: schoolName(t), sub: `偏差値${s.h}・2年・年${t.cost}万円`, rate: rateOf(selfHensachi() - s.h + examBonus()), years: t.years, cost: t.cost, stage: 'junior_college' }; });
    if (plan === 'voc') return vocMenu();
    const out = [];
    const ps = S().postSecondary;
    const big = S().bigCities;
    for (const t of ps.universityTiers) {
      if (plan === 'abroad' ? t.where !== 'abroad' : t.where === 'abroad') continue;
      if (t.tierOnly && !t.tierOnly.includes(tier()) && t.where === 'home') continue;
      // 県内の大学数（pref.univCount）で、地元にある大学の種類と学部の数が変わる（東京145校・島根2校など）
      const uc = pref().univCount ?? 10;
      const homeNeed = { u_national: 0, u_public: 3, u_private_mid: 12, u_private_easy: 3, u_edu: 6 }[t.id];
      if (t.where !== 'city' && t.where !== 'abroad' && homeNeed != null && uc < homeNeed) continue;
      if (t.requires && t.requires['subj.eng'] && (G.subj.eng || 0) < t.requires['subj.eng'] - 15) continue;
      const depts = t.fixedDept ? [dept(t.fixedDept)] : ps.departments.filter(trackOk).filter((d) => !d.skillCheck || t.fixedDept);
      // 学部は2〜3つずつ（成績に近いものから）
      const ucN = pref().univCount ?? 10; const nDept = t.fixedDept ? 1 : t.where === 'city' || t.where === 'abroad' ? 3 : ucN >= 100 ? 5 : ucN >= 25 ? 3 : ucN >= 8 ? 2 : 1;
      const ranked = depts.map((d) => ({ d, k: seeded(G.seed + t.id + d.id) })).sort((a, b) => a.k - b.k).slice(0, nDept).map((x) => x.d);
      for (const d of ranked) {
        const s = inst(t, 0, d.id);
        const h = s.h + (d.hensachiBonus || 0);
        const city = t.where === 'city' ? (t.cities ? pick2(t.cities, t.id) : big.includes(G.pref) ? null : pick2(big, t.id)) : null;
        const cityName = city ? prefOf(city).name.replace(/[都道府県]$/, '') : null;
        const away = t.where === 'abroad' || !!city;
        const cost = univCost(t, d);
        const years = d.years || 4;
        const hs = selfHensachi(d.subjects || t.subjects);
        let rate = rateOf(hs - h + examBonus());
        if (d.skillCheck) { const sk = Math.max(...Object.keys(d.skillCheck).map((k) => G.skill[k] || 0)); rate = Math.round(rate * (0.4 + sk / 100)); }
        const nm = `${t.where === 'abroad' ? '' : (cityName || prefShort()) + 'の'}${t.label} ${d.label}学部`;
        out.push({ id: s.id, tmpl: t.id, h, dept: d.id, emoji: d.emoji, label: nm, name: nm, sub: `偏差値${h}・${years}年・年${cost.yearly}万円${away ? '・ひとり暮らし' : ''}`, rate, years, cost: cost.yearly, entry: cost.entry, where: t.where, city, stage: d.stage || 'univ' });
      }
    }
    const me = selfHensachi();
    return out.sort((a, b) => Math.abs(a.h - me - 2) - Math.abs(b.h - me - 2));
  }
  const pick2 = (arr, salt) => arr[Math.floor(seeded(G.seed + salt) * arr.length)];
  // 地方（C）にあるのは、看護・介護・保育・調理・美容・自動車整備・医療事務・公務員など、地元で働く人をそだてる学校が中心
  const VOC_LOCAL = ['vo_nurse', 'vo_care', 'vo_nursery', 'vo_cook', 'vo_beauty', 'vo_auto', 'vo_medoffice', 'vo_civil', 'vo_arch'];
  const VOC_MID = VOC_LOCAL.concat(['vo_pt', 'vo_it', 'vo_patissier', 'vo_design', 'vo_animal']);
  function vocMenu() {
    const T = tier();
    return S().postSecondary.vocational.filter((t) => T === 'A' || (T === 'B' ? VOC_MID : VOC_LOCAL).includes(t.id)).map((t) => { const s = inst(t, 0); return { ...s, emoji: t.emoji, label: schoolName(t), name: schoolName(t), sub: `${t.years}年・年${t.cost}万円`, rate: clamp(rateOf(selfHensachi() - s.h + 6), 80, 97), years: t.years, cost: t.cost, stage: 'vocational', dept: t.id }; });
  }
  function gradMenu() {
    return S().postSecondary.graduate.filter((g) => (g.requires || []).every((f) => G.flags[f] || (f === 'edu_univ_grad' && G.stage === 'univ')) && (!g.minAge || G.age >= g.minAge)).map((g) => {
      const base = g.id === 'gr_doctor' ? 50 : g.id === 'gr_law' ? 55 : g.id === 'gr_abroad' ? 62 : 48;
      return { id: g.id, tmpl: g.id, emoji: g.emoji, label: g.label, name: g.label, sub: `${g.years}年・年${g.cost}万円`, rate: rateOf(selfHensachi() - base + (G.flags.track_rikei && g.id === 'gr_master_rikei' ? 4 : 0)), years: g.years, cost: g.cost, stage: g.stage, dept: g.id };
    });
  }
  function affilMenu() {
    const avg = reportAvg();
    return S().postSecondary.departments.filter((d) => !d.years).slice(0, 15).map((d) => {
      const need = 2.8 + seeded(G.seed + d.id) * 1.6;
      const rate = Math.round(clamp(1 / (1 + Math.exp(-(avg - need) / 0.35)), 0.05, 0.97) * 100);
      const nm = `系列の私立大学 ${d.label}学部`;
      return { id: 'u_affil#' + d.id, tmpl: 'u_private_mid', h: 55, dept: d.id, emoji: d.emoji, label: nm, name: nm, sub: `内申のめやす ${need.toFixed(1)}`, rate, years: 4, cost: 100, stage: 'univ' };
    }).sort((a, b) => b.rate - a.rate);
  }

  // ---- 職業 ----
  function eduLevel(final = true) {
    const f = G.flags;
    if (f.edu_doctor_grad) return 5;
    if (f.edu_master_grad) return 4;
    if (f.edu_univ_grad || f.edu_med_grad || f.edu_abroad_degree) return 3;
    if (f.edu_jc_grad || f.edu_vocational_grad || f.edu_kosen_grad) return 2;
    if (f.edu_hs_grad || f.edu_hs_kentei) { /* 在学中の最終学年なら卒業見込みで数える */ }
    if (final && G.school && schoolYearsLeft() <= 1) {
      const st = G.stage;
      if (st === 'grad_doctor') return 5; if (st === 'grad_master' || st === 'grad_prof') return 4;
      if (st === 'univ' || st === 'univ_med') return 3; if (['junior_college', 'vocational', 'kosen'].includes(st)) return 2;
      if (['hs', 'hs_corr', 'hs_night'].includes(st)) return 1;
    }
    if (f.edu_hs_grad || f.edu_hs_kentei) return 1;
    return 0;
  }
  function jobRate(j, mode) {
    if (j.always || j.id === 'j_parttime_general') return 97;
    const hs = selfHensachi(j.weights);
    let d = hs - (j.hensachi || 40);
    d += (G.talents.t_comm - 50) / 10 + (G.stats.social - 50) / 10; // 面接（±5）
    for (const [f, b] of Object.entries(j.bonusFlags || {})) if (G.flags[f]) d += b;
    // 地方は会社の数が少なく、事務・企画などの仕事は少ない枠の取りあいになる
    if (!LOCAL_JOBS.includes(j.id) && j.cat !== 'civil') d -= tier() === 'C' ? 4 : tier() === 'B' ? 2 : 0;
    // TOEICの点数は、英語を使う仕事（外資・商社・航空・ホテル・通訳など）でだけ有利
    if (engJob(j)) d += G.flags.toeic_900 ? 7 : G.flags.toeic_800 ? 5 : G.flags.toeic_600 ? 2.5 : G.flags.eiken_2 || G.flags.eiken_p1 ? 1.5 : 0;
    const sc = G.school && picked(G.vars.schoolPick || '');
    if (sc && sc.tmpl) { const t = school(sc.tmpl); if (t && t.jobRank) d += (t.jobRank - 3) * 2; }
    if (G.vars.major) { const dp = dept(G.vars.major); if (dp && (dp.opens || []).some((o) => (j.tags || []).includes(o) || j.cat === o)) d += 3; }
    if (mode === 'mid') d -= j.midCareerFriendly ? 0 : 3 + Math.max(0, G.age - 35) / 3;
    if (G.flags.vo_civil_bonus && j.cat === 'civil') d += 5;
    // AIの波のあとで置きかわりやすい仕事は、求人が減る（ai_impact.json）
    const ai = D().ai_impact.jobs[j.id];
    if (ai && calYear() >= (ai.wave || 2035)) { if (ai.risk >= 0.7) d -= 6; else if (ai.risk >= 0.45) d -= 2; }
    if (ai && D().ai_impact.rules.growthJobs.includes(j.id) && calYear() >= 2035) d += 2;
    return rateOf(d);
  }
  // 資格取得見込み：最終学年なら、卒業で必ずもらえる資格（学校の onGraduate・grantOnGrad）を持っているものとして就職先を選べる
  function expectedFlags() {
    const out = new Set();
    if (!G.school || schoolYearsLeft() > 1) return out;
    const t = school(G.school.tmpl) || (G.vars.major && school(G.vars.major));
    if (t) [...(t.onGraduate || []), ...(t.grantOnGrad || [])].forEach((f) => { if (!G.flags[f]) out.add(f); });
    return out;
  }
  const LIC = () => D().flags.flags.license || {};
  const licLabel = (f) => LIC()[f] || f;
  const engJob = (j) => ((j.weights || {}).eng || 0) >= 1 || (j.tags || []).some((t) => t === 'global' || t === 'airline');
  const hasToeic = () => !!(G.flags.toeic_600 || G.flags.toeic_800 || G.flags.toeic_900);
  function jobOk(j, mode) {
    if (j.viaEventOnly) return false;
    if (j.id === 'j_parttime_general') return mode !== 'civil';
    if (mode === 'civil' && j.cat !== 'civil') return false;
    if (mode !== 'civil' && j.exam === 'ev_m_civil_exam') return false;
    if (mode !== 'civil' && j.exam === 'ev_m_kyosai') return false;
    if ((j.eduMin || 0) > eduLevel()) return false;
    const exp = expectedFlags();
    if ((j.requires || []).some((f) => !G.flags[f] && !exp.has(f))) return false;
    if (j.requiresAny && !j.requiresAny.some((f) => G.flags[f])) return false; // 英語の資格など、どれか1つが必要
    if ((j.excludes || []).some((f) => G.flags[f])) return false;
    if (j.minAge && G.age < j.minAge) return false;
    if (j.maxAge && G.age > j.maxAge) return false;
    if (j.healthMin && G.stats.health < j.healthMin) return false;
    if (j.tiers && !j.tiers.includes(tier()) && !G.flags.moved_to_tokyo) return false;
    // 東京（や大阪）にしかない仕事：ほかの県からは、上京して働く（45歳まで）
    if (j.prefOnly && !j.prefOnly.includes(G.pref) && (G.age > 45 || G.flags.in_facility)) return false;
    if (j.coastOnly && pref().rural < 0.3) return false;
    if (j.id === 'j_pro_athlete' && !(G.flags.national_tournament || G.flags.koshien || (G.skill.sport || 0) >= 70)) return false;
    if (G.job && G.job.id === j.id) return false;
    const ai = D().ai_impact.jobs[j.id];
    if (ai && ai.risk >= 0.7 && calYear() >= (ai.wave || 2035) + 5 && mode !== 'mid') return false;
    return true;
  }
  // どこにでもある仕事（地方でも求人がある）
  const LOCAL_JOBS = ['j_care', 'j_nurse', 'j_nursery', 'j_teacher_elem', 'j_teacher_sec', 'j_civil_local', 'j_police', 'j_firefighter', 'j_sdf', 'j_farmer', 'j_fisher', 'j_factory', 'j_carpenter', 'j_electrician', 'j_truck', 'j_delivery', 'j_taxi', 'j_office', 'j_sales', 'j_sales_shop', 'j_store_manager', 'j_cook', 'j_family_business', 'j_parttime_general', 'j_pharmacist', 'j_doctor', 'j_dentist', 'j_pt', 'j_beautician', 'j_mechanic', 'j_hotel', 'j_juku', 'j_construction_mgr', 'j_bank', 'j_cleaning', 'j_welfare', 'j_accounting', 'j_realestate'];
  // 地方の求人：その年に募集がある仕事だけ（大都市圏はぜんぶ、地方中核は7割、地方は4割）。仕事の種類が少ないぶん、決まった枠を取りあう
  function jobHere(j) {
    const T = tier(); if (T === 'A' || LOCAL_JOBS.includes(j.id) || j.cat === 'civil' || j.prefOnly) return true;
    if ((j.requires || []).some((f) => G.flags[f] && LIC()[f])) return true; // 資格がいる仕事（会計士・弁護士など）はどこの県にもある
    return seeded(G.seed + j.id + G.pref + calYear()) < (T === 'B' ? 0.7 : 0.4);
  }
  function jobMenu(mode) {
    const list = J().jobs.filter((j) => jobOk(j, mode) && jobHere(j));
    const exp = expectedFlags();
    const out = list.map((j) => {
      const ai = D().ai_impact.jobs[j.id];
      const sal = Econ.salaryPreview(j, j.prefOnly && !j.prefOnly.includes(G.pref) ? j.prefOnly[0] : null);
      const expect = (j.requires || []).filter((f) => exp.has(f));
      // 持っている資格が生きる仕事（必須の資格・有利になる資格）
      const held = (j.requires || []).filter((f) => G.flags[f] && LIC()[f]);
      const plus = Object.keys(j.bonusFlags || {}).filter((f) => G.flags[f] && LIC()[f] && !held.includes(f));
      const away = j.prefOnly && !j.prefOnly.includes(G.pref) ? j.prefOnly[0] : null;
      const tags = [];
      if (j.prefOnly) tags.push(`🗼 ${j.prefOnly.map((p) => Fam.prefName(p).replace(/[都道府県]$/, '')).join('・')}だけの仕事${away ? '（上京する）' : ''}`);
      if (j.dream) tags.push('🎲 ふだんは低収入・売れれば大金持ち');
      if (held.length || plus.length) tags.push(`📜 ${[...held, ...plus].map(licLabel).join('・')}が生きる`);
      return { id: j.id, pref: away || undefined, lic: held.length ? 2 : plus.length ? 1 : 0, xtra: tags.length ? '・' + tags.join('・') : '', tmpl: j.id, emoji: j.emoji, label: j.label, name: j.label, sub: `年収 約${sal}万円${ai && ai.risk >= 0.7 ? '・🤖AIの影響大' : ''}${expect.length ? `・🎓 ${expect.map(licLabel).join('・')}取得見込み` : ''}`, rate: jobRate(j, mode), job: true, expect: expect.length > 0 };
    });
    const tm = G.school && school(G.school.tmpl);
    // 好きなこと・学部に合うものを先に。そのあと合格率の高い順
    const like = Cond.likeMain();
    const fit = (o) => { const j = job(o.id); let s = 0; if ((j.tags || []).includes(like)) s += 2; if (G.vars.major) { const dp = dept(G.vars.major) || school(G.vars.major); if (dp && (dp.opens || []).some((x) => (j.tags || []).includes(x) || j.cat === x || j.id.includes(x))) s += 3; }
      // 通っている学校（専門学校・短大など）で学んだこと
      if (s < 3 && tm && (tm.opens || []).some((x) => (j.tags || []).includes(x) || j.cat === x || j.id.includes(x))) s += 3;
      if (o.expect) s += 6; // 資格取得見込みの仕事はいちばん上に
      if (o.lic === 2) s += 6; else if (o.lic === 1) s += 1.5; // 持っている資格が必須の仕事も上に
      return s; };
    for (const o of out) { o.sub += o.xtra; delete o.xtra; const jj = job(o.id); if (jj && engJob(jj) && hasToeic()) o.sub += '・🔤 TOEICが生きる'; }
    for (const o of out) { const f = fit(o); if (f >= 3 && !o.expect) o.sub += '・👍 学んだことが生きる'; else if (f >= 2) o.sub += '・💚 好きなことに合う'; }
    return out.sort((a, b) => fit(b) + b.rate / 40 - (fit(a) + a.rate / 40)).slice(0, 25);
  }

  // ---- 重点方針（docs/09 §3-4） ----
  const FOCUS = {
    focus_study: { e: '📚', l: '勉強', when: ['school'] }, focus_strength: { e: '🎯', l: '得意を伸ばす', when: ['elem', 'jhs', 'hs', 'univ'] },
    focus_weakness: { e: '🩹', l: '苦手をなくす', when: ['elem', 'jhs', 'hs'] }, focus_club: { e: '⚽', l: '部活・習い事', when: ['elem', 'jhs', 'hs'] },
    focus_friends: { e: '🧑‍🤝‍🧑', l: '友達と遊ぶ', when: ['elem', 'jhs', 'hs', 'univ'] }, focus_hobby: { e: '🎮', l: '趣味', when: ['all'] },
    focus_parttime: { e: '💴', l: 'バイト', when: ['student16'] }, focus_love: { e: '💕', l: '恋愛', when: ['age15'] },
    focus_work: { e: '💼', l: '仕事', when: ['adult'] }, focus_family: { e: '🏠', l: '家族', when: ['adult'] },
    focus_health: { e: '🏋️', l: '健康', when: ['all'] }, focus_qualify: { e: '📖', l: '資格・自己投資', when: ['age18'] },
    focus_invest: { e: '💹', l: '副業・投資', when: ['age20'] }, focus_rest: { e: '😌', l: '休養', when: ['all'] },
  };
  const FOCUS_DESC = {
    focus_study: '全教科がよく伸びる。ストレス↑', focus_strength: '得意な2教科がぐんと伸びる', focus_weakness: '苦手な2教科が伸びる。ストレス少し↑',
    focus_club: '部活・習い事のスキルと体育↑。人間関係↑', focus_friends: '人間関係・満足感↑。学力は少し↓', focus_hobby: '趣味が深まる。ストレス↓・満足感↑',
    focus_parttime: 'バイト代が2倍。学力↓', focus_love: '恋のできごとが起きやすい', focus_work: '昇進しやすい。ストレス↑・健康↓',
    focus_family: '家族の満足↑。昇進は少し↓', focus_health: '健康↑・運動習慣がつくかも', focus_qualify: '資格試験に受かりやすい',
    focus_invest: '副業・投資のできごとが増える（リスクも）', focus_rest: 'ストレスがぐっと下がる。ほかの伸び↓',
  };
  const isStudent = () => ['elem', 'jhs', 'hs', 'hs_corr', 'hs_night', 'kosen', 'univ', 'univ_med', 'junior_college', 'vocational', 'grad_master', 'grad_doctor', 'grad_prof', 'ronin', 'free_school'].includes(G.stage);
  function focusOk(k) {
    const st = G.stage, a = G.age;
    const sch = { elem: ['elem', 'free_school'], jhs: ['jhs'], hs: ['hs', 'hs_corr', 'hs_night', 'kosen'], univ: ['univ', 'univ_med', 'junior_college', 'vocational'] };
    return FOCUS[k].when.some((w) => {
      if (w === 'all') return true;
      if (w === 'school') return isStudent();
      if (w === 'student16') return isStudent() && a >= 16;
      if (w === 'age15') return a >= 15;
      if (w === 'age18') return a >= 18;
      if (w === 'age20') return a >= 20;
      if (w === 'adult') return !isStudent() && a >= 18;
      return (sch[w] || []).includes(st);
    });
  }
  function focusMenu() { return Object.keys(FOCUS).filter(focusOk).map((k) => ({ id: k, emoji: FOCUS[k].e, label: FOCUS[k].l, name: FOCUS[k].l, sub: FOCUS_DESC[k], rate: null })); }
  const focusLabel = (k) => (FOCUS[k] ? `${FOCUS[k].e} ${FOCUS[k].l}` : '—');

  function qualMenu() {
    return D().events_random.qualifications.filter((q) => !G.flags[q.flag] && (!q.minAge || G.age >= q.minAge) && (q.requires || []).every((f) => G.flags[f]) && (!q.requiresAny || q.requiresAny.some((f) => G.flags[f])) && (!q.requiresJob || (G.job && q.requiresJob.includes(G.job.id) && G.jobYears >= (q.requiresJobYears || 0))))
      .map((q) => ({ id: q.id, tmpl: q.id, emoji: q.emoji, label: q.label, name: q.label, sub: `費用 約${q.cost}万円`, rate: qualRate(q) }));
  }
  function qualRate(q) {
    let p = q.rate;
    for (const [k, w] of Object.entries(q.w || {})) p += ((Cond.statVal(k.startsWith('skill.') || k === 'academic' ? k : 'subj.' + k) - 50) / 100) * w;
    if (G.focus === 'focus_qualify') p += 0.15;
    return Math.round(clamp(p, 0.03, 0.97) * 100);
  }

  return { expectedFlags, build, wv, lessonHere, school, dept, job, club, hobby, qual, remember, picked, schoolName, selfHensachi, rateOf, eduLevel, focusLabel, focusOk, FOCUS, isStudent, reportAvg, univCost, inst, prefShort };
})();
