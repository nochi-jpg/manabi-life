'use strict';
// ===== エンディングの点数（docs/11・data/ending.json） =====
const Ending = (() => {
  const avg = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const pct = (a, b) => (b ? clamp((a / b) * 100, 0, 100) : 0);
  function criterion(g, type) {
    const H = g.hist;
    const kids = g.people.filter((p) => p.role === 'child').length, gk = g.people.filter((p) => p.role === 'grandchild').length;
    switch (type) {
      case 'hp_self': {
        const ach = (g.flags.creator_hit ? 40 : 0) + (g.flags.startup_exp ? 25 : 0) + (g.flags.national_tournament ? 25 : 0) + (g.flags.koshien ? 25 : 0) + Math.min(40, (H.hobbyYears || 0) / 4);
        return 0.4 * avg(H.jobSat) + 0.3 * pct(H.likeMatch, Math.max(1, H.workYears)) + 0.15 * clamp(g.hobbies.length * 10 + (H.hobbyYears || 0) / 2, 0, 100) + 0.15 * clamp(ach, 0, 100);
      }
      case 'hp_people': {
        const fam = g.people.filter((p) => ['spouse', 'partner', 'child', 'grandchild', 'father', 'mother', 'sibling'].includes(p.role)).length;
        return 0.5 * avg(H.social) + 0.25 * clamp(fam * 10, 0, 100) + 0.25 * clamp((H.peopleWorkYears / 40) * 100, 0, 100);
      }
      case 'hp_money': {
        const ma = Math.max(1, H.maxAssets || 1);
        const sa = clamp(50 + (50 * Math.log(ma / 2000)) / Math.log(5), 0, 100);
        const si = clamp((H.lifetimeIncome / 40000) * 100, 0, 100);
        return 0.5 * sa + 0.3 * si + 0.2 * pct(H.cashNonNeg, Math.max(1, H.years - 16));
      }
      case 'hp_family': {
        const kidPts = kids + gk ? clamp((kids + gk) * 25, 0, 100) : clamp(((g.vars.marriedYear != null ? g.age - (g.vars.marriedYear - 2010) : 0) / 40) * 100, 0, 100);
        return 0.25 * pct(H.liveFamily, H.years) + 0.25 * (avg(H.familyRel) || 50) + 0.2 * (100 - avg(H.stress)) + 0.15 * kidPts + 0.15 * avg(H.health);
      }
      default: return 50;
    }
  }
  function compute(g) {
    const W = D().ending.weights;
    const ha = Math.round(avg(g.hist.happiness));
    const cr = Math.round(criterion(g, g.happinessType));
    const score = Math.round(ha * W.happinessAvg + cr * W.criterion);
    const rank = D().ending.ranks.find((r) => score >= r.min) || D().ending.ranks[D().ending.ranks.length - 1];
    return { ha, cr, score, rank };
  }
  return { compute, avg };
})();

// ===== 人生の記録（これまでの人生に保存する形） =====
function lifeRecord(g) {
  const e = Ending.compute(g);
  const jobs = (g.jobRecord || []).map((x) => x.l).filter((x, i, a) => a.indexOf(x) === i);
  return {
    v: 1, id: g.seed, name: `${g.surname} ${g.given}`, kana: g.kana.join(' '), gender: g.gender, pref: prefOf(g.birthPref).name,
    born: 2010, died: calYear(g), age: g.age, cause: g.deathCause || '病気', score: e.score, rank: e.rank.label, rankId: e.rank.id,
    ha: e.ha, cr: e.cr, hp: g.happinessType, mode: g.mode, jobs: jobs.slice(0, 4).join(' → ') || 'なし', snap: snapOf(g),
  };
}
// リザルトをもう一度見るための写し（ログは大事なできごとだけ）
function snapOf(g) {
  try {
    const keep = (p) => p.kind === 'big' || p.kind === 'world' || p.kind === 'choice' || /childbirth|first_job|parent_death|spouse_death/.test(p.id || '');
    return JSON.parse(JSON.stringify({ ...g, log: g.log.filter(keep).slice(-160), queue: [], scheduled: [], pending: null, picked: {}, noticeQ: [], reports: [] }));
  } catch (e) { return null; }
}

// ===== リザルト（ui/result.html） =====
Screens.result = {
  finish() {
    if (!G) return;
    const rec = lifeRecord(G);
    if (!G.savedToHistory) { pushHistory(rec); G.savedToHistory = true; }
    // 写しは新しい30人ぶんまで（保存できる量に限りがあるため）
    const H = histories(); let changed = false; H.forEach((r, i) => { if (i >= 30 && r.snap) { delete r.snap; changed = true; } }); if (changed) Store.set('history', H);
    Store.del('life'); // 人生は一度きり：終わったらセーブを消す
    App.show('result');
  },
  enter(el, mode) {
    if (!G) { App.show('title'); return; }
    const viewing = mode === 'view';
    Audio2.bgm('result');
    if (!viewing) Screens.result.live = null;
    const e = Ending.compute(G);
    const H = G.hist;
    const crit = D().ending.criteria[G.happinessType];
    const ranks = D().ending.ranks.slice().reverse();
    const stars = Math.max(1, ranks.findIndex((r) => r.id === e.rank.id) + 1);
    const jobs = (G.jobRecord || []).map((x) => x.l).filter((x, i, a) => a.indexOf(x) === i);
    const edu = eduLabel();
    const kids = people('child', false).length, gks = people('grandchild', false).length;
    const sp = G.people.find((p) => p.role === 'spouse' || p.role === 'ex_spouse');
    const fam = [sp ? (sp.role === 'spouse' ? roleLabel(sp) : '元配偶者') : null, kids ? `子ども${kids}人` : null, gks ? `孫${gks}人` : null].filter(Boolean).join('・') || 'ひとり';
    const minCash = Math.min(...H.cash.slice(16)); const minAge = H.cash.indexOf(minCash);
    const totalTax = Object.entries(G.tax).filter(([k]) => k !== 'socialInsurance').reduce((a, [, v]) => a + v, 0);
    const hob = G.hobbies.map((id) => (Menu.hobby(id) || {})).filter((x) => x.label).map((x) => `${x.emoji} ${x.label.replace(/（.*）/, '')}`);
    const ill = ['dz_diabetes', 'dz_hypertension', 'dz_depression', 'dz_heart', 'dz_stroke_after', 'dz_dementia', 'cancer_survivor'].filter((f) => G.flags[f]).map((f) => (f === 'cancer_survivor' ? 'がん（克服）' : (D().flags.flags.health[f] || f)));
    const LIC = Object.keys(D().flags.flags.license).filter((f) => G.flags[f]);
    const ep = epitaph(jobs, fam);
    el.innerHTML = `
      <div class="rttl"><div class="a">🕊️ ${esc(G.given)} の 人生</div><div class="b">2010年4月 ${esc(prefOf(G.birthPref).name)}に生まれる 〜 ${calYear()}年${MONTH[G.q]}月　${G.age}歳で人生を終える（${esc(G.deathCause || '病気')}）</div></div>
      <div class="panel" id="rme">
        <div class="pic" style="background-image:url(${faceFile(G.gender, G.age)})"></div>
        <div class="end">${esc(e.rank.label)}</div>
        <div class="score num">${e.score}<small>点</small></div>
        <div class="stars">${'⭐'.repeat(stars)}<span style="opacity:.25">${'⭐'.repeat(5 - stars)}</span></div>
        <div class="hp"><span class="ic">💭</span><span><small>幸せの基準</small>${esc(crit.label)}</span><b>${e.cr}点</b></div>
        <div class="ep">${esc(ep)}</div>
        <div class="rank">${ranks.map((r) => `<span class="${r.id === e.rank.id ? 'on' : ''}">${({ end_hard: '困難', end_trial: '試行錯誤', end_dramatic: '波乱万丈', end_balance: 'バランス', end_happy: '幸福' })[r.id] || ''}</span>`).join('')}</div>
      </div>
      <div class="panel" id="rinfo">
        <div class="tabs">${[['r1', '📋 まとめ'], ['r2', '🧬 才能'], ['r3', '💴 お金のグラフ'], ['r4', '📜 できごと']].map(([k, l], i) => `<button data-p="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div>
        <div class="page on" id="r1"><div class="g2"><div>
          <div class="kv"><span class="k">🎓 最終学歴</span><span>${esc(edu)}</span></div>
          <div class="kv"><span class="k">💼 おもな仕事</span><span>${esc(jobs.slice(0, 3).join(' → ') || 'なし')}</span></div>
          <div class="kv"><span class="k">🧾 納めた税金</span><span class="num">${manFull(totalTax)} <button class="more sq" id="taxBtn">くわしく ▶</button></span></div>
          <div class="kv"><span class="k">💴 生涯の収入</span><span class="num">${manFull(H.lifetimeIncome)}</span></div>
          <div class="kv"><span class="k">👛 最後の所持金</span><span class="num ${G.cash < 0 ? 'neg' : ''}">${manFull(G.cash)}</span></div>
          <div class="kv"><span class="k">🟥 最低の所持金</span><span class="num ${minCash < 0 ? 'neg' : ''}">${isFinite(minCash) ? manFull(minCash) + `<small>（${minAge}歳）</small>` : '—'}</span></div>
        </div><div>
          <div class="kv"><span class="k">💍 家族</span><span>${esc(fam)}</span></div>
          <div class="kv"><span class="k">📍 住んだ所</span><span>${esc(prefOf(G.birthPref).name)}${G.pref !== G.birthPref ? ' → ' + esc(pref().name) : ''}</span></div>
          <div class="kv"><span class="k">✨ 趣味</span><span class="wrap">${esc(hob.join('・') || 'なし')}</span></div>
          <div class="kv"><span class="k">🏥 病気</span><span>${esc(ill.join('・') || 'とくになし')}</span></div>
          <div class="kv"><span class="k">📜 資格</span><span class="wrap">${esc(LIC.map(licText).join('・') || 'なし')}</span></div>
          <div class="kv"><span class="k">🧮 点数の内わけ</span><span>満足感${e.ha}×0.6＋基準${e.cr}×0.4 <small>${esc(D().modes.resultBadge[G.mode])}</small></span></div>
        </div></div></div>
        <div class="page" id="r2">${talentsHtml()}</div>
        <div class="page" id="r3">${chartSvg()}</div>
        <div class="page" id="r4"></div>
      </div>
      <div id="rbot">${viewing ? '<span class="saved">📜 これまでの人生から見ています</span>' : '<span class="saved">✓ 「これまでの人生」に保存しました</span>'}<button id="rHist">📜 これまでの人生</button><button class="main" id="rTitle">${viewing ? '◀ もどる' : '🏠 タイトルへ'}</button></div>`;
    $$('.tabs button', el).forEach((b) => (b.onclick = () => { $$('.tabs button,.page', el).forEach((x) => x.classList.remove('on')); b.classList.add('on'); $('#' + b.dataset.p, el).classList.add('on'); }));
    $('#taxBtn', el).onclick = () => taxPopup();
    const leave = () => { G = viewing ? Screens.result.live || null : null; Screens.result.live = null; };
    $('#rHist', el).onclick = () => { leave(); App.show('history'); };
    $('#rTitle', el).onclick = () => { leave(); App.show(viewing ? 'history' : 'title'); };
    eventsPage($('#r4', el), 0);
  },
};
function eduLabel() {
  const f = G.flags;
  const sc = G.lastSchool || (G.school && G.school.name) || '';
  if (f.edu_doctor_grad) return '大学院（博士）';
  if (f.edu_master_grad) return '大学院（修士）';
  if (f.edu_univ_grad) return sc || '大学';
  if (f.edu_jc_grad) return '短期大学'; if (f.edu_vocational_grad) return '専門学校'; if (f.edu_kosen_grad) return '高等専門学校';
  if (f.edu_hs_grad) return '高校'; if (f.edu_hs_kentei) return '高卒認定'; if (f.edu_jhs_grad) return '中学校';
  return '小学校';
}
function licText(f) { const q = D().events_random.qualifications.find((x) => x.flag === f); if (q) return q.label.replace(/（.*）/, ''); return ({ lic_car: '普通免許', lic_teacher_elem: '小学校教員免許', lic_teacher_sec: '中高教員免許', lic_nurse: '看護師', lic_doctor: '医師', lic_dentist: '歯科医師', lic_pharmacist: '薬剤師', lic_lawyer: '弁護士', eiken_3: '英検3級', eiken_2: '英検2級', eiken_p1: '英検準1級', eiken_1: '英検1級', toeic_600: 'TOEIC600', toeic_800: 'TOEIC800', toeic_900: 'TOEIC900' })[f] || f; }
function epitaph(jobs, fam) {
  const j = jobs.filter((x) => x !== 'アルバイト・パート' && x !== '引退')[0];
  const a = G.age;
  if (j && fam !== 'ひとり') return `${j}として働き、\n${fam}とともに歩んだ${a}年。`;
  if (j) return `${j}として働き、\n自分の道を歩んだ${a}年。`;
  if (fam !== 'ひとり') return `${fam}とともに歩んだ${a}年。`;
  return `${pref().name}で、自分らしく生きた${a}年。`;
}
// 才能（上位◯%）
function topPct(v) { const z = (v - 50) / 15; const cdf = 0.5 * (1 + erf(z / Math.SQRT2)); return Math.max(1, Math.round((1 - cdf) * 100)); }
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
function talentsHtml() {
  const T = G.talents;
  const L = [['t_academic', '📚 学力の才能', 'c-blue'], ['t_comm', '🤝 コミュ力の才能', 'c-mint'], ['t_art', '🎨 美術センス', 'c-pink'], ['t_music', '🎵 音楽センス', 'c-purple'], ['t_sport', '🏃 運動能力', 'c-gold'], ['t_health', '❤️ 体の丈夫さ', 'c-red']];
  if (T.t_music == null) T.t_music = T.t_art;
  const best = L.slice().sort((a, b) => T[b[0]] - T[a[0]])[0];
  const likeName = { like_outdoor: '外で遊ぶ', like_book: '本を読む', like_draw: '絵をかく', like_math: '計算・パズル', like_game: 'テレビゲーム', like_none: '' }[Cond.likeMain()];
  return L.map(([k, l, c]) => `<div class="tal"><span>${l}</span><span class="bar ${c}"><i style="--w:${T[k]}%"></i></span><span class="v num">${T[k]}</span><span class="r">上位 <b>${topPct(T[k])}%</b></span></div>`).join('') +
    `<div class="tal"><span>🏠 生まれた家</span><span class="bar c-purple"><i style="--w:${T.familyWealth}%"></i></span><span class="v num">${T.familyWealth}</span><span class="r">${bandOf(T.familyWealth).label}</span></div>
    <div class="cm">🧬 いちばんの才能は<b>${best[1].replace(/^\S+\s/, '').replace('の才能', '')}</b>（上位${topPct(T[best[0]])}%）。${likeName ? `好きだった「${likeName}」は、人生のあちこちで顔を出していました。` : ''}才能は生まれつき。でも、教科の力や技術は、環境と努力で育ちます。</div>`;
}
function chartSvg() {
  const H = G.hist; const n = H.cash.length;
  const W = 800, Hh = 392, L = 64, R = 16, T = 16, B = 36;
  const vals = H.cash.slice(16).concat(H.income.slice(16)).concat([0]);
  let ymax = Math.max(500, ...vals), ymin = Math.min(0, ...H.cash.slice(16));
  const raw = (ymax - ymin) / 6; const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw)))); const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= raw) || mag * 10;
  ymax = Math.ceil(ymax / step) * step; ymin = Math.floor(ymin / step) * step;
  const maxA = Math.max(85, n);
  const X = (a) => L + ((W - L - R) * a) / maxA, Y = (v) => T + ((Hh - T - B) * (ymax - v)) / (ymax - ymin);
  let s = `<svg width="${W}" height="${Hh}" class="chart"><rect x="${L}" y="${T}" width="${W - L - R}" height="${Hh - T - B}" fill="#fff" rx="10"/>`;
  for (let v = ymin; v <= ymax; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? '#23305a' : '#e3ebf6'}" stroke-width="${v === 0 ? 2 : 1}"/><text x="${L - 8}" y="${Y(v) + 4}" font-size="12" fill="#5d6b8f" text-anchor="end">${v.toLocaleString('ja-JP')}</text>`;
  for (let a = 0; a <= maxA; a += 10) s += `<text x="${X(a)}" y="${Hh - B + 20}" font-size="12" fill="#5d6b8f" text-anchor="middle">${a}歳</text>`;
  H.income.forEach((v, a) => { if (v > 0) s += `<rect x="${X(a) - 3}" y="${Y(v)}" width="6" height="${Math.max(0, Y(0) - Y(v))}" fill="#ffcf3f" opacity=".8"/>`; });
  let d = ''; H.cash.forEach((v, a) => { if (a < 16) return; d += (d ? 'L' : 'M') + X(a).toFixed(1) + ',' + Y(v).toFixed(1); });
  s += `<path d="${d}" fill="none" stroke="#2f6aa8" stroke-width="3"/>`;
  H.cash.forEach((v, a) => { if (a >= 16 && v < 0) s += `<circle cx="${X(a)}" cy="${Y(v)}" r="4" fill="#e44d62"/>`; });
  s += `<g font-size="13"><rect x="${L + 16}" y="${T + 12}" width="14" height="14" fill="#ffcf3f"/><text x="${L + 36}" y="${T + 24}" fill="#23305a">年収</text><line x1="${L + 90}" x2="${L + 112}" y1="${T + 19}" y2="${T + 19}" stroke="#2f6aa8" stroke-width="3"/><text x="${L + 118}" y="${T + 24}" fill="#23305a">所持金（万円）</text></g></svg>`;
  return s;
}
function eventsPage(box, page) {
  const keyIds = /entry|first_job|wedding|propose|childbirth|cancer|stroke|heart|death|hs_exam|post_exam|job_hunt|retire|promotion|house|divorce|startup|creator|tournament|koshien|layoff|lottery|move|transfer/;
  const L = G.log.filter((p) => p.kind === 'big' || p.kind === 'world' || (p.kind === 'choice' && keyIds.test(p.id)) || /ev_f_childbirth|ev_m_first_job|ev_f_parent_death|ev_f_spouse_death/.test(p.id));
  const per = 8; const pages = Math.max(1, Math.ceil(L.length / per)); page = clamp(page, 0, pages - 1);
  box.innerHTML = L.slice(page * per, page * per + per).map((p) => `<div class="hl"><span class="y num">${p.y}年${p.m}月</span><span class="a">${p.age}歳</span><span class="e">${p.e}</span><span class="t">${esc(p.t)}${p.chosen ? `<small>選んだ：${esc(p.chosen)}</small>` : ''}</span></div>`).join('') +
    `<div class="pager2"><button id="eP" ${page ? '' : 'disabled'}>◀</button><span>${page + 1} / ${pages}</span><button id="eN" ${page < pages - 1 ? '' : 'disabled'}>▶</button></div>`;
  $('#eP', box).onclick = () => eventsPage(box, page - 1); $('#eN', box).onclick = () => eventsPage(box, page + 1);
}
function taxPopup() {
  const T = D().taxes, t = G.tax, r = G.received;
  const R = T.result.reasons;
  const row = (e, l, v, why) => `<div class="tx"><span>${e}</span><span>${l}</span><span class="n num">${man(v || 0)}</span><span class="r">${why || ''}</span></div>`;
  const rows = [
    row('🏛️', '所得税（国）', t.incomeTax, `給料が上がるほど税率が上がる${r.depDeduction ? ` <span class="m">${R.dependents}</span>` : ''}`),
    row('🏢', '住民税（県・市）', t.residentTax, '所得の約10%'),
    row('🛒', '消費税', t.consumptionTax, '買い物の10%（食べ物は8%）'),
    row('🏠', '固定資産税', t.fixedAssetTax, G.flags.owns_house || t.fixedAssetTax ? `<span class="p">${R.owns_house}</span>` : '家を持たなかった'),
    row('🚗', '自動車税・重量税', t.carTax, t.carTax ? `<span class="p">${R.owns_car}</span>` : '車を持たなかった'),
    row('⛽', 'ガソリン税', t.gasolineTax, t.gasolineTax ? `<span class="p">${R.owns_car}</span>` : ''),
    row('🍺', '酒税', t.liquorTax, t.liquorTax ? `<span class="p">${R.drinker}</span>` : '飲まなかった'),
    row('🚬', 'たばこ税', t.tobaccoTax, t.tobaccoTax ? `<span class="p">${R.smoker}</span>` : '吸わなかった（1日1箱なら年13万円）'),
    row('📜', '相続税', t.inheritanceTax, t.inheritanceTax ? '親の遺産が基礎控除より多かった' : 'かからなかった'),
  ];
  const tot = Object.entries(t).filter(([k]) => k !== 'socialInsurance').reduce((a, [, v]) => a + v, 0);
  const got = (r.pension || 0) + (r.childAllowance || 0) + (r.unemployment || 0) + (r.insurance || 0) + (r.mortgageCredit || 0);
  const box = Popup.show(`<h2>🧾 ${esc(G.given)}が一生のうちに納めた税金 <small>${G.age}年間の合計（万円）</small></h2>
    <div class="tcol"><div><h4>払った税金</h4>${rows.join('')}<div class="tx sum"><span>🧾</span><span>税金の合計</span><span class="n num">${man(tot)}</span><span class="r">生涯の収入の約${Math.round((tot / Math.max(1, G.hist.lifetimeIncome)) * 100)}%</span></div></div>
    <div class="side"><h4>社会保険料（年金・健康保険など）</h4>${row('👵', '年金・健康保険など', t.socialInsurance, '')}
      <h4>受け取ったもの</h4>${row('👵', '年金', r.pension, '')}${row('👶', '児童手当', r.childAllowance, '')}${row('🔍', '失業手当', r.unemployment, '')}${row('🛡️', '保険の給付金', r.insurance, '')}${row('🏡', '住宅ローン控除', r.mortgageCredit, '')}
      <div class="tx sum"><span>🎁</span><span>合計</span><span class="n num">${man(got)}</span><span></span></div></div></div>
    <div class="note2">💡 税金は、学校・道路・病院・警察や消防・年金や子育ての支えなどに使われています。払うだけでなく、いろいろな形で受け取ってもいます。</div>
    <button class="main close" id="txX">とじる</button>`, 'taxbox');
  $('#txX', box).onclick = () => Popup.close();
}

// ===== これまでの人生（ui/history.html）とバックログ（ui/backlog.html） =====
Screens.history = {
  enter(el, mode) {
    if (mode === 'backlog') return Backlog.enter(el);
    Audio2.bgm('history');
    const H = histories();
    let page = 0;
    const per = 6;
    const draw = () => {
      const pages = Math.max(1, Math.ceil((H.length + 1) / per));
      page = clamp(page, 0, pages - 1);
      const cards = H.slice(page * per, page * per + per);
      const avgS = H.length ? Math.round(H.reduce((a, x) => a + x.score, 0) / H.length) : 0;
      const longest = H.length ? Math.max(...H.map((x) => x.age)) : 0;
      el.innerHTML = `<div class="hhd"><h1>📜 これまでの人生</h1><div class="st"><div>生きた人生 <b>${H.length}</b> 人</div><div>平均 <b>${avgS}</b> 点</div><div>いちばん長生き <b>${longest}</b> 歳</div></div></div>
        <div class="hgrid">${cards.map((r, i) => `<div class="hcard ${r.snap ? 'tap' : ''}" data-h="${i}"><div class="pic" style="background-image:url(${faceFile(r.gender, r.age)})"></div><div><div class="nm pn">${esc(r.name)}</div><div class="life">${esc(r.pref)}生まれ<br>${r.born}〜${r.died}年（${r.age}歳）<br>${esc(r.cause)}</div></div>
          <div class="end"><span>${esc(r.rank)}</span><b class="num">${r.score}<small>点</small></b></div><div class="job"><span>💼</span><span>${esc(r.jobs)}</span></div></div>`).join('')}
          ${cards.length < per ? '<div class="hcard empty">つぎの人生が ここに入ります</div>' : ''}</div>
        <div class="hpager"><button id="hBack">◀ ${G && G.alive ? 'もどる' : 'タイトルへ'}</button>
          <div class="nav"><button id="hP" ${page ? '' : 'disabled'}>◀ 前</button><span class="num">${page + 1} / ${pages}</span><button id="hN" ${page < pages - 1 ? '' : 'disabled'}>次 ▶</button></div>
          <button class="main" id="hQR" ${H.length ? '' : 'disabled'}>📤 書き出す（QR）</button></div>`;
      $('#hBack', el).onclick = () => App.show(G && G.alive ? 'main' : 'title');
      $('#hP', el).onclick = () => { page--; draw(); }; $('#hN', el).onclick = () => { page++; draw(); };
      $$('[data-h]', el).forEach((c) => (c.onclick = () => {
        const r = cards[+c.dataset.h];
        if (!r || !r.snap) { toast('この人生は、くわしい記録が残っていません'); return; }
        Screens.result.live = G && G.alive ? G : null;
        G = r.snap; App.show('result', 'view');
      }));
      $('#hQR', el).onclick = () => exportQR(cards.length ? cards : H.slice(0, per));
    };
    draw();
  },
};
// QR／テキストで書き出す（manabi-battle と同じ方式：短い文字列にして QR に）
function packHistory(list) {
  const rows = list.map((r) => [r.name, r.kana, r.gender, r.pref, r.died, r.age, r.cause, r.score, r.rankId, r.jobs, r.mode, r.hp].join('|'));
  const txt = 'ML1;' + rows.join(';');
  return btoa(unescape(encodeURIComponent(txt)));
}
function unpackHistory(s) {
  try {
    const txt = decodeURIComponent(escape(atob(s.trim())));
    if (!txt.startsWith('ML1;')) return null;
    return txt.slice(4).split(';').map((row) => { const [name, kana, gender, prefName, died, age, cause, score, rankId, jobs, mode, hp] = row.split('|'); const rk = D().ending.ranks.find((r) => r.id === rankId) || D().ending.ranks[2]; return { v: 1, id: name + died + age, name, kana, gender, pref: prefName, born: 2010, died: +died, age: +age, cause, score: +score, rank: rk.label, rankId, jobs, mode, hp }; });
  } catch (e) { return null; }
}
function exportQR(list) {
  const code = packHistory(list);
  let svg = '';
  try { const q = qrcode(0, 'L'); q.addData(code); q.make(); svg = q.createSvgTag({ cellSize: 4, margin: 2 }); } catch (e) { svg = '<div class="qrerr">QRに入りきらない量です。テキストで書き出してください。</div>'; }
  const box = Popup.show(`<h2>📤 これまでの人生を書き出す</h2>
    <div class="qrwrap"><div class="qr">${svg}</div><div class="qrside"><p>このページの${list.length}人ぶんの人生を、QRコードとテキストにしました。写真にとったり、コピーして保存したりできます。</p>
      <textarea id="qrTxt" readonly>${code}</textarea>
      <div class="list"><button id="qrCopy">📋 テキストをコピー</button><button id="qrIn">📥 テキストから読みこむ</button></div></div></div>
    <button class="main close" id="qrX">とじる</button>`, 'qrbox');
  $('#qrX', box).onclick = () => Popup.close();
  $('#qrCopy', box).onclick = () => { const t = $('#qrTxt', box); t.select(); try { navigator.clipboard.writeText(code); } catch (e) { document.execCommand('copy'); } toast('コピーしました'); };
  $('#qrIn', box).onclick = () => {
    const t = $('#qrTxt', box); t.readOnly = false; t.value = ''; t.placeholder = 'ここに書き出したテキストをはりつけて、もう一度「読みこむ」'; t.focus();
    $('#qrIn', box).onclick = () => { const L = unpackHistory(t.value); if (!L) { toast('読みこめませんでした'); return; } const H = histories(); const ids = new Set(H.map((x) => x.name + x.died + x.age)); L.forEach((r) => { if (!ids.has(r.name + r.died + r.age)) H.push(r); }); Store.set('history', H); Popup.close(); toast(`${L.length}人の人生を読みこみました`); App.show('history'); };
  };
}

// ===== バックログ（ここだけスクロール可・細いバー） =====
const Backlog = {
  enter(el) {
    const L = G.log;
    const decades = [...new Set(L.map((p) => Math.floor(p.age / 10)))];
    let dec = Math.floor(G.age / 10), genre = 'all';
    const GEN = [['all', 'すべて'], ['choice', '選んだこと'], ['money', 'お金'], ['family', '家族'], ['health', '健康']];
    const ok = (p) => genre === 'all' || (genre === 'choice' ? p.kind === 'choice' : p.cat === genre || (genre === 'family' && p.cat === 'love'));
    const draw = () => {
      const list = L.filter((p) => Math.floor(p.age / 10) === dec && ok(p));
      let lastAge = -1;
      el.innerHTML = `<div id="blog"><div class="bhd"><h1>📖 バックログ</h1><div class="f">${GEN.map(([k, l]) => `<button data-g="${k}" class="${k === genre ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div class="yr">${decades.map((d) => `<button data-d="${d}" class="${d === dec ? 'on' : ''}">${d * 10}〜${d * 10 + 9}歳<small>${L.filter((p) => Math.floor(p.age / 10) === d).length}</small></button>`).join('')}</div>
        <div id="blist" class="scroll">${list.map((p) => { const head = p.age !== lastAge ? `<div class="age">${p.age}歳（${p.y}年）</div>` : ''; lastAge = p.age; return head + `<div class="p ${p.kind === 'choice' ? 'c' : ''}"><span class="y num">${p.y}年</span><span class="m num">${p.m}月</span><span class="e">${p.e}</span><span class="t">${esc(p.t)}${p.chosen ? `<small>選んだ：${esc(p.chosen)}</small>` : ''}</span></div>`; }).join('') || '<div class="age">この時期のできごとはありません</div>'}</div>
        <div class="ft"><span class="n">💡 ゲームは止まっています。ログは人生の終わりまで、すべて残ります</span><button class="main" id="bX">✕ とじる</button></div></div>`;
      $$('[data-g]', el).forEach((b) => (b.onclick = () => { genre = b.dataset.g; draw(); }));
      $$('[data-d]', el).forEach((b) => (b.onclick = () => { dec = +b.dataset.d; draw(); }));
      $('#bX', el).onclick = () => App.show('main');
    };
    draw();
  },
};

// ===== オプション（ui/options.html）＋デバッグモード（⚙️を30回） =====
Screens.options = {
  enter(el, from) {
    const o = Options.get();
    let taps = 0;
    const seg = (key, vals, labels) => `<div class="seg" data-key="${key}">${vals.map((v, i) => `<button data-v="${v}" class="${String(o[key]) === String(v) ? 'on' : ''}">${labels[i]}</button>`).join('')}</div>`;
    el.innerHTML = `<div class="opanel panel">
      <h1><span id="gear" class="tap">⚙️</span> オプション</h1>
      <div class="orow"><span class="k">🎵 BGMの音量</span><input type="range" min="0" max="100" value="${Math.round(o.bgmVolume * 100)}" data-k="bgmVolume"><span class="v num">${Math.round(o.bgmVolume * 100)}</span></div>
      <div class="orow"><span class="k">🔔 効果音の音量</span><input type="range" min="0" max="100" value="${Math.round(o.seVolume * 100)}" data-k="seVolume"><span class="v num">${Math.round(o.seVolume * 100)}</span></div>
      <div class="orow"><span class="k">⏩ はじめの速さ</span>${seg('speed', [1, 2, 4], ['▶ ふつう', '×2', '×4'])}</div>
      <div class="orow"><span class="k">💓 ドキドキ演出</span>${seg('suspenseSkip', [false, true], ['最後まで見る', 'タップで飛ばせる'])}</div>
      ${Platform.canFull ? `<div class="orow"><span class="k">📱 画面</span><div class="seg one"><button id="fullBtn">${Platform.isFull() ? '全画面をやめる' : '全画面にする'}</button></div></div>` : ''}
      <div class="btns"><button id="crBtn">📜 クレジット</button><button class="main" id="oBack">もどる</button></div></div>`;
    $$('input[type=range]', el).forEach((r) => { const u = () => { r.style.setProperty('--p', r.value + '%'); r.nextElementSibling.textContent = r.value; Options.set(r.dataset.k, r.value / 100); Audio2.refresh(); }; r.oninput = u; u(); });
    $$('.seg[data-key]', el).forEach((g) => $$('button', g).forEach((b) => (b.onclick = () => { $$('button', g).forEach((x) => x.classList.remove('on')); b.classList.add('on'); let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : +v; Options.set(g.dataset.key, v); if (g.dataset.key === 'speed' && G) G.uiSpeed = v; })));
    const fb = $('#fullBtn', el); if (fb) fb.onclick = async () => { await Platform.toggle(); setTimeout(() => { fb.textContent = Platform.isFull() ? '全画面をやめる' : '全画面にする'; }, 300); };
    $('#crBtn', el).onclick = () => credits();
    $('#oBack', el).onclick = () => App.show(from || 'title');
    $('#gear', el).onclick = () => { taps++; if (taps >= 30) { taps = 0; Debug.open(); } };
  },
};
function credits() {
  const box = Popup.show(`<h2>📜 クレジット</h2>
    <div class="cr"><span class="k">ゲームデザイン・制作</span><span>のち（まなび堂）</span></div>
    <div class="cr"><span class="k">音楽</span><span>MusMus<small>https://musmus.main.jp/</small></span></div>
    <div class="cr"><span class="k">効果音</span><span>効果音ラボ<small>https://soundeffect-lab.info/</small></span></div>
    <div class="cr"><span class="k">フォント</span><span>M PLUS Rounded 1c<small>SIL Open Font License 1.1</small></span></div>
    <div class="cr"><span class="k">QRコード</span><span>QR Code Generator（Kazuhiko Arase）<small>MIT License</small></span></div>
    <div class="cr"><span class="k">統計データ</span><span>文部科学省・厚生労働省・総務省・警察庁ほか<small>ゲーム内のデータ表示に出典を記載</small></span></div>
    <div class="cr"><span class="k">AIと仕事の予想</span><span>野村総合研究所×オックスフォード大学（2015）／世界経済フォーラム（2025）</span></div>
    <div class="cr"><span class="k">開発協力</span><span>Claude（Anthropic）</span></div>
    <button class="main close" id="crX">とじる</button>`, 'crbox');
  $('#crX', box).onclick = () => Popup.close();
}
const Debug = {
  open() {
    const has = !!G && G.alive;
    const F = [['academic', '📚 学力'], ['stress', '😣 ストレス'], ['social', '🤝 人間関係'], ['health', '❤️ 健康'], ['happiness', '😊 満足感']];
    const box = Popup.show(`<h2>🛠️ デバッグ</h2>
      ${has ? `<div class="dbg">${F.map(([k, l]) => `<label>${l}<input type="number" min="0" max="100" data-s="${k}" value="${Math.round(G.stats[k])}"></label>`).join('')}
        <label>👛 所持金（万円）<input type="number" data-c="cash" value="${Math.round(G.cash)}"></label>
        <label>🎂 年齢<input type="number" min="0" max="104" data-c="age" value="${G.age}"></label></div>
        <div class="list"><button class="main" id="dbSave">数値を変える</button><button id="dbDel">🗑️ セーブデータを削除</button></div>`
        : '<p class="dnote">いまは生きている人生がありません。</p><div class="list"><button id="dbHist">🗑️ これまでの人生を削除</button><button id="dbNo" disabled>—</button></div>'}
      <p class="dnote">フラグやイベントの状態はさわりません。</p>
      <button class="close" id="dbX">とじる</button>`, 'mbox dbgbox');
    $('#dbX', box).onclick = () => Popup.close();
    const sv = $('#dbSave', box);
    if (sv) sv.onclick = () => {
      $$('[data-s]', box).forEach((i) => (G.stats[i.dataset.s] = clamp(+i.value || 0, 0, 100)));
      G.cash = +$('[data-c=cash]', box).value || 0;
      const a = clamp(Math.round(+$('[data-c=age]', box).value || 0), 0, 104);
      if (a !== G.age) { G.year += a - G.age; G.age = a; }
      save(); Popup.close(); toast('数値を変えました');
    };
    const dl = $('#dbDel', box);
    if (dl) dl.onclick = () => Popup.confirm('セーブデータを削除します。いまの人生は消えて、もどせません。', '削除する', (y) => { if (y) { deleteLife(); toast('セーブデータを削除しました'); App.show('title'); } else Debug.open(); });
    const dh = $('#dbHist', box);
    if (dh) dh.onclick = () => Popup.confirm('これまでの人生の記録をすべて削除します。', '削除する', (y) => { if (y) { Store.del('history'); toast('削除しました'); App.show('title'); } else Debug.open(); });
  },
};
