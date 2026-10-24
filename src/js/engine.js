'use strict';
// ===== エンジン：1季節ずつ進める（docs/09 §1〜§9） =====
const Engine = (() => {
  const EV = {};
  let built = false;
  function index() {
    if (built) return; built = true;
    for (const [f, src] of [['m', 'events_mandatory'], ['r', 'events_random'], ['f', 'events_flow'], ['w', 'events_world'], ['h', 'events_family']]) for (const e of D()[src].events) { EV[e.id] = { ...e, _src: f }; }
    EV.__sibling_birth = EV.ev_f_sibling_birth;
  }
  const ev = (id) => (index(), EV[id === '__sibling_birth' ? 'ev_f_sibling_birth' : id]);
  const gentleOut = (id) => G.mode === 'gentle' && D().modes.modes.gentle.excludeEvents.includes(id);
  const isQuietYear = () => G.age <= 5 || G.age >= 80; // 年2枠
  const activeQ = () => !isQuietYear() || G.q === 0 || G.q === 2;

  // ---------- はじまり ----------
  function begin() {
    index();
    G.queue = [{ id: 'ev_m_birth' }];
    // 世の中：2010年4月スタート
    save();
  }

  // ---------- 予約 ----------
  function schedule(id, inYears = 0, season, ctx = {}) {
    let y = G.year + (inYears || 0);
    let q = season ? SEASONS.indexOf(season) : G.q + (inYears ? 0 : 1);
    if (!season && !inYears) { q = G.q + 1; if (q > 3) { q = 0; y++; } }
    if (season && y === G.year && q < G.q) y++;
    if (season && y === G.year && q === G.q) { q = q; }
    const data = {};
    if (ctx.who) data.who = ctx.who.id;
    if (ctx.child) data.child = ctx.child.id;
    if (ctx.sibData) data.sibData = ctx.sibData;
    G.scheduled.push({ event: id, at: { year: y, q }, data });
  }

  // ---------- 1季節の候補を集める ----------
  function buildQueue() {
    index();
    const Q = [];
    const has = (id) => Q.some((x) => x.id === id);
    const add = (id, ctx = {}) => { if (!has(id) || ctx.allowDup) Q.push({ id, ctx: packCtx(ctx) }); };
    // 1. 予約イベント
    const due = G.scheduled.filter((s) => s.at.year < G.year || (s.at.year === G.year && s.at.q <= G.q));
    G.scheduled = G.scheduled.filter((s) => !due.includes(s));
    for (const s of due) {
      if (s.event === '__unpause') { (G.loans || []).forEach((l) => (l.paused = false)); continue; }
      if (s.event === '__return_leave') { if (G.employment === 'leave') G.employment = G.job ? G.job.form : 'none'; continue; }
      const e = ev(s.event); if (!e || gentleOut(e.id)) continue;
      const ctx = unpackCtx(s.data || {});
      if (s.event === '__sibling_birth') ctx.sibData = s.data;
      const w = { ...e.when }; delete w.season; delete w.cooldownYears;
      if (!Cond.test(w, { ev: e, ...ctx })) continue;
      Q.push({ id: e.id, ctx: packCtx(ctx), sched: true });
    }
    if (!activeQ()) return finishQueue(Q);
    // 2. 必須イベント・世の中のできごと
    const afters = [];
    const FAM = (D().events_family || { events: [] }).events;
    const L = (src) => (src === 'events_family' ? FAM : D()[src].events);
    for (const src of ['events_world', 'events_mandatory', 'events_family']) {
      for (const e0 of L(src)) {
        if (src === 'events_family' && (e0.weight || e0.kind !== 'choice')) continue;
        const e = ev(e0.id);
        if (e.type === 'scheduled' || (e.when && e.when.engine) || e.risk) continue;
        if (gentleOut(e.id) || has(e.id)) continue;
        if (!onceYearOk(e)) continue;
        const ctx = { ev: e };
        if (!Cond.test(e.when, ctx)) continue;
        if (e.when.after) afters.push({ id: e.id, ctx: packCtx(ctx) }); else Q.push({ id: e.id, ctx: packCtx(ctx) });
      }
    }
    Q.push(...afters);
    // 習い事を続ける？（要望3：春に。学年が上がる・入学・就職のとき）
    if ((G.q === 0 || G.vars.lessonForce) && G.clubs.some((c) => isLesson(c.id))) Q.push({ id: '__lessons', ctx: {} });
    // 3. リスク（病気・事故・失業など）
    let riskChoice = false;
    for (const src of ['events_random', 'events_flow', 'events_world', 'events_family']) {
      for (const e0 of L(src)) {
        const e = ev(e0.id);
        if (!e.risk || e.type === 'scheduled' || e.risk === 'death_byPerson' || gentleOut(e.id) || has(e.id)) continue;
        if (e.id === 'ev_r_care_self' && G.vars.selfCare) continue; // 介護が必要になるのは1回
        if (e.kind === 'choice' && riskChoice) continue;
        const ctx = { ev: e };
        if (!Cond.test(e.when, ctx) || !onceYearOk(e)) continue;
        const p = riskP(e, ctx);
        if (p > 0 && chance(p)) { add(e.id, ctx); if (e.kind === 'choice') riskChoice = true; }
      }
    }
    // お金の非常事態（ランダムを待たない）
    //  ・借金がある状態で1年（4季節）赤字が続いた → 資産があれば「資産を整理しないと…」、なければ「借金が返せなくなってきた」
    //  ・収入がなく所持金もない → 生活保護の相談
    //  ・3か月赤字だった → 「生活水準や趣味を見直してみようか……」
    if (G.age >= 18 && !Menu.isStudent() && !hasChoiceQ(Q)) {
      const tryAdd = (id) => { const e = ev(id); const ctx = { ev: e }; if (e && !gentleOut(id) && onceYearOk(e) && Cond.test(e.when, ctx)) { add(id, ctx); return true; } return false; };
      const hasAssets = G.assets >= 1 || (G.flags.owns_house && !G.flags.lives_with_parents) || G.flags.owns_rental || G.flags.owns_car;
      const defQ = G.vars.defQ || 0;
      const yearOut = Econ.expenses().total;
      const lowCash = G.cash < yearOut / 2; // 現金が半年分ない
      let done = false;
      if (defQ >= 4 && lowCash && Econ.totalDebt() >= 1) done = hasAssets ? tryAdd('ev_m_asset_sell') : Econ.consumerDebt() >= 1 && tryAdd('ev_r_debt_crisis');
      if (!done && chance(0.5)) done = tryAdd('ev_r_welfare');
      if (!done && defQ >= 1 && defQ < 4 && G.cash < yearOut * 2 && Econ.lifeLevel() !== 'save' && !G.flags.welfare) tryAdd('ev_m_budget_review'); // 貯金が2年分あれば、少しの赤字は気にしない
    }
    // プロポーズ：付き合って2年以上たったら、毎年40%（45歳からは12%）で「する」か「される」が来る（ランダムを待たない）
    if (G.q === 1 && G.age >= 22 && G.flags.has_partner && !G.flags.married && !hasChoiceQ(Q) && chance(G.age < 45 ? 0.4 : 0.12)) {
      const id = chance(0.5) ? 'ev_r_propose' : 'ev_r_proposed';
      const e = ev(id); const ctx = { ev: e }; const w = { ...e.when, person: { ...e.when.person, years: 2 } };
      if (e && !gentleOut(id) && onceYearOk(e) && Cond.test(w, ctx)) add(id, ctx);
    }
    // 4. 条件がそろったら起きる流れイベント（重みなし）・判定つきの流れイベント
    for (const src of ['events_flow', 'events_random', 'events_family']) {
      for (const e0 of L(src)) {
        const e = ev(e0.id);
        if (e.kind !== 'flow' || e.weight || e.risk || e.type === 'scheduled' || gentleOut(e.id) || has(e.id)) continue;
        if (!onceYearOk(e)) continue;
        const ctx = { ev: e };
        if (!Cond.test(e.when, ctx)) continue;
        add(e.id, ctx);
      }
    }
    // 5. ランダムな選択肢イベント（1季節に最大1つ、同じ年に最大2つ）
    //    それぞれの候補が「重み×0.008／季節」の確率で起きる。起きたものが複数なら重みで1つ選ぶ
    const hasChoice = () => Q.some((x) => (ev(x.id) || {}).kind === 'choice');
    if (!hasChoice() && (G.randomChoicesYear || 0) < 2) {
      const hit = [];
      const k = G.age < 6 ? 0.005 : G.age >= 30 ? 0.0049 : 0.006;
      for (const e0 of [...D().events_random.events, ...FAM]) {
        const e = ev(e0.id);
        if (e.kind !== 'choice' || !e.weight || e.type === 'scheduled' || e.risk || gentleOut(e.id)) continue;
        if (!onceYearOk(e)) continue;
        const ctx = { ev: e };
        if (!Cond.test(e.when, ctx)) continue;
        let w = Cond.weightOf(e.weight);
        const em = D().prefectures.tiers[tier()].eventMul || {}; if (em[e.id]) w *= em[e.id];
        if (chance(Math.min(0.6, w * k))) hit.push({ e, ctx, w });
      }
      const c = weighted(hit, (x) => x.w);
      if (c) { add(c.e.id, c.ctx); G.randomChoicesYear = (G.randomChoicesYear || 0) + 1; }
    }
    // 6. 何もなければ流れるイベント（ヒント・日常）を1〜2本
    const visible = Q.filter((x) => !['ev_m_promotion'].includes(x.id)).length;
    if (visible < 2) {
      const n = visible === 0 ? (chance(0.5) ? 2 : 1) : 1;
      for (let i = 0; i < n; i++) {
        const cand = [];
        for (const e0 of [...D().events_flow.events, ...FAM.filter((x) => x.kind === 'flow')]) {
          const e = ev(e0.id);
          if (!e.weight || e.risk || e.type === 'scheduled' || has(e.id) || gentleOut(e.id) || !onceYearOk(e)) continue;
          const ctx = { ev: e };
          if (!Cond.test(e.when, ctx)) continue;
          cand.push({ e, ctx, w: Cond.weightOf(e.weight) * (e.cat === 'daily' ? 0.6 : 1) });
        }
        for (const e0 of D().events_random.events) { // 判定つきの流れ（コンテスト・ヒットなど）
          const e = ev(e0.id);
          if (e.kind !== 'flow' || !e.weight || e.risk || has(e.id) || !onceYearOk(e)) continue;
          const ctx = { ev: e };
          if (!Cond.test(e.when, ctx)) continue;
          cand.push({ e, ctx, w: Cond.weightOf(e.weight) * 0.5 });
        }
        const c = weighted(cand, (x) => x.w);
        if (c) add(c.e.id, c.ctx);
      }
    }
    return finishQueue(Q);
  }
  function hasChoiceQ(Q) { return Q.some((x) => (ev(x.id) || {}).kind === 'choice'); }
  function finishQueue(Q) {
    // 必須の選択肢は最後のほうに（流れるイベントを先に見せる）。通知表は季節の最後
    const rank = (x) => { if (x.id === '__lessons') return 4; const e = ev(x.id); if (x.id === 'ev_m_report_card' || x.id === 'ev_m_focus_adult') return 3; if (e.when && e.when.after) return 2; return e.kind === 'choice' ? 1 : 0; };
    G.queue = Q.map((x, i) => ({ ...x, i })).sort((a, b) => rank(a) - rank(b) || a.i - b.i);
  }
  // 季節の指定がないイベントは、1年に1回まで
  function onceYearOk(e) {
    const w = e.when || {};
    // 社会人の「新しい1年の重点方針」は5年に1回（毎年だと選択が多すぎて1プレイが長くなる）
    if (e.id === 'ev_m_focus_adult' && G.stage !== 'none' && G.lastFired[e.id] != null && G.year - G.lastFired[e.id] < 2) return false;
    if (e.id === 'ev_m_focus_adult' && G.stage === 'none' && G.age >= 70) return false; // 70歳からは聞かない（いつでも▼から変えられる）
    if (e.id === 'ev_m_focus_adult' && G.stage === 'none' && G.age >= 19 && G.lastFired[e.id] != null && G.year - G.lastFired[e.id] < (G.age >= 40 ? 15 : 12)) return false;
    // 30代からは、新しい趣味を聞くのは10年に1回
    if (['ev_r_new_hobby', 'ev_r_senior_hobby', 'ev_r_adult_lesson'].includes(e.id) && G.age >= 30) { const last = Math.max(...['ev_r_new_hobby', 'ev_r_senior_hobby', 'ev_r_adult_lesson'].map((x) => G.lastFired[x] ?? -99)); if (G.year - last < 10) return false; }
    if (w.season || w.date) return true;
    return G.lastFired[e.id] !== G.year;
  }
  function riskP(e, ctx) {
    const RC = D().events_random.riskCurves;
    const name = e.risk;
    let p = 0;
    if (RC[name] && typeof RC[name] === 'object' && !RC[name]._note) {
      if (name === 'disaster') p = (RC.disaster._any || 0.4) / 100;
      else { const a = ctx.who ? ctx.who.age : G.age; p = curve(RC[name], a) / 100 * (RC[name]._gameMul || 1); }
      p /= 4;
    } else if (name === 'layoff') {
      const j = G.job && Menu.job(G.job.id); const f = G.job && D().jobs.forms[G.job.form];
      p = j ? ((j.risk || 1) / 100) / ((f && f.stable) || 1) / 4 : 0;
    } else if (name === 'fertility') { p = G.q === 0 ? 1 : 0; }
    else if (name === 'rentalVacancy') p = (D().housing.investment.vacancyChancePerYear[Econ.tierKey()] || 0.1) / 4;
    else if (name === 'rentalRepair') p = D().housing.investment.repairChancePerYear / 4;
    else if (name === 'aiRestructure') p = 0.15 / 4;
    p *= Cond.riskMulOf(e.riskMul);
    const rm = G.vars.riskMul || {}; if (rm[e.id]) p *= rm[e.id]; if (rm[name]) p *= rm[name];
    return p;
  }

  // ---------- ctx をセーブできる形に ----------
  function packCtx(ctx) { const o = {}; if (ctx.who) o.who = ctx.who.id; if (ctx.child) o.child = ctx.child.id; if (ctx.sibData) o.sibData = ctx.sibData; if (ctx.newPref) o.newPref = ctx.newPref; if (ctx.estate != null) o.estate = ctx.estate; return o; }
  function unpackCtx(o = {}) { const c = {}; if (o.who) c.who = G.people.find((p) => p.id === o.who); if (o.child) c.child = G.people.find((p) => p.id === o.child); if (o.sibData) c.sibData = o.sibData; if (o.newPref) c.newPref = o.newPref; if (o.estate != null) c.estate = o.estate; return c; }

  // ---------- 次にすること（UIから呼ぶ） ----------
  // 戻り値：{ posts:[], choice?:{...}, suspense?, season?:true, end?:true }
  function next() {
    if (!G.alive) return { end: true };
    if (G.pending) return { choice: G.pending.view };
    if (G.noticeQ && G.noticeQ.length) return flushNotices();
    if (!G.queue || !G.queue.length) { advance(); return { posts: [], season: true }; }
    const it = G.queue.shift();
    if (it.id === '__lessons') return openLessons();
    const e = ev(it.id);
    if (!e) return { posts: [] };
    const ctx = unpackCtx(it.ctx); ctx.ev = e;
    // 実行直前にもう一度条件をたしかめる（前のイベントで状態が変わることがある）
    if (!it.sched && !(e.when && e.when.engine)) { const w = { ...e.when }; delete w.cooldownYears; delete w.once; if (it.id !== 'ev_m_birth' && !Cond.test(w, ctx)) return { posts: [] }; }
    return run(e, ctx);
  }
  // 家族の状態などから自動で出るひとこと（Fam.notice）
  function flushNotices() {
    const out = { posts: [] };
    for (const n of G.noticeQ.splice(0)) { const p = post(out, { id: '__notice', emoji: n.e, cat: n.cat }, n.t, {}, ''); if (p && n.fx) p.fx = n.fx.filter((x) => Math.abs(x.d) >= 1); }
    return out;
  }
  // ステータスの変化を見せるための写し
  function snap() { const s = G.stats; const sp = person('spouse') || person('partner'); return { academic: s.academic, stress: s.stress, social: s.social, health: s.health, happiness: s.happiness, jobSatisfaction: s.jobSatisfaction, mentalLoad: s.mentalLoad, cash: G.age >= 16 ? G.cash : null, assets: G.assets, rel: sp ? sp.relation : null }; }
  function diff(a, b) {
    const out = [];
    for (const k of ['happiness', 'stress', 'social', 'health', 'academic', 'jobSatisfaction', 'mentalLoad', 'rel']) { if (a[k] == null || b[k] == null) continue; const d = Math.round(b[k] - a[k]); if (Math.abs(d) >= 1) out.push({ k, d }); }
    if (a.cash != null && b.cash != null) { const d = Math.round(b.cash - a.cash); if (Math.abs(d) >= 1) out.push({ k: 'cash', d }); }
    return out;
  }
  function mark(e) { G.once[e.id] = true; if (e.when && e.when.once === 'perMarriage') G.once[e.id + '@' + (G.vars.marriageNo || 0)] = true; G.lastFired[e.id] = G.year; }

  function run(e, ctx) {
    mark(e);
    PRE[e.id] && PRE[e.id](ctx);
    const out = { posts: [] };
    // 地域ちがいのテキスト
    let text = e.text, effects = e.effects;
    const vr = (e.byPref && e.byPref[G.pref]) || (e.byRegion && e.byRegion[pref().region]);
    if (vr) { text = vr.text || text; effects = vr.effects ? { ...(effects || {}), ...vr.effects } : effects; }
    if (e.kind === 'flow') {
      if (e.roll) {
        const ok = chance(rollP(e.roll, ctx));
        const blk = ok ? e.success : e.fail;
        if (!blk) return out;
        const s0 = snap();
        Effects.apply(blk.effects, ctx);
        if (!ctx.silent && blk.text) { const pp = post(out, e, blk.text, ctx, ok && e.cat !== 'daily' ? 'big' : ''); if (pp) pp.fx = diff(s0, snap()); }
        flushLogs(out, e, ctx);
        if (ok) Audio2.se(e.cat === 'health' || e.cat === 'risk' ? 'shock' : 'cheer');
        return out;
      }
      const s0 = snap();
      Effects.apply(effects, ctx);
      if (!ctx.silent && text) { const pp = post(out, e, text, ctx, e.id.startsWith('ev_w_') ? 'world' : ''); if (pp) pp.fx = diff(s0, snap()); ctx.logs = []; }
      flushLogs(out, e, ctx);
      if (e.id === 'ev_m_death') out.end = true;
      return out;
    }
    // 選択肢イベント
    if (e.auto) {
      const p = rollP(e.auto.roll, ctx);
      const ok = chance(p);
      const blk = ok ? e.success : e.fail;
      const sus = D().suspense.events[e.id];
      if (ok || !blk.choices) {
        const s0 = snap();
        Effects.apply(blk.effects, ctx);
        const pp = post(out, e, blk.text, ctx, ok ? 'big' : ''); if (pp) pp.fx = diff(s0, snap());
        flushLogs(out, e, ctx);
        if (sus) out.suspense = { ...sus, ok, kind: susKind(e) };
        else Audio2.se(ok ? 'cheer' : 'shock');
        return out;
      }
      out.suspense = sus ? { ...sus, ok: false, kind: susKind(e) } : null;
      return openChoice(out, e, ctx, blk.text, blk.choices, 'fail');
    }
    return openChoice(out, e, ctx, text, e.choices, 'main');
  }

  function factOf(e, ctx) { const f = e.fact || D().facts.facts[e.id]; return f ? { text: Text.fill(f.text, ctx), src: f.src } : null; }
  // ---------- 選択肢のポップアップ ----------
  function openChoice(out, e, ctx, text, choices, branch) {
    const opts = [];
    choices.forEach((c, i) => {
      if (c.when && !Cond.test(c.when, { ev: e, ...ctx })) return;
      if (G.mode === 'gentle' && D().modes.modes.gentle.excludeChoices[e.id] && c.after) { /* 補導判定は choose でなくす */ }
      if (c.menu) {
        const items = Menu.build(c.menu.source, c.menu.filter, ctx);
        if (!items.length) return;
        opts.push({ i, menu: true, items, label: c.label ? Text.fill(c.label, ctx) : null, showRate: !!c.menu.showRate, src: c.menu.source, filter: c.menu.filter });
      } else {
        let rate = null;
        if (c.showRate && c.roll) rate = Math.round(clamp(rollP(c.roll, ctx), 0.03, 0.97) * 100);
        opts.push({ i, label: Text.fill(c.label, ctx), rate });
      }
    });
    if (!opts.length) { return out; }
    const view = {
      ev: e.id, branch, emoji: e.emoji, cat: e.cat, counselor: e.counselor,
      date: `${calYear()}年 ${MONTH[G.q]}月`, ageLabel: ageLabel(),
      text: Text.fill(text, ctx), popup: e.popup || null,
      fact: factOf(e, ctx), opts, ctx: packCtx(ctx), rng: RNG.s,
    };
    G.pending = { view, ctxRaw: packCtx(ctx), extra: { kenshinBad: ctx.kenshinBad, crashPct: ctx.crashPct, newPref: ctx.newPref, otoshidama: ctx.otoshidama } };
    out.choice = view;
    save();
    return out;
  }
  // UIが選んだ：optIndex（opts の何番目か）、item（メニューで選んだ項目）
  function choose(optIndex, item) {
    const pd = G.pending; if (!pd) return { posts: [] };
    const v = pd.view;
    RNG.seed(v.rng); // 同じ選択なら同じ結果（docs/11）
    const e = ev(v.ev);
    const ctx = { ...unpackCtx(pd.ctxRaw), ...pd.extra, ev: e };
    const choices = v.branch === 'fail' ? e.fail.choices : e.choices;
    const o = v.opts[optIndex];
    const c = choices[o.i];
    G.pending = null;
    G.choiceCount++;
    const out = { posts: [] };
    if (o.menu && item) { ctx.pick = item; ctx.pickName = item.name; Menu.remember(item); G.vars.targetPref = item.pref && item.pref !== G.pref && !item.commute ? item.pref : null; if (item.commute && item.pref !== G.pref) G.vars.commutePref = item.pref; }
    const label = (o.menu && item ? `${item.emoji} ${item.name}` : o.label || '').replace(/（[^）]*）/g, '');
    const cp = post(out, e, v.text.replace(/（.*$/, '').slice(0, 60), ctx, 'choice', label);
    const s0 = snap();
    // 選択肢そのものの効果
    if (c.cash) G.cash += Effects.num(c.cash, ctx);
    if (c.counter) Effects.apply({ counter: c.counter }, ctx);
    Effects.apply(c.effects, ctx);
    let ok = null;
    if (c.roll) {
      if (c.roll.table) { lottery(c, ctx, out, e); }
      else {
        let p = rollP(c.roll, ctx);
        if (c.showRate || (o.menu && o.showRate)) p = clamp(p, 0.03, 0.97);
        ok = chance(p);
        Effects.apply(ok ? c.success : c.fail, ctx);
      }
    }
    if (c.after && !(G.mode === 'gentle' && D().modes.modes.gentle.excludeChoices[e.id])) {
      if (!c.after.roll || chance(rollP(c.after.roll, ctx))) Effects.apply(c.after.success, ctx);
    }
    if (c.resultLog) ctx.logs = (ctx.logs || []).concat(Text.fill(c.resultLog, ctx));
    const fx = diff(s0, snap());
    if (cp) cp.fx = fx;
    const logs = (ctx.logs || []).slice();
    flushLogs(out, e, ctx);
    const sus = D().suspense.events[e.id];
    // 結果を見せる：判定があったとき・結果の文があるとき
    if ((ok !== null || c.showResult || (logs.length && c.roll)) && !(c.roll && c.roll.table)) {
      const t = logs.map((x) => String(x).replace(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u, '')).join(' ') || (ok === true ? 'うまくいった。' : ok === false ? 'うまくいかなかった……。' : '');
      if (t) out.result = { emoji: e.emoji, date: v.date, ageLabel: v.ageLabel, text: v.text, chosen: label, rate: o.rate, ok, res: t, fx };
    }
    const calm = ['risk', 'health', 'money'].includes(e.cat);
    if (ok !== null && sus) out.suspense = { ...sus, ok, kind: susKind(e) };
    else if (ok !== null) Audio2.se(ok ? (e.cat === 'risk' ? 'decide' : calm ? 'up' : 'cheer') : 'shock');
    else if (/school|work|love|family/.test(e.cat || '') || e._src === 'm') Audio2.se('decide');
    // 続きのメニュー（専門学校を選ぶ など）
    if (ctx.menuNext) {
      const items = Menu.build(ctx.menuNext, null, ctx);
      if (items.length) {
        const view = { ev: '__menuNext', branch: 'main', emoji: '🛠️', date: v.date, ageLabel: v.ageLabel, text: 'どこに行く？', opts: [{ i: 0, menu: true, items, showRate: true }], ctx: packCtx(ctx), rng: RNG.s };
        G.pending = { view, ctxRaw: packCtx(ctx), extra: {}, menuNext: true };
        out.choice = view;
      }
    }
    save();
    return out;
  }
  // ほかの県で探す：その県の候補を作る（commute＝実家から通う）
  const PREF_SRC = ['jobs.jobs', 'jobs.midCareer', 'schools.postByPlan'];
  function prefMenu(src, filter, prefId, commute) {
    const keep = G.pref; const home = G.pref;
    G.pref = prefId;
    let items = [];
    try { items = Menu.build(src, filter, {}); } finally { G.pref = keep; }
    const school = src.startsWith('schools');
    const w = G.talents.familyWealth; const allow = w < 35 ? 4 : w < 65 ? 7 : 10;
    return items.map((it) => {
      const o = { ...it, pref: prefId, commute: !!commute, id: school ? `${it.id}@${prefId}${commute ? 'c' : ''}` : it.id };
      if (prefId !== home) {
        const pn = Fam.prefName(prefId).replace(/[都府県]$/, '');
        if (school && !String(o.name).startsWith(pn)) o.name = o.label = `${pn}の` + String(o.name).replace(/^[^の]+の/, '');
        o.sub = String(it.sub || '').replace(/・ひとり暮らし/, '') + (commute ? '・実家から通う' : school ? `・ひとり暮らし 生活費 月約6万／仕送りめやす 月${allow}万` : '・引っ越して働く');
        if (!school && commute) o.sub = String(it.sub || '') + '・実家から通勤';
      }
      return o;
    });
  }
  function prefCounts(src, filter) { return D().prefectures.prefectures.map((p) => { const keep = G.pref; G.pref = p.id; let n = 0; try { n = Menu.build(src, filter, {}).length; } catch (e) { n = 0; } G.pref = keep; return { p, n, hops: Fam.hops(G.pref, p.id) }; }); }
  // 専門学校などを選んだあと
  function chooseMenuNext(item) {
    G.pending = null;
    Menu.remember(item); G.vars.target = item.id; Effects.setFlag('naitei_school', true);
    save();
    return { posts: [] };
  }
  // 受験・試験か、それ以外か（ドキドキ演出の「合格！」「成功！」）
  function susKind(e) { return /exam|kokushi|eiken|shihou|kyosai|job_hunt|after_jhs_work|kentei|qualify|license|toeic|civil|grad_school|affil/.test(e.id) ? 'exam' : 'other'; }
  function lottery(c, ctx, out, e) {
    const r = rnd(); let acc = 0, win = 0;
    for (const [p, amt] of c.roll.table) { acc += p; if (r < acc) { win = amt; break; } }
    if (win) { G.cash += win; if (win >= 100) { Effects.setFlag('lottery_win', true); Audio2.se('cheer'); } }
    ctx.lotteryResult = win ? (win >= 10000 ? `1等！${win.toLocaleString('ja-JP')}万円が当たった！！` : win >= 1 ? `${win}万円が当たった！` : `${Math.round(win * 10000).toLocaleString('ja-JP')}円が当たった。`) : 'はずれ。';
  }

  // ---------- 習い事を続ける？ ----------
  const isLesson = (id) => { const d = Menu.club(id); return !!d && !!d.age; };
  function openLessons() {
    const LC = D().clubs.lessonContinue;
    const ls = G.clubs.filter((c) => isLesson(c.id));
    if (!ls.length) return { posts: [] };
    const stageNow = G.job && G.job.id && G.jobYears === 0 ? 'work' : G.stage;
    const changed = stageNow !== G.vars.lessonStage && LC.askAt.includes(stageNow);
    const outOfAge = ls.some((c) => { const d = Menu.club(c.id); return G.age > d.age[1]; });
    const y = G.school ? G.school.yearIn : 0;
    const mile = (G.stage === 'elem' && [1, 3, 5].includes(y)) || (['jhs', 'hs'].includes(G.stage) && [1, 3].includes(y));
    const force = !!G.vars.lessonForce; G.vars.lessonForce = false;
    G.vars.lessonStage = stageNow;
    if (!changed && !outOfAge && !mile && !force) return { posts: [] };
    const cap = G.age < 16 ? lessonCap() : null;
    const qc = LC.quitChance;
    const items = ls.map((c) => {
      const d = Menu.club(c.id); if (!d) return null;
      let pq = qc.byLesson[c.id] ?? (changed ? qc.atStage[stageNow] ?? qc.default : qc.default * 0.5);
      if (G.age > d.age[1]) pq = Math.max(pq, 0.85);
      if (G.age >= 22 && c.id.startsWith('ls_')) pq = Math.max(pq, 0.8); // 大人になってからも続ける人は少数派
      const HS = ['hs', 'hs_corr', 'hs_night', 'kosen'];
      const out = G.age > d.age[1] || (c.id === 'ls_juken_juku' && G.stage !== 'elem') || (c.id === 'ls_juku' && HS.includes(G.stage)) || (c.id === 'ls_yobiko' && !HS.includes(G.stage) && G.stage !== 'ronin');
      return { ...lessonItem(c), quit: out, lock: out ? '年齢・学年で終わり' : null };
    }).filter(Boolean);
    // 家計が苦しくなったら、高いものから続けられなくなる
    if (cap != null) { let tot = items.filter((x) => !x.quit).reduce((a, x) => a + capCost(x.id, x.cost), 0); for (const x of items.slice().sort((a, b) => capCost(b.id, b.cost) - capCost(a.id, a.cost))) { if (tot <= cap) break; if (!x.quit && capCost(x.id, x.cost) > 0) { x.quit = true; x.lock = '家計が苦しく、続けられない'; tot -= x.cost; } } }
    const when = { jhs: '中学生になる', hs: '高校生になる', univ: '新しい学校に入る', work: '社会人になる' }[changed ? stageNow : ''] || '新しい学年になる';
    const view = { ev: '__lessons', type: 'lessons', emoji: '🎒', date: `${calYear()}年 ${MONTH[G.q]}月`, ageLabel: ageLabel(), text: force ? '家の収入が変わった。習い事を見直そう。' : `${when}。習い事はどうする？`, note: changed ? 'いそがしくなります。続けるものを選ぼう（増やすこともできます）' : '続けるもの・増やすものを選ぼう', items, cap: G.age < 16 ? lessonCap() : null, rng: RNG.s };
    G.pending = { view, ctxRaw: {}, extra: {} };
    save();
    return { choice: view };
  }
  // 習い事の1行ぶん（ステータスの変化のめやすつき）
  const EFF_L = { health: '健康', social: '人間関係', happiness: '満足感', stress: 'ストレス', 'skill.sport': '運動', 'skill.music': '演奏', 'skill.art': '絵', 'skill.it': 'IT', 'skill.language': '語学', 'skill.cooking': '料理', 'subj.jpn': '国語', 'subj.math': '算数', 'subj.eng': '英語', 'subj.pe': '体育', 'subj.art': '図工', 'subj.music': '音楽', 'subj.sci': '理科', subjAll: '全教科' };
  // 習い事の効果の表示（1年あたり）：塾・予備校は「5教科の伸び+◯%」、ほかは「運動+4・健康+2」のように数字で。時間をとる習い事は勉強の伸びが少しへる
  function lessonEff(d) {
    const L = [];
    if (d.study) L.push(`5教科の伸び+${Math.round((d.study - 1) * 100)}%`);
    const lab = (k) => (G.age >= 12 && k === 'subj.math' ? '数学' : G.age >= 12 && k === 'subj.art' ? '美術' : EFF_L[k] || k);
    for (const [k, v] of Object.entries(d.yearly || {})) L.push(`${lab(k)}${v > 0 ? '+' : '−'}${Math.abs(v)}`);
    const t = d.study ? 0 : d.time || 0;
    if (t >= 2 && G.age < 19) L.push(`勉強−${Math.round(t * D().clubs.rules.studyPenaltyPerTime * 100)}%`);
    return L.slice(0, 4).join('・');
  }
  function lessonItem(c) { const d = Menu.club(c.id); return { id: c.id, emoji: d.emoji, label: d.label, years: G.year - (c.since || G.year) + 1, cost: d.cost, eff: lessonEff(d) }; }
  // 家計で決まる、習い事にかけられる1年の金額（万円）
  // 世帯年収の15%まで（家のくらしで決まる下限あり）。年収600万円なら年90万円
  const hhIncome = () => { try { return Fam.householdIncome().total || 0; } catch (e) { return 0; } };
  function lessonCap() { const w = G.talents.familyWealth; const base = w < 15 ? 8 : w < 35 ? 16 : w < 65 ? 32 : w < 85 ? 64 : 120; return Math.round(Math.max(base, hhIncome() * 0.15)); }
  // 中学受験の塾だけは別わく：世帯年収が500万円以上（または家のくらしがふつう以上）なら、上限とは別に出せる
  // 中学受験の塾・学習塾・予備校は別わく（ただし家計が苦しいと別わくにならない）
  const JUKU = ['ls_juken_juku', 'ls_juku', 'ls_yobiko'];
  function poorHome() { return G.talents.familyWealth < 15 && Econ.parentsIncome() < 350; }
  function jukuOk() { return hhIncome() >= 500 || G.talents.familyWealth >= 35; }
  const capCost = (id, cost) => (JUKU.includes(id) && jukuOk() ? 0 : cost || 0);
  // 習い事を増やす（上限4つ）。ことわられたら msg を返す
  function addLesson(id, keep) {
    const d = Menu.club(id); if (!d) return { ok: false, msg: '' };
    const kept = G.clubs.filter((c) => isLesson(c.id) && keep[c.id] !== false);
    if (kept.length >= 4) return { ok: false, msg: '習い事は4つまで。どれかをやめないと増やせない。' };
    const cost = kept.reduce((a, c) => a + capCost(c.id, (Menu.club(c.id) || {}).cost), 0) + capCost(id, d.cost);
    if (G.age < 16 ? cost > lessonCap() : G.cash < (d.cost || 0)) return { ok: false, msg: G.age < 16 ? '家計が厳しいため、これ以上は増やせない…' : '所持金が足りないので、これ以上は増やせない…' };
    G.clubs.push({ id, since: G.year, isNew: true });
    (d.set || []).forEach((f) => Effects.setFlag(f, true));
    Effects.stat('stress', 2 + (kept.length >= 2 ? 3 : 0));
    keep[id] = true;
    return { ok: true, item: lessonItem({ id, since: G.year }) };
  }
  function lessonCandidates() { return Menu.build(G.age < 16 ? 'clubs.lessons' : 'clubs.adultLessons').filter((x) => !G.clubs.some((c) => c.id === x.id)); }
  function chooseLessons(keep) {
    G.pending = null;
    const out = { posts: [] };
    const e = { id: '__lessons', emoji: '🎒', cat: 'lesson' };
    const quit = G.clubs.filter((c) => isLesson(c.id) && keep[c.id] === false);
    G.clubs = G.clubs.filter((c) => !quit.includes(c));
    const kept = G.clubs.filter((c) => isLesson(c.id));
    const nm = (c) => (Menu.club(c.id) || {}).label;
    const added = kept.filter((c) => c.isNew); added.forEach((c) => delete c.isNew);
    if (added.length) post(out, { ...e, emoji: '✨' }, `${added.map(nm).join('・')}を新しく始めた。`, {}, 'choice', '');
    if (quit.length) post(out, e, `${quit.map(nm).join('・')}をやめた。`, {}, 'choice', '');
    const cont = kept.filter((c) => !added.includes(c));
    if (cont.length) post(out, e, `${cont.map(nm).join('・')}は続けることにした。`, {}, quit.length ? '' : 'choice', '');
    save();
    return out;
  }

  // ---------- 判定の確率 ----------
  function rollP(roll, ctx) {
    if (!roll) return 1;
    let p;
    if (roll.rate != null) {
      p = typeof roll.rate === 'string' ? Effects.num(roll.rate, ctx) : roll.rate;
      if (p > 1) p /= 100;
    } else if (roll.byStage) {
      p = roll.byStage[G.vars.cancerStage || 2] ?? 0.3;
    } else if (roll.ageCurve) {
      const of = roll.of; let a = G.age;
      if (of === 'birthParentAge') { const sp = person('spouse'); a = G.gender === 'F' ? G.age : sp ? sp.age : G.age; }
      if (of === 'childAge' && ctx.child) a = ctx.child.age;
      if (of === 'childBirthParentAge' && ctx.child) a = ctx.child.gender === 'F' ? ctx.child.age : ctx.child.age - 2;
      p = curve(roll.ageCurve, a);
    } else if (roll.eiken) {
      const lv = ['eiken_3', 'eiken_2', 'eiken_p1', 'eiken_1'].findIndex((f) => !G.flags[f]);
      const need = [40, 55, 68, 80][Math.max(0, lv)];
      p = logistic(((G.subj.eng || 50) - need) / 1.5);
    } else if (roll.toeic) {
      const e = G.subj.eng || 50; ctx.toeicFlag = e >= 80 ? 'toeic_900' : e >= 65 ? 'toeic_800' : 'toeic_600';
      p = logistic((e - 45) / 1.5);
    } else p = roll.base ?? 0.5;
    if (roll.w && typeof roll.w === 'object') for (const [k, w] of Object.entries(roll.w)) p += ((Cond.statVal(k === 'eng' ? 'subj.eng' : k) - 50) * w) / 100;
    if (roll.focusBonus) p += roll.focusBonus[G.focus] || 0;
    if (roll.incomeBelow && Econ.annualIncome() >= roll.incomeBelow) p = 0;
    if (roll.ageMinus) p -= Math.max(0, G.age - 30) * roll.ageMinus;
    if (roll.schoolMul && G.school) p *= roll.schoolMul[G.school.tmpl] || 1;
    return clamp(p, 0, 1);
  }

  // ---------- 投稿（タイムライン） ----------
  function ageLabel() {
    if (G.school && ['elem', 'jhs', 'hs', 'hs_corr', 'hs_night', 'kosen', 'univ', 'univ_med', 'junior_college', 'vocational'].includes(G.stage)) {
      const n = { elem: '小', jhs: '中', hs: '高', hs_corr: '高', hs_night: '高', kosen: '高専', univ: '大学', univ_med: '大学', junior_college: '短大', vocational: '専門' }[G.stage];
      return `${G.age}歳・${n}${G.school.yearIn}`;
    }
    return `${G.age}歳`;
  }
  function post(out, e, text, ctx, kind = '', chosen = '') {
    const t = Text.fill(text, ctx).trim();
    if (!t && !chosen) return;
    const p = { y: calYear(), m: MONTH[G.q], age: G.age, e: e.emoji || '・', t, kind, cat: e.cat || (e._src === 'm' ? 'school' : ''), id: e.id };
    if (chosen) p.chosen = chosen;
    // 先頭の絵文字をアイコンに
    const m = p.t.match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u);
    if (m && !chosen) { p.e = m[1]; p.t = p.t.slice(m[0].length); }
    G.log.push(p);
    out.posts.push(p);
    return p;
  }
  function flushLogs(out, e, ctx) {
    for (const l of ctx.logs || []) post(out, { ...e, emoji: '・' }, l, ctx, '');
    ctx.logs = [];
  }

  // ---------- 季節を進める（毎枠の終わり → 次の枠のはじめ） ----------
  function advance() {
    endOfQuarter();
    if (!G.alive) return;
    G.q++;
    if (G.q > 3) { G.q = 0; G.year++; }
    if (G.q === 0) newYear();
    if (G.pendingDeath) { G.pendingDeath = false; G.queue = [{ id: 'ev_m_death', ctx: {} }]; save(); return; }
    if (G.q === 3) yearlyGrowth();
    if (!G.alive) return;
    buildQueue();
    save();
  }
  function newYear() {
    G.age++;
    G.randomChoicesYear = 0;
    // 信用情報（債務整理5年・自己破産7年）が消えたら、またローンが組める
    if (G.flags.blacklisted && G.vars.blackUntil && G.year >= G.vars.blackUntil) { delete G.flags.blacklisted; G.vars.blackUntil = 0; Fam.notice('📄', '信用情報の記録が消えて、またローンやカードが作れるようになった。', 'money'); }
    if (G.school) G.school.yearIn++;
    if (G.job) G.jobYears++;
    if (G.vars.recurring) { G.vars.recurring = G.vars.recurring.filter((r) => !r.who || (G.people.find((p) => p.id === r.who) || {}).alive); G.vars.recurring.forEach((r) => { if (G.age >= 16) G.cash += r.v; else G.household.cash = (G.household.cash ?? 100) + r.v; r.left--; }); G.vars.recurring = G.vars.recurring.filter((r) => r.left > 0); }
    Econ.yearAssets();
    agePeople();
    Fam.supportYear();
    deathCheck();
    if (G.age === 16) G.cash = Math.max(G.cash, G.vars.childSavings ? G.vars.childSavings : 0);
    if (G.employment === 'unemployed' && !G.vars.benefitLeft && G.age >= 18 && !G.job) { /* 失業手当が切れた */ }
  }
  function agePeople() {
    const RC = D().events_random.riskCurves;
    for (const p of G.people) {
      if (!p.alive) continue;
      p.age++;
      Fam.fill(p);
      if (p.role === 'child') childYear(p);
      else if (p.role !== 'grandchild' && p.role !== 'ex_spouse' && p.role !== 'past') Fam.yearOf(p);
      // 仕事ばかりだと、配偶者・恋人との関係が冷えていく
      if (p.role === 'partner' || p.role === 'spouse') {
        const busy = (G.focus === 'focus_work' ? 3 : 0) + (Econ.overtime() >= 40 ? 3 : Econ.overtime() >= 25 ? 1 : 0) + (G.stats.mentalLoad >= 75 ? 2 : 0) + (G.flags.separated ? 2 : 0);
        p.relation = clamp(p.relation + normal(0.5, 3) + (G.focus === 'focus_family' ? 4 : 0) - busy - (G.stats.stress > 70 ? 3 : 0) + (people('child').some((c) => c.together && c.age < 3) && G.employment === 'leave' ? 3 : 0), 0, 100);
      }
      if (['father', 'mother', 'grandparent', 'spouse'].includes(p.role) && p.age >= 65) {
        if (chance(curve(RC.careNeed, p.age) / 100)) p.careLevel = Math.min(5, (p.careLevel || 0) + 1);
      }
      // 死亡（現実的モードだけ）
      if (G.mode === 'gentle') continue;
      const curveD = p.gender === 'F' ? RC.death_F : RC.death_M;
      let pr = curve(curveD, p.age) / 100;
      if (p.careLevel >= 3) pr *= 2;
      if ((p.health ?? 80) < 40) pr *= 1.8; else if ((p.health ?? 80) > 80) pr *= 0.8;
      if (p.deathScheduled) continue;
      if (chance(pr)) {
        p.deathScheduled = true;
        const id = { grandparent: 'ev_f_grandparent_death', father: 'ev_f_parent_death', mother: 'ev_f_parent_death', spouse: 'ev_f_spouse_death', child: 'ev_f_child_death' }[p.role];
        if (id && !gentleOut(id)) G.scheduled.push({ event: id, at: { year: G.year, q: rint(0, 3) }, data: { who: p.id } });
        else if (!id) p.alive = false;
      }
    }
  }
  function childYear(c) {
    if (c.age === 18 && c.hsType === 'private') c.extraCost = 0;
    if (c.age === 18 && !c.plan) { const r = rnd(); const w = G.talents.familyWealth; c.plan = r < 0.45 + w / 400 ? 'univ' : r < 0.75 ? 'voc' : 'work'; }
    if (c.age >= 18) Fam.childAdultYear(c);
    if (c.plan === 'work' && c.age === 18) c.stage = 'work_start';
    if (c.plan === 'voc' && c.age === 20) { c.stage = 'work_start'; c.costStage = 'none'; }
    if (c.plan === 'univ' && c.age === 22) { const away = ['univ_away', 'abroad'].includes(c.costStage); c.stage = 'work_start'; c.costStage = 'none'; if (away) { Fam.notice('🎓', `${c.name}が大学を卒業した。仕送り（月${c.sendMoney ?? 7}万円）はこれで終わり。`, 'family'); c.abroad = false; } }
    if (c.stage === 'work_start' && !c.job) { Fam.assignJob(c); if (!c.jobLabel) c.jobLabel = '会社員'; }
    c.relation = clamp(c.relation + normal(0, 2) + (G.focus === 'focus_family' ? 2 : 0), 0, 100);
  }
  function deathCheck() {
    const RC = D().events_random.riskCurves;
    let die = false, cause = '病気';
    if (G.stats.health <= 0) { die = true; cause = '病気'; }
    else if (G.mode === 'gentle') {
      if (G.age >= 85) { const p = G.age >= 100 ? 1 : 0.06 + (100 - G.stats.health) / 300; if (chance(p)) { die = true; cause = '老衰'; } }
    } else {
      let p = curve(G.gender === 'F' ? RC.death_F : RC.death_M, G.age) / 100;
      const h = G.stats.health;
      p *= h < 20 ? 4 : h < 35 ? 2 : h < 45 ? 1.3 : h > 75 ? 0.8 : 1;
      p *= G.vars.deathRiskMul || 1;
      p *= G.gender === 'M' ? 0.62 : 0.47; // 統計の平均寿命（男81歳・女87歳）に合わせる
      if (['dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast'].some((f) => G.flags[f])) p += 0.05 * (G.vars.cancerStage || 2) / 2;
      if (G.flags.dz_heart || G.flags.dz_stroke_after) p *= 1.2;
      if (G.age < 35) p = Math.min(p, 0.003);
      if (chance(p)) {
        die = true;
        cause = G.age >= 88 && !G.flags.dz_cancer_lung ? '老衰' : ['dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast'].some((f) => G.flags[f]) ? '病気（がん）' : G.flags.dz_heart ? '病気（心臓）' : G.flags.dz_stroke_after ? '病気（脳卒中）' : G.age < 40 && chance(0.4) ? '事故' : '病気';
      }
    }
    if (G.age >= 105) { die = true; cause = '老衰'; }
    if (die) { G.deathCause = cause; G.queue = []; G.scheduled = []; G.pendingDeath = true; }
  }
  function die(cause) {
    if (!G.alive) return;
    G.alive = false; G.deathCause = cause || G.deathCause || '病気';
    G.ended = true;
  }

  // ---------- 毎枠の状態更新（docs/09 §5） ----------
  function endOfQuarter() {
    if (G.pendingDeath) return;
    Fam.sync();
    Econ.quarter();
    jobStats();
    const s = G.stats;
    const student = Menu.isStudent();
    // ② ストレス：基準値に近づく＋要因
    let base = 12;
    if (student) base += { elem: 10, jhs: 18, hs: 22, ronin: 35, univ: 14, univ_med: 22 }[G.stage] || 12;
    if (Econ.working()) base += s.mentalLoad * 0.35 + s.physicalLoad * 0.12;
    if (G.flags.caregiving) base += 15;
    if (G.flags.long_commute) base += 4;
    if (Econ.lifeLevel() === 'save' && G.age >= 18) base += 2;
    const inc = Math.max(100, Econ.annualIncome());
    base += Math.min(20, (Econ.totalDebt() / inc) * 5);
    if (student && G.q === 3 && G.school && schoolYearsLeft() === 1 && ['jhs', 'hs', 'ronin'].includes(G.stage)) base += 12;
    if (G.flags.dz_depression) base += 8;
    if (G.employment === 'unemployed') base += 10;
    base -= (s.social - 50) * 0.1;
    if (G.flags.married && (person('spouse') || {}).relation > 60) base -= 4;
    base -= Math.min(8, G.hobbies.length * 1.5);
    s.stress += (base - s.stress) * 0.2;
    // ③ 健康：年齢の上限と生活習慣で決まる「目標」に少しずつ近づく（病気・けがのイベントで下がる）
    const a = G.age;
    const cap = a < 40 ? 90 : a < 60 ? 90 - (a - 40) * 0.5 : a < 80 ? 82 - (a - 60) * 0.8 : 66 - (a - 80) * 0.8;
    let ht = cap + (G.talents.t_health - 50) * 0.15;
    if (G.flags.smoker) ht -= 10; if (G.flags.heavy_drinker) ht -= 8; if (G.flags.exercise_habit) ht += 6;
    if (G.flags.dz_diabetes) ht -= 6; if (G.flags.dz_hypertension) ht -= 3; if (G.flags.dz_heart) ht -= 8; if (G.flags.dz_stroke_after) ht -= 12;
    if (G.flags.dz_depression) ht -= 5; if (s.stress > 70) ht -= (s.stress - 70) * 0.4; if (s.physicalLoad > 70) ht -= 5;
    if (['dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast'].some((f) => G.flags[f])) ht -= 10 * (G.vars.cancerStage || 2) / 2;
    if (G.focus === 'focus_health') ht += 5; if (G.focus === 'focus_rest') ht += 3; if (G.focus === 'focus_work') ht -= 3;
    s.health += (clamp(ht, 5, 100) - s.health) * (s.health > ht ? 0.06 : 0.1);
    if (a < 6 && G.talents.t_health < 35 && chance(0.1)) s.health -= 3;
    // ④ 人間関係：毎年2%ずつ50へ
    s.social += (50 - s.social) * 0.005;
    if (G.stage === 'hikikomori') s.social -= 2;
    // 重点方針の効果（1年分を4で割る）
    const F = { focus_study: { stress: 8, social: -3 }, focus_weakness: { stress: 4 }, focus_club: { social: 5 }, focus_friends: { social: 8, happiness: 4 }, focus_hobby: { happiness: 5, stress: -6 }, focus_parttime: { stress: 4 }, focus_love: { social: 3 }, focus_work: { stress: 8 }, focus_family: {}, focus_health: { stress: -3 }, focus_qualify: { stress: 3 }, focus_invest: {}, focus_rest: { stress: -12 } }[G.focus] || {};
    const half = G.focusHalf ? 0.5 : 1;
    for (const [k, v] of Object.entries(F)) s[k] = s[k] + (v / 4) * half;
    if (G.focus === 'focus_health' && !G.flags.exercise_habit && chance(0.04)) G.flags.exercise_habit = true;
    // ⑤ 満足感：目標に20%ずつ近づく
    let tgt = 40 + (s.social - 50) * 0.3 + (s.health - 75) * 0.3 - (s.stress - 35) * 0.4;
    if (Econ.working() && G.job) tgt += (s.jobSatisfaction - 50) * 0.2;
    if (G.flags.married) tgt += ((person('spouse') || {}).relation - 50) * 0.1 + 3;
    tgt += Math.min(6, people('child').length * 3);
    if (G.age >= 18) {
      const mi = Math.max(10, Econ.annualIncome() / 12);
      if (G.cash < 0) tgt -= Math.min(15, (-G.cash / Math.max(60, Econ.annualIncome())) * 15 + 5);
      else if (G.cash > mi * 6) tgt += Math.min(6, (G.cash / (mi * 12)) * 3);
    }
    if (G.flags.dz_depression) tgt -= 10;
    const likeOk = G.hobbies.length ? 2 : 0; tgt += likeOk;
    if (G.age >= 18 && !Menu.isStudent()) tgt += { save: -3, normal: 0, comfy: 2, lux: 4 }[Econ.lifeLevel()] || 0;
    if (G.flags.long_commute) tgt -= 2;
    if (G.flags.separated) tgt -= 4;
    s.happiness += (clamp(tgt, 0, 100) - s.happiness) * 0.2;
    for (const k of STAT_KEYS) s[k] = clamp(s[k], 0, 100);
    if (Menu.isStudent() || G.age < 6) s.academic = acad();
    // 不変条件（docs/09 §9）
    invariants();
    // 記録（エンディング用）
    const H = G.hist;
    H.happiness.push(Math.round(s.happiness)); H.social.push(Math.round(s.social)); H.stress.push(Math.round(s.stress)); H.health.push(Math.round(s.health));
    if (G.q === 3) {
      H.cash.push(Math.round(G.cash)); H.income.push(Math.round(Econ.annualIncome())); H.assets.push(Econ.assetsValue());
      H.maxAssets = Math.max(H.maxAssets || 0, G.cash + Econ.assetsValue());
      H.years++;
      if (G.cash >= 0) H.cashNonNeg++;
      if (G.flags.lives_with_parents || G.flags.married) H.liveFamily++;
      if (Econ.working() && G.job) {
        H.workYears++; H.jobSat.push(Math.round(s.jobSatisfaction));
        const j = Menu.job(G.job.id); if (j && (j.tags || []).includes(Cond.likeMain())) H.likeMatch++;
        if (j && ['service', 'education', 'medical', 'welfare', 'business'].includes(j.cat)) H.peopleWorkYears++;
      }
      if (G.clubs.length || G.flags.volunteer || G.flags.community_role) H.peopleWorkYears++;
      H.hobbyYears = (H.hobbyYears || 0) + G.hobbies.length;
      H.familyRel = H.familyRel || []; const fam = G.people.filter((p) => p.alive && ['father', 'mother', 'spouse', 'child'].includes(p.role)); if (fam.length) H.familyRel.push(fam.reduce((x, p) => x + p.relation, 0) / fam.length);
      G.jobRecord = G.jobRecord || [];
      const lab = G.job ? (Menu.job(G.job.id) || {}).label : Menu.isStudent() ? null : G.employment === 'retired' ? '引退' : null;
      if (lab && (!G.jobRecord.length || G.jobRecord[G.jobRecord.length - 1].l !== lab)) G.jobRecord.push({ l: lab, a: G.age });
    }
  }
  function acad() { const ks = ['jpn', 'math', 'sci', 'soc', 'eng']; return Math.round(ks.reduce((a, k) => a + (G.subj[k] ?? 50), 0) / ks.length); }
  function jobStats() {
    const s = G.stats;
    if (!G.job || !Econ.working() || !G.job.id) { s.physicalLoad = 0; s.mentalLoad = 0; s.jobSatisfaction = 0; return; }
    const j = Menu.job(G.job.id); if (!j) return;
    const [pl, ml] = j.load || [30, 40];
    const ot = Econ.overtime();
    const ld = G.job.loadDelta || { physical: 0, mental: 0 };
    const st = Econ.curStep() || {};
    s.physicalLoad = clamp(pl + ot * 0.3 + ld.physical, 0, 100);
    s.mentalLoad = clamp(ml + ot * 0.4 + (st.ment || 0) * (G.rank || 0) * 0.5 + ld.mental + (G.flags.black_company ? 15 : 0), 0, 100);
    if (G.job.hoursMul) { s.physicalLoad *= G.job.hoursMul; s.mentalLoad *= G.job.hoursMul; }
    // 適性（才能×仕事の重み）＋好きなこと＋給料－負荷
    let apt = 0, n = 0;
    for (const [k, w] of Object.entries(j.weights || {})) { const t = k === 'pe' ? G.talents.t_sport : Menu.wv(k); apt += t * w; n += w; }
    apt = n ? apt / n : 50;
    const like = Cond.likeMain();
    const likeFit = (j.tags || []).includes(like) ? (G.vars.like3 === G.vars.like6 ? 22 : 15) : like === 'like_none' ? 0 : -5;
    const pay = clamp((Econ.jobGross() - 420) / 30, -10, 12);
    const tgt = 45 + (apt - 50) * 0.3 + likeFit + pay - Math.max(0, s.mentalLoad - 60) * 0.3 - Math.max(0, s.physicalLoad - 70) * 0.2 + (G.flags.creator_hit ? 10 : 0) + (G.flags.black_company ? -15 : 0);
    s.jobSatisfaction = clamp(s.jobSatisfaction ? s.jobSatisfaction + (tgt - s.jobSatisfaction) * 0.3 : tgt, 0, 100);
  }
  function invariants() {
    // I-3：married ⇔ 生存している spouse がちょうど1人
    const sp = people('spouse');
    if (G.flags.married && !sp.length) delete G.flags.married;
    if (!G.flags.married && sp.length) { sp.forEach((p) => (p.role = G.flags.divorced ? 'ex_spouse' : 'spouse')); if (!G.flags.divorced) G.flags.married = true; }
    if (G.flags.has_partner && !people('partner').length) delete G.flags.has_partner;
    // I-6：介護の対象
    if (G.flags.caregiving) { const t = G.people.find((p) => p.id === G.vars.careTarget); if (t && !t.alive) delete G.flags.caregiving; }
    // 生活保護は、収入や貯金が最低生活費をこえたら終わる
    if (G.flags.welfare && (G.cash > 60 || Econ.annualIncome() > 180 + (G.flags.married ? 80 : 0))) {
      G.vars.welfareEndReason = G.cash > 60 ? `所持金が60万円をこえた（いま${man(G.cash)}万円）` : `収入が最低限の生活費をこえた（年${man(Econ.annualIncome())}万円）`;
      delete G.flags.welfare; G.vars.welfareEnded = (G.vars.welfareEnded || 0) + 1;
      schedule('ev_m_welfare_end', 0);
    }
    // I-13
    if (G.cash < 0 && G.age >= 16) G.flags.debt_card = G.flags.debt_card || false; // フラグは ev_f_cash_negative で付く
    // I-9：本業は1つ
    if (G.job && !G.job.id && G.employment !== 'student_part') { G.job = null; }
  }

  // ---------- 1年の成長（Q4のはじめ：docs/09 §3-3） ----------
  const talentOfSubj = (k) => (k === 'pe' ? G.talents.t_sport : k === 'art' ? G.talents.t_art : k === 'music' ? (G.talents.t_music ?? G.talents.t_art) : G.talents.t_academic);
  function initSubjects() {
    if (G.subjInit) return; G.subjInit = true;
    const like = Cond.likeMain();
    const bonus = { like_outdoor: ['pe'], like_book: ['jpn', 'soc'], like_draw: ['art'], like_math: ['math', 'sci'], like_game: ['math'] }[like] || [];
    for (const k of D().flags.subjects) {
      const base = talentOfSubj(k);
      G.subj[k] = Math.round(clamp(base + normal(0, 10) + (bonus.includes(k) ? 5 : 0) + (like === 'like_none' ? 1 : 0) + (G.vars['pre_' + k] || 0), 1, 99));
    }
    G.stats.academic = acad();
  }
  function yearlyGrowth() {
    // 習い事・部活・趣味の1年分
    const clubMul = G.focus === 'focus_club' ? 1.6 : 1;
    for (const c of G.clubs) {
      const d = Menu.club(c.id); if (!d) continue;
      for (const [k, v] of Object.entries(d.yearly || {})) Effects.stat(k, v * (k.startsWith('skill.') || k.startsWith('subj.') ? clubMul : 1));
      if (G.age < 16) G.household.extraCost = (G.household.extraCost || 0) * 0.5 + (d.cost || 0);
      if (d.injury && chance(d.injury / 100)) { Effects.setFlag('injury_sports', true); Effects.stat('health', -5); }
    }
    const hobMul = G.focus === 'focus_hobby' ? 1.5 : 1;
    for (const id of G.hobbies) { const hb = Menu.hobby(id); if (!hb) continue; for (const [k, v] of Object.entries(hb.yearly || {})) Effects.stat(k, (v * hobMul) / Math.max(1, G.hobbies.length * 0.6)); }
    if (!G.subjInit && G.age >= 6) initSubjects();
    if (!G.subjInit) return;
    const st = G.stage;
    const baseG = { elem: 3, free_school: 2, jhs: 4, hs: 5, hs_corr: 3, hs_night: 3, kosen: 5, ronin: 6 }[st];
    if (baseG) {
      const q = (G.school && G.school.quality) || 1;
      // 塾・予備校（study）：通っているあいだだけ、5教科の伸びが上がる（いちばん効くもの1つ）。勉強なので、勉強時間はへらない
      const studyMul = Math.max(1, ...G.clubs.map((c) => (Menu.club(c.id) || {}).study || 1));
      Effects.setFlag('juku', studyMul > 1);
      const fam = 0.9 + G.talents.familyWealth / 500;
      const time = G.clubs.reduce((a, c) => { const d = Menu.club(c.id) || {}; return a + (d.study ? 0 : d.time || 0); }, 0) * D().clubs.rules.studyPenaltyPerTime;
      const ks = ['jpn', 'math', 'sci', 'soc', 'eng', 'pe', 'art', 'music'];
      const sorted = ks.slice(0, 5).sort((a, b) => G.subj[b] - G.subj[a]);
      const like = Cond.likeMain();
      const likeSubj = { like_outdoor: ['pe'], like_book: ['jpn', 'soc'], like_draw: ['art'], like_math: ['math', 'sci'], like_game: ['math'] }[like] || [];
      const likeK = G.vars.like3 && G.vars.like3 === G.vars.like6 ? 1.2 : 1.0;
      for (const k of ks) {
        const t = talentOfSubj(k);
        if (G.subj[k] == null) G.subj[k] = Math.round(clamp(t + normal(0, 10), 1, 99));
        let env = q * fam * (1 - time) * (['jpn', 'math', 'sci', 'soc', 'eng'].includes(k) ? studyMul : 1);
        const f = G.focus;
        if (f === 'focus_study' && !['pe', 'art', 'music'].includes(k)) env *= 1.4;
        if (f === 'focus_strength') env *= sorted.slice(0, 2).includes(k) ? 1.7 : 0.9;
        if (f === 'focus_weakness') env *= sorted.slice(-2).includes(k) ? 1.7 : 0.9;
        if ((f === 'focus_club' || f === 'focus_friends') && k !== 'pe') env *= 0.85;
        if (f === 'focus_club' && k === 'pe') env *= 1.6;
        if (f === 'focus_parttime') env *= 0.8;
        if (f === 'focus_rest') env *= 0.7;
        if (G.focusHalf) env = 1 + (env - 1) * 0.5;
        if (G.stats.stress > 70) env *= 0.7;
        if (G.flags.dz_depression) env *= 0.8;
        const lk = likeSubj.includes(k) ? likeK : 1;
        const sch = G.school && Menu.school(G.school.tmpl); const gr = (sch && sch.growth && sch.growth[k]) || 1;
        const d = baseG * ((0.5 + t / 100) * env * lk * gr - 1) + normal(0, 2);
        G.subj[k] = Math.round(clamp(G.subj[k] + d, 1, 99));
      }
      G.stats.academic = acad();
      if (['elem', 'jhs', 'hs', 'hs_corr', 'hs_night', 'kosen', 'free_school'].includes(st)) makeReport();
    }
    if (G.job && G.job.id && Econ.working()) {
      // 仕事を1年続けたときのステータスの変化（job_display.json）
      const j = Menu.job(G.job.id) || {}; const JD = D().job_display.statEffects;
      const E = { ...(JD.byCat[j.cat] || {}) };
      if (G.stats.physicalLoad >= 70) E.health = (E.health || 0) - 1; if (G.stats.mentalLoad >= 70) E.stress = (E.stress || 0) + 1;
      if (Econ.overtime() >= 40) { E.health = (E.health || 0) - 0.5; E.happiness = (E.happiness || 0) - 0.5; }
      if ((j.tags || []).includes(Cond.likeMain())) E.happiness = (E.happiness || 0) + 1;
      for (const [k, v] of Object.entries(E)) if (k !== 'stress' && k !== 'health') Effects.stat(k, v);
    }
    if (baseG) { /* 学生は上で計算ずみ */ } else if (!Menu.isStudent() && G.age >= 22) {
      // 社会人：使わない教科は年−1（英語は海外勤務なら0）
      for (const k of ['jpn', 'math', 'sci', 'soc']) G.subj[k] = clamp(G.subj[k] - 0.5, 1, 99);
      if (!G.flags.lives_abroad && !G.flags.transfer_abroad) G.subj.eng = clamp(G.subj.eng - 0.7, 1, 99);
      G.stats.academic = clamp(G.stats.academic + (acad() - G.stats.academic) * 0.5 + (G.focus === 'focus_qualify' ? 1 : 0), 0, 100);
    } else if (['univ', 'univ_med', 'junior_college', 'vocational', 'grad_master', 'grad_doctor', 'grad_prof'].includes(st)) {
      if (G.focus === 'focus_study') { G.subj.eng = clamp(G.subj.eng + 1, 1, 99); }
      G.stats.academic = acad();
      if (G.school && !['grad_doctor'].includes(st)) univReport();
    }
    G.focusHalf = false;
  }
  // 通知表（docs/05：μ50の新しい才能に合わせた区切り）。教科ごとの先生のひとこと・去年との比較・出席・1年のふり返りつき
  const SUBJ_E = { jpn: '📖', math: '🔢', sci: '🔬', soc: '🗾', eng: '🔤', art: '🎨', music: '🎵', pe: '🏃', life: '🌱' };
  function makeReport() {
    const st = G.stage, y = G.school.yearIn;
    const e3 = st === 'elem' || st === 'free_school';
    const g3 = (v) => (v >= 65 ? '◎' : v >= 40 ? '〇' : '△');
    const g5 = (v) => (v >= 70 ? 5 : v >= 58 ? 4 : v >= 42 ? 3 : v >= 30 ? 2 : 1);
    let subs;
    if (e3 && y <= 2) subs = [['国語', 'jpn'], ['算数', 'math'], ['生活', 'life'], ['音楽', 'music'], ['図工', 'art'], ['体育', 'pe']];
    else if (e3) subs = [['国語', 'jpn'], ['算数', 'math'], ['理科', 'sci'], ['社会', 'soc'], ['英語', 'eng'], ['図工', 'art'], ['音楽', 'music'], ['体育', 'pe']];
    else subs = [['国語', 'jpn'], ['数学', 'math'], ['理科', 'sci'], ['社会', 'soc'], ['英語', 'eng'], ['美術', 'art'], ['音楽', 'music'], ['保健体育', 'pe']];
    const prev = G.reports[G.reports.length - 1];
    const num = (v) => (typeof v === 'number' ? v : v === '◎' ? 3 : v === '〇' ? 2 : 1);
    const RC = D().text_pools.reportSubj || {};
    const grades = {}, rows = [];
    for (const [lb, k] of subs) {
      const raw = k === 'life' ? (G.subj.jpn + G.subj.sci) / 2 : (G.subj[k] ?? 50) + normal(0, 3);
      const v = e3 ? g3(raw) : g5(raw);
      grades[lb] = v;
      const lvl = num(v) >= (e3 ? 3 : 5) ? 'hi' : num(v) >= (e3 ? 2 : 3) ? 'mid' : 'lo';
      const pool = (RC[k] || {})[lvl] || (RC.any || {})[lvl] || [''];
      let tr = null;
      if (prev && prev.kind === (e3 ? 3 : 5) && prev.grades[lb] != null) tr = Math.sign(num(v) - num(prev.grades[lb]));
      rows.push({ l: lb, k, e: SUBJ_E[k] || '📘', v, cm: pick(pool), tr });
    }
    const best = subs.filter(([, k]) => k !== 'life').sort((a, b) => (G.subj[b[1]] ?? 0) - (G.subj[a[1]] ?? 0));
    const T = G.talents;
    const hints = [];
    if (T.t_comm >= 65) hints.push('友だちの輪の中心にいることが多いです。');
    if (T.t_art >= 65) hints.push('作品づくりに光るセンスがあります。');
    if ((T.t_music ?? 50) >= 65) hints.push('歌や楽器の音をよく聞き分けられます。');
    if (T.t_sport >= 65) hints.push('体を動かすことがとても得意です。');
    if (T.t_academic >= 65) hints.push('のみこみが早く、考える力があります。');
    if (T.t_health < 35) hints.push('体調をくずしやすいので、無理をしないようにしましょう。');
    if (G.flags.class_rep) hints.push('学級委員としてクラスをまとめてくれました。');
    if (!hints.length) hints.push(`${best[0][0]}をとくにがんばっていました。`);
    const comment = `${pick(hints)}${G.stats.stress > 65 ? 'がんばりすぎていないか、少し心配です。' : ''}`;
    const gradeLabel = e3 ? `小学${y}年生` : `${st === 'jhs' ? '中学' : st === 'kosen' ? '高専' : '高校'}${y}年生`;
    // 出席
    const abs = Math.max(0, Math.round(normal((80 - G.stats.health) / 5 + (T.t_health < 35 ? 3 : 0), 1.5)));
    const att = abs ? `欠席 ${abs}日（${abs >= 6 ? '入院・通院' : pick(['かぜ', 'かぜ', '熱', 'けが'])}）・遅刻 ${rint(0, 2)}回` : `欠席 0日・遅刻 ${rint(0, 1)}回（皆勤）`;
    const club = G.clubs.map((c) => (Menu.club(c.id) || {}).label).filter(Boolean).slice(0, 2).join('・');
    // 1年のふり返り
    const stv = { academic: Math.round(G.stats.academic), stress: Math.round(G.stats.stress), social: Math.round(G.stats.social), health: Math.round(G.stats.health), happiness: Math.round(G.stats.happiness) };
    const yr = calYear();
    const inYr = G.log.filter((p) => ((p.y === yr - 1 && p.m >= 4) || (p.y === yr && p.m <= 3)) && !['__lessons', 'ev_m_report_card', 'ev_m_focus_adult', '__notice'].includes(p.id));
    const evs = inYr.filter((p) => p.kind === 'big').map((p) => p.t.replace(/[。！？].*$/, '')).concat(inYr.filter((p) => p.kind === 'choice' && p.chosen).map((p) => p.chosen.replace(/^\S+\s/, '')))
      .filter((t) => t && t.length <= 22).slice(0, 2);
    G.reports.push({ year: yr, stage: st, y, gradeLabel, grades, rows, comment, kind: e3 ? 3 : 5, att, club, st: stv, prevSt: prev && prev.st ? prev.st : null, focus: G.focus, evs, school: G.school.name });
  }

  // 大学・短大・専門：毎年3月の成績表（単位8つ・S〜D・GPA）
  const COURSES = {
    bunkei: ['経済学入門', '民法総論', '社会学概論', '統計学の基礎', '日本史概説', '国際関係論', 'マーケティング論', '心理学入門', '文章表現演習', 'ゼミナール'],
    rikei: ['微分積分', '線形代数', '物理学実験', '化学基礎', 'プログラミング演習', '情報理論', '材料力学', '電気回路', '生物学概論', '卒業研究準備'],
    med: ['解剖学', '生理学', '生化学', '薬理学', '病理学', '公衆衛生学', '臨床実習', '医療倫理'],
    edu: ['教育原理', '教育心理学', '国語科教育法', '算数科教育法', '特別支援教育', '生徒指導論', '教育実習事前指導', '道徳教育論'],
    voc: ['基礎技術演習', '実技Ⅰ', '実技Ⅱ', '接客・マナー', '関係法規', '現場実習', '資格対策講座', '作品・研究発表'],
    common: ['英語コミュニケーション', '情報リテラシー', 'キャリアデザイン', '体育実技'],
  };
  function univReport() {
    const st = G.stage, d = Menu.dept(G.vars.major);
    const key = st === 'vocational' ? 'voc' : st === 'univ_med' || ['nurse', 'med', 'dent', 'pharm'].includes(G.vars.major) ? 'med' : G.vars.major === 'edu' ? 'edu' : d && d.track === 'rikei' ? 'rikei' : 'bunkei';
    const pool = shuffle(COURSES[key]).slice(0, 6).concat(shuffle(COURSES.common).slice(0, 2));
    const f = G.focus;
    const base = 76.5 + (G.stats.academic - 50) * 0.55 + (f === 'focus_study' ? 8 : f === 'focus_parttime' ? -6 : f === 'focus_friends' || f === 'focus_love' ? -3 : 0) - (G.stats.stress > 70 ? 6 : 0);
    const GR = (sc) => (sc >= 90 ? ['S', 4] : sc >= 80 ? ['A', 3] : sc >= 70 ? ['B', 2] : sc >= 60 ? ['C', 1] : ['D', 0]);
    const rows = pool.map((nm) => { const sc = Math.round(clamp(base + normal(0, 9), 20, 100)); const [g, gp] = GR(sc); return { l: nm, sc, v: g, gp }; });
    const gpa = Math.round((rows.reduce((a, x) => a + x.gp, 0) / rows.length) * 100) / 100;
    const credits = rows.filter((x) => x.gp > 0).length * 2;
    const yr = calYear();
    G.reports.push({ year: yr, stage: st, y: G.school.yearIn, gradeLabel: `${(D().flags.stages[st] || '大学').replace(/（.*）/, '')}${G.school.yearIn}年生`, grades: {}, rows, kind: 'u', gpa, credits, comment: gpa >= 3 ? 'とても優秀な成績です。' : gpa >= 2 ? '順調に単位をとれています。' : gpa >= 1 ? '落とした単位があります。来年はがんばろう。' : '単位がかなり足りません。', school: G.school.name, focus: G.focus, st: { academic: Math.round(G.stats.academic), stress: Math.round(G.stats.stress), social: Math.round(G.stats.social), health: Math.round(G.stats.health), happiness: Math.round(G.stats.happiness) } });
    if (gpa < 1.0 && schoolYearsLeft() >= 1) schedule('ev_m_univ_low_gpa', 0);
    G.vars.lastGpa = gpa;
  }
  function setFocus(f, now) {
    if (!Menu.FOCUS[f]) return;
    if (f !== G.focus) { G.focus = f; G.focusHalf = !now && G.q !== 3; }
    // バイトの方針にした瞬間、バイトをしていなければ「どこで働く？」を次に出す
    if (f === 'focus_parttime' && Menu.isStudent() && G.age >= 16 && !(G.job && G.job.part)) { G.queue = G.queue || []; if (!G.queue.some((x) => x.id === 'ev_m_parttime_pick')) G.queue.unshift({ id: 'ev_m_parttime_pick', ctx: {}, sched: true }); }
  }
  function onLike(k) {
    // 好きなことが最初の趣味になる（clubs.hobbyRules.firstFrom）
    const v = G.vars[k]; const h = D().clubs.hobbyRules.firstFrom[v];
    if (h && !G.hobbies.includes(h)) G.hobbies.push(h);
    if (k === 'like6' && !G.subjInit) initSubjects();
  }

  // ---------- 特別な前処理 ----------
  const PRE = {
    ev_r_market_crash(ctx) { ctx.crashPct = rint(20, 45); G.assets *= 1 - ctx.crashPct / 100; },
    ev_r_cancer(ctx) {
      const share = D().events_random.riskCurves[G.gender === 'F' ? 'cancerSiteShare_F' : 'cancerSiteShare_M'];
      let t = weighted(Object.keys(share), (k) => share[k]); if (t === 'other') t = pick(Object.keys(share).filter((k) => k !== 'other'));
      G.vars.cancerType = t;
      const r = G.flags.kenshin_habit || G.vars.kenshinFlag ? [1, 2] : [2, 4];
      G.vars.cancerStage = rint(r[0], r[1]);
      G.vars.kenshinFlag = false;
      Audio2.se('shock');
    },
    ev_m_death(ctx) { die(G.deathCause); },
    ev_m_baby_work(ctx) { const ps = people('father|mother').filter((p) => p.age < 78 && !p.careLevel && !p.together); if (ps.length && !ctx.who) ctx.who = ps.sort((a, b) => (a.pref === G.pref ? -1 : 0) - (b.pref === G.pref ? -1 : 0))[0]; },
    // 子どもの進路の希望（本人が決める）
    ev_m_child_after_hs(ctx) { const c = ctx.child; if (!c || c.wish) return; const W = { local: tier() === 'C' ? 18 : 34, away: tier() === 'C' ? 30 : 18, abroad: 3, voc: 22, work: 16 }; c.wish = weighted(Object.keys(W), (k) => W[k]); },
    ev_f_sibling_birth(ctx) { ctx.sibData = ctx.sibData || {}; },
    ev_r_car_accident() { Audio2.se('crash'); },
    ev_r_traffic_victim() { Audio2.se('crash'); },
    ev_m_elem_entry() { Audio2.se('chime'); }, ev_m_jhs_entry() { Audio2.se('chime'); }, ev_m_hs_entry() { Audio2.se('chime'); }, ev_m_post_entry() { Audio2.se('chime'); },
    ev_f_inheritance(ctx) { if (ctx.estate == null) ctx.estate = People.estate({}); },
    ev_m_post_entry2() {},
  };

  // 死亡したら最後に ev_m_death を出す
  function checkDeath() {
    if (G.pendingDeath && !G.pending) {
      G.pendingDeath = false;
      G.queue = [{ id: 'ev_m_death', ctx: {} }];
      return true;
    }
    return false;
  }
  return { prefMenu, prefCounts, PREF_SRC, univReport, lessonEffText: (d) => lessonEff(d), begin, next, choose, chooseMenuNext, chooseLessons, addLesson, lessonCandidates, lessonCap, jukuOk, poorHome, isLesson, snap, diff, schedule, setFocus, onLike, initSubjects, die, rollP, ev, buildQueue, advance, checkDeath, ageLabel, acad };
})();
