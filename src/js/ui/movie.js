'use strict';
// ===== 人生ふり返りムービー（息をひきとった → ここ → リザルト） =====
// 白い背景に、左は大事なできごと（10行くらい）がふんわり浮かぶ。右は、その時の顔グラと場面の背景がじんわり変わる。
// タップ（クリック）で次の行へ早送り。最後に「リザルトへ ▶」。BGMはリザルトと同じ曲を先に流す（地続き）。
const LifeMovie = (() => {
  const STEP_MS = 2300; // 1行ごとの間
  const MAX = 11; // 左に出す行の数のめやす
  const BG = (id) => { const V = D().visuals; return (V.backgrounds.find((b) => b.id === id) || V.backgrounds[0]).file; };
  const clean = (t, key) => {
    const segs = String(t || '').split(/[。！!]/).map((x) => x.trim()).filter(Boolean);
    const s = (key && segs.find((x) => key.test(x))) || segs[0] || '';
    return s.replace(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u, '').replace(/[！!]+$/, '');
  };
  function jobBg(label) {
    const V = D().visuals; const j = (D().jobs.jobs || []).concat(D().jobs.partTimeJobs || []).find((x) => x.label === label);
    if (!j) return 'bg_office';
    return V.byJobOverride[j.id] || V.byJobCat[j.cat] || 'bg_office';
  }
  // ライフイベントを集める。must=必ず入れる（進学・就職・結婚・出産・孫・自分の死）
  function items(g) {
    const L = g.log || [];
    const out = [];
    const add = (o) => out.push({ pri: 0, ord: out.length, ...o });
    const type = g.happinessType || 'hp_self';
    const want = (types) => (types.includes(type) ? 3 : 1);
    add({ age: 0, text: `${Fam.prefName(g.birthPref || g.pref)}に生まれた`, face: 0, bg: 'bg_home', must: true });
    // 好きなこと・趣味
    const hb = (g.hobbies || []).map((id) => Menu.hobby(id)).filter(Boolean)[0];
    if (hb) { const lk = L.find((p) => p.id === 'ev_m_like_6' || p.id === 'ev_r_new_hobby'); add({ age: lk ? lk.age : 8, text: `${hb.emoji} ${hb.label.replace(/（.*）/, '')}が好きだった`, bg: 'bg_home', pri: want(['hp_self']) + 0.5 }); }
    // 進学
    const hs = L.find((p) => p.id === 'ev_m_hs_entry');
    if (hs) add({ age: hs.age, text: clean(hs.t, /入学/), face: 15, bg: 'bg_secondary', must: true });
    for (const p of L.filter((x) => x.id === 'ev_m_post_entry' || x.id === 'ev_m_post_entry2').slice(0, 2)) add({ age: p.age, text: clean(p.t, /入学/), face: 20, bg: /海外|留学/.test(p.t) ? 'bg_abroad' : 'bg_univ', must: true });
    // はじめての恋人
    const love = L.find((p) => /付き合うことになった|OKをもらった|いい人と出会えた|付き合い始め/.test((p.t || '') + (p.chosen || '')));
    if (love) add({ age: love.age, text: love.age < 18 ? '初めての恋をした' : '大切な人と付き合い始めた', bg: 'bg_street', pri: want(['hp_people', 'hp_family']) + 0.3 });
    // 就職
    const fj = L.find((p) => p.id === 'ev_m_first_job');
    const jr = (g.jobRecord || []).filter((x) => x.l !== '引退');
    if (fj) add({ age: fj.age, text: clean(fj.t, /働き始めた/), bg: jobBg(jr[0] && jr[0].l), must: true });
    else if (jr.length) add({ age: jr[0].a ?? 22, text: `${jr[0].l}として働き始めた`, bg: jobBg(jr[0].l), must: true });
    // 転職（2つ目の仕事）
    if (jr[1]) add({ age: jr[1].a ?? 35, text: /継ぐ/.test(jr[1].l) ? '家業を継いだ' : `${jr[1].l}に仕事を変えた`, bg: jobBg(jr[1].l), pri: want(['hp_self', 'hp_money']) });
    // 昇進（いちばん上まで）
    const pr = L.filter((p) => p.id === 'ev_m_promotion' && /になった/.test(p.t || '')).pop();
    if (pr) add({ age: pr.age, text: clean(pr.t, /になった/), bg: jobBg(((pr.t || '').match(/^(.+?)として/) || [])[1] || (jr[0] && jr[0].l)), pri: want(['hp_money', 'hp_self']) + 0.2 });
    // 資格
    const ql = L.find((p) => /に合格/.test(p.t || '') && p.e === '📜');
    if (ql) add({ age: ql.age, text: clean(ql.t, /合格/), bg: 'bg_lab', pri: want(['hp_self']) });
    // 結婚
    for (const p of L.filter((x) => /と結婚した/.test(x.t || '')).slice(0, 2)) add({ age: p.age, text: clean(p.t, /結婚/), bg: 'bg_home', must: true });
    // 子どもの誕生
    for (const p of L.filter((x) => x.id === 'ev_f_childbirth').slice(0, 3)) add({ age: p.age, text: clean(p.t, /生まれた/).replace(/^\d+年\d+月、/, ''), bg: 'bg_home', must: true });
    // 家を買った・旅行
    const done = (p) => !p.chosen && !/[？?]$/.test(p.t || '');
    const house = L.find((p) => done(p) && /家を買った|家を建てた|マイホームを(買|手に入)/.test(p.t || ''));
    if (house) add({ age: house.age, text: clean(house.t, /家|マイホーム/), bg: 'bg_home', pri: want(['hp_family', 'hp_money']) });
    const trip = L.find((p) => done(p) && /旅行に行った/.test(p.t || ''));
    if (trip) add({ age: trip.age, text: clean(trip.t, /旅行/), bg: /海外/.test(trip.t) ? 'bg_plane' : 'bg_nature', pri: want(['hp_family', 'hp_people']) });
    // 同窓会・ボランティアなど（人とのかかわり）
    const yes = (p) => p.chosen && !/行かない|ことわ|断|やめ|しない|今はいい|見送/.test(p.chosen);
    const ppl = L.find((p) => yes(p) && ['ev_r_reunion', 'ev_r_volunteer', 'ev_r_pta'].includes(p.id));
    if (ppl) add({ age: ppl.age, text: { ev_r_reunion: '同窓会でなつかしい友だちと再会した', ev_r_volunteer: '地域のボランティア活動を始めた', ev_r_pta: 'PTAの役員をひきうけた' }[ppl.id], bg: 'bg_street', pri: want(['hp_people']) });
    // お金がいちばん多かったとき
    if (g.hist && g.hist.cash) { const c = g.hist.cash; let mi = 0; c.forEach((v, i) => { if (v > (c[mi] ?? -1e9)) mi = i; }); if (c[mi] > 100) add({ age: mi, text: `財産がいちばん多くなった（${man(c[mi])}万円）`, bg: 'bg_hq', pri: want(['hp_money']) - 0.2 }); }
    // 孫
    const gk = L.find((p) => p.id === 'ev_f_grandchild');
    if (gk) add({ age: gk.age, text: clean(gk.t, /生まれた|なった/).replace(/^(.+?)に子どもが生まれた$/, '初めての孫が生まれた（$1の子ども）'), bg: 'bg_home', must: true });
    // 自分の死
    const cause = g.deathCause || '病気';
    const cz = { 老衰: '老衰で', 病気: '病気で', 事故: '事故で', '病気（がん）': 'がんで', '病気（心臓）': '心臓の病気で', '病気（脳卒中）': '脳卒中で' }[cause] || `${cause}で`;
    add({ age: g.age, text: `${cz}、息をひきとった`, bg: cause === '老衰' ? 'bg_home' : 'bg_hospital', must: true, last: true });
    // 必ず入れるもの＋幸せのタイプで選んだもの → 年齢順
    const must = out.filter((x) => x.must);
    const opt = out.filter((x) => !x.must).sort((a, b) => b.pri - a.pri);
    const pickN = Math.max(0, MAX - must.length);
    const list = must.concat(opt.slice(0, pickN)).sort((a, b) => (a.last ? 1 : 0) - (b.last ? 1 : 0) || a.age - b.age || a.ord - b.ord);
    return list.map((x) => ({ ...x, faceSrc: faceFile(g.gender, x.face ?? x.age), bgSrc: asset(BG(x.bg)) }));
  }

  function show(done) {
    const ov = $('#pop2');
    const L = items(G);
    Audio2.bgm('result'); // リザルトと同じ曲（リザルトに入っても流れ続ける）
    ov.className = 'ov on movie';
    ov.innerHTML = `<div class="mv"><div class="mvl"><div class="mvh">${esc(G.surname)} ${esc(G.given)}の人生</div><div class="mvlist">${L.map((x, i) => `<div class="mvr" data-i="${i}"><span class="ag num">${x.age}歳</span><span class="tx">${esc(x.text)}</span></div>`).join('')}</div></div>
      <div class="mvp"><div class="lay a"><img class="bgi" alt=""><img class="fc" alt=""></div><div class="lay b"><img class="bgi" alt=""><img class="fc" alt=""></div></div>
      <div class="mvtap">タップ（クリック）で早送り</div><button class="main mvgo" id="mvGo">リザルトへ ▶</button></div>`;
    let i = -1, t = 0, front = 'a', ended = false;
    const lay = (k) => $('.lay.' + k, ov);
    const setPic = (x) => {
      const back = front === 'a' ? 'b' : 'a'; const el = lay(back);
      $('.bgi', el).src = x.bgSrc; $('.fc', el).src = x.faceSrc;
      el.classList.add('on'); lay(front).classList.remove('on'); front = back;
    };
    const finish = () => { ended = true; clearTimeout(t); $$('.mvr', ov).forEach((r) => r.classList.add('on')); $('.mvtap', ov).style.display = 'none'; $('#mvGo', ov).classList.add('on'); };
    const step = () => {
      clearTimeout(t);
      i++;
      if (i >= L.length) { finish(); return; }
      const r = $(`.mvr[data-i="${i}"]`, ov); r.classList.add('on');
      setPic(L[i]);
      t = setTimeout(step, i === L.length - 1 ? 2600 : STEP_MS);
    };
    ov.onclick = (ev) => { if (ended || ev.target.id === 'mvGo') return; step(); };
    $('#mvGo', ov).onclick = (ev) => { ev.stopPropagation(); clearTimeout(t); ov.className = 'ov'; ov.innerHTML = ''; ov.onclick = null; done && done(); };
    t = setTimeout(step, 700);
  }
  return { show, items };
})();
