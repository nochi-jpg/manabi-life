'use strict';
// ===== ポップアップ（選択肢・結果・通知表・家族・支出・メニュー・一覧） =====
// 候補が多いときは、1ページ8個まで。左右のボタンでページを送る（スクロールしない）
const Popup = (() => {
  const ov = () => $('#pop');
  let open = false;
  const PER = 8;
  const COUNSEL = { parents: '👪 家族で話し合い', parents_teacher: '🧑‍🏫 先生と親からの提案', teacher: '🧑‍🏫 先生から', self: '💭 自分で決める', spouse: '💑 パートナーと', family: '👨‍👩‍👧 家族と' };
  const rc = (r) => (r >= 70 ? 'hi' : r >= 40 ? 'mid' : 'lo');
  function show(html, cls = 'cbox') {
    const o = ov();
    o.innerHTML = `<div class="box ${cls}">${html}</div>`;
    o.classList.add('on'); open = true;
    return $('.box', o);
  }
  function close() { ov().classList.remove('on'); ov().innerHTML = ''; open = false; }
  const splitEmoji = (s) => { const m = String(s || '').match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*(.*)$/u); return m ? [m[1], m[2]] : ['・', s || '']; };
  function btnHtml(e, name, sub, rate) {
    return `<span class="oe">${e}</span><span class="on2">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${rate != null ? `<span class="rate ${rc(rate)}">${rate}%</span>` : ''}`;
  }
  // ページ送りの帯（1ページなら出さない）
  function pagerHtml(page, pages, id = 'p') {
    if (pages <= 1) return '';
    return `<div class="pager"><button id="${id}Prev" ${page ? '' : 'disabled'}>◀ まえ</button><span class="pdots">${Array.from({ length: pages }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}<b class="num">${page + 1} / ${pages}</b></span><button id="${id}Next" ${page < pages - 1 ? '' : 'disabled'}>つぎ ▶</button></div>`;
  }
  function bindPager(box, id, get, set) { const a = $('#' + id + 'Prev', box), b = $('#' + id + 'Next', box); if (a) a.onclick = () => set(get() - 1); if (b) b.onclick = () => set(get() + 1); }
  const factHtml = (f) => (f ? `<div class="src"><span>📊</span><span>${esc(f.text)}<small>（${esc(f.src)}）</small></span></div>` : '');

  // ---- 選択肢イベント ----
  // view.opts: [{i, label, rate} | {i, menu:true, items:[...], label?}]
  function choice(view, cb) {
    if (view.type === 'lessons') return lessons(view, cb);
    const entries = [];
    for (let k = 0; k < view.opts.length; k++) {
      const o = view.opts[k];
      if (o.menu && o.label) entries.push({ k, sub: true, label: o.label, o });
      else if (o.menu) o.items.forEach((it) => entries.push({ k, item: it, o }));
      else entries.push({ k, label: o.label, rate: o.rate });
    }
    let page = 0, subOpen = null, sort = 'def';
    const report = view.popup === 'reportCard' && G.reports.length ? G.reports[G.reports.length - 1] : null;
    const payOf = (x) => { const m = String((x.item && x.item.sub) || '').match(/年収 約?(\d+)/); return m ? +m[1] : 0; };
    function render() {
      let list = subOpen ? subOpen.o.items.map((it) => ({ k: subOpen.k, item: it, o: subOpen.o })) : entries.slice();
      const canSort = list.length > PER && list.some((x) => x.item && x.item.rate != null);
      const canPay = canSort && list.some((x) => payOf(x) > 0);
      if (sort === 'rate') list.sort((a, b) => ((b.item || b).rate ?? -1) - ((a.item || a).rate ?? -1));
      if (sort === 'pay') list.sort((a, b) => payOf(b) - payOf(a));
      const pages = Math.max(1, Math.ceil(list.length / PER));
      page = clamp(page, 0, pages - 1);
      const vis = list.slice(page * PER, page * PER + PER);
      const btns = `<div class="opts">${vis.map((x, n) => {
        if (x.item) return `<button data-n="${n}" class="${x.item.rate == null ? 'norate' : ''}">${btnHtml(x.item.emoji, x.item.name, x.item.sub, x.item.rate)}</button>`;
        const [e, l] = splitEmoji(x.label);
        return `<button data-n="${n}" class="${x.rate == null ? 'norate' : ''}">${btnHtml(e, l + (x.sub ? ' ▶' : ''), '', x.rate)}</button>`;
      }).join('')}${subOpen ? '<button class="back2" id="pBack">◀ もどる</button>' : ''}</div>`;
      const sorter = canSort ? `<div class="flt"><button data-sort="def" class="${sort === 'def' ? 'on' : ''}">おすすめ順</button><button data-sort="rate" class="${sort === 'rate' ? 'on' : ''}">🎯 受かりやすい順</button>${canPay ? `<button data-sort="pay" class="${sort === 'pay' ? 'on' : ''}">💴 年収が高い順</button>` : ''}</div>` : '';
      let box;
      if (report) {
        box = show(`<div class="pleft">${paperHtml(report)}</div><div class="pright"><div class="q">${esc(view.text.replace(/^\d+年3月。通知表が配られた。/, ''))}<small>選んだ方針で、1年間のステータスの伸び方が変わります</small></div>
          ${btns.replace('class="opts"', 'class="opts one"')}${pagerHtml(page, pages)}${factHtml(view.fact)}</div>`, 'paper');
      } else {
        box = show(`
          <div class="cs">${COUNSEL[view.counselor] || '💭 どうする？'}</div>
          <div class="top"><div class="who">${view.emoji || '💭'}</div>
            <div><div class="ttl">${esc(view.date)} ・ ${esc(view.ageLabel)}</div><div class="txt">${esc(view.text)}</div></div>${sorter}</div>
          ${btns}${pagerHtml(page, pages)}${factHtml(view.fact)}`);
      }
      $$('[data-n]', box).forEach((b) => (b.onclick = () => pickEntry(vis[+b.dataset.n])));
      $$('[data-sort]', box).forEach((b) => (b.onclick = () => { sort = b.dataset.sort; page = 0; render(); }));
      bindPager(box, 'p', () => page, (v) => { page = v; render(); });
      const bk = $('#pBack', box); if (bk) bk.onclick = () => { subOpen = null; page = 0; render(); };
    }
    function pickEntry(x) {
      if (x.sub) { subOpen = x; page = 0; render(); return; }
      if (x.item && x.item.job && Detail.enabled) { Detail.job(x.item, () => commit(x), () => render()); return; }
      if (x.item && Detail.enabled && Detail.isSchool(x.item)) { Detail.school(x.item, () => commit(x), () => render()); return; }
      commit(x);
    }
    function commit(x) {
      close();
      const res = view.ev === '__menuNext' ? Engine.chooseMenuNext(x.item) : Engine.choose(x.k, x.item || null);
      cb(res);
    }
    render();
  }

  // ---- 選んだ結果（どうなった？） ----
  function result(r, cb) {
    const st = r.ok === true ? 'ok' : r.ok === false ? 'ng' : 'info';
    const ic = r.ok === true ? '✅' : r.ok === false ? '🍂' : '💡';
    const box = show(`<div class="cs">💡 どうなった？</div>
      <div class="top"><div class="who">${r.emoji || '💭'}</div><div><div class="ttl">${esc(r.date)} ・ ${esc(r.ageLabel)}</div><div class="txt">${esc(String(r.text).replace(/（.*$/, ''))}</div></div></div>
      <div class="picked">選んだ：${esc(r.chosen)}${r.rate != null ? `<small>（うまくいく確率 ${r.rate}%）</small>` : ''}</div>
      <div class="outc ${st}"><span class="oi">${ic}</span><p>${esc(r.res)}</p></div>
      <div class="fxl">${Main.fxHtml(r.fx)}</div>
      <div class="nx"><button class="main" id="rNx">つぎへ ▶</button></div>`, 'cbox rbox');
    $('#rNx', box).onclick = () => { close(); cb(); };
  }

  // ---- 通知表（紙） ----
  const num3 = (v) => (typeof v === 'number' ? v : v === '◎' ? 3 : v === '〇' ? 2 : 1);
  function rowsOf(r) {
    if (r.rows) return r.rows;
    return Object.entries(r.grades).map(([l, v]) => ({ l, e: '📘', v, cm: '', tr: 0 }));
  }
  function paperHtml(r) {
    const cls = (v) => (r.kind === 3 ? (v === '◎' ? 's2' : v === '〇' ? 's1' : 's0') : v >= 5 ? 's2' : v >= 3 ? 's1' : 's0');
    const legend = r.kind === 3 ? '<span><b class="s2">◎</b> よくできる</span><span><b class="s1">〇</b> できる</span><span><b class="s0">△</b> もう少し</span>' : '<span><b class="s2">5</b> たいへんよい</span><span><b class="s1">4・3</b> よい・ふつう</span><span><b class="s0">2・1</b> がんばろう</span>';
    return `<div class="phd"><span class="t">通知表</span><span class="g">${r.year}年3月　${esc(r.gradeLabel.replace(/^(\D+)(\d)年$/, '$1$2年生'))}</span><span class="n">${esc(G.surname)} ${esc(G.given)}</span></div>
      <div class="tr th"><span>教科</span><span>${r.kind === 3 ? '評価' : '評定'}</span><span></span><span>先生から</span></div>
      ${rowsOf(r).map((x) => `<div class="tr"><span>${x.e} ${esc(x.l)}</span><span class="ev ${cls(x.v)}">${x.v}</span><span class="${x.tr > 0 ? 'up' : x.tr < 0 ? 'dn' : ''}">${x.tr > 0 ? '▲' : x.tr < 0 ? '▼' : ''}</span><span>${esc(x.cm || '')}</span></div>`).join('')}
      <div class="legend">${legend}<span><b class="up">▲</b>▼ 去年とくらべて</span></div>
      <div class="foot">${r.att ? `<div class="kv"><span class="k">📅 出席</span><span>${esc(r.att)}</span></div>` : ''}${r.club ? `<div class="kv"><span class="k">⚽ 部活・習い事</span><span>${esc(r.club)}</span></div>` : ''}<div class="kv"><span class="k">✏️ 先生から</span><span>${esc(r.comment)}</span></div></div>`;
  }
  function reviewHtml(r, prev) {
    const L = [['academic', '📚', '学力', 'c-blue'], ['stress', '😣', 'ストレス', 'c-red'], ['social', '🤝', '人間関係', 'c-mint'], ['health', '❤️', '健康', 'c-pink'], ['happiness', '😊', '満足感', 'c-gold']];
    const p0 = r.prevSt || (prev && prev.st) || null;
    const rows = r.st ? L.map(([k, e, l, c]) => { const v = r.st[k], d = p0 ? v - p0[k] : null; const good = d == null ? '' : (k === 'stress' ? d < 0 : d > 0) ? 'p' : d === 0 ? '' : 'm'; return `<div class="r"><span>${e}</span><span>${l}</span><span class="bar ${c}"><i style="--w:${v}%"></i></span><span class="d ${good}">${v}${d == null ? '' : `（${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}）`}</span></div>`; }).join('') : '<div class="r"><span></span><span>記録なし</span></div>';
    return `<div class="q">この1年のふり返り<small>${r.year - 1}年4月 → ${r.year}年3月${r.school ? '　' + esc(r.school) : ''}</small></div><div class="rv">${rows}</div>
      <div class="evs"><div><small>📌 方針</small><span>${esc(r.focus ? Menu.focusLabel(r.focus) : '—')}</span></div><div><small>🗓️ 出来事</small><span>${esc((r.evs || []).join('・') || '—')}</span></div></div>`;
  }
  // 右下の「通知表」から：過去の通知表を見返す
  function reports(done) {
    const R = G.reports; if (!R.length) { done && done(); return; }
    let i = R.length - 1;
    const render = () => {
      const r = R[i];
      const lab = (x) => (x ? x.gradeLabel.replace(/年生$/, '').replace(/^小学/, '小').replace(/^中学/, '中').replace(/^高校/, '高') : '');
      const box = show(`<button class="x" id="rpX">✕</button><div class="pleft">${paperHtml(r)}</div><div class="pright">${reviewHtml(r, R[i - 1])}
        <div class="pager"><button id="rpPrev" ${i ? '' : 'disabled'}>◀ ${esc(lab(R[i - 1]))}</button><span class="pdots">${R.length <= 6 ? R.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('') : ''}<b class="num">${i + 1} / ${R.length}</b></span><button id="rpNext" ${i < R.length - 1 ? '' : 'disabled'}>${esc(lab(R[i + 1]))} ▶</button></div></div>`, 'paper');
      $('#rpX', box).onclick = () => { close(); done && done(); };
      $('#rpPrev', box).onclick = () => { i--; render(); }; $('#rpNext', box).onclick = () => { i++; render(); };
    };
    render();
  }

  // ---- 習い事を続ける？・増やす（ui/lessons.html） ----
  function lessons(view, cb) {
    const keep = {}; view.items.forEach((x) => (keep[x.id] = !x.quit));
    const render = () => {
      const cost = view.items.filter((x) => keep[x.id]).reduce((a, x) => a + x.cost, 0);
      const n = view.items.filter((x) => keep[x.id]).length;
      const box = show(`<div class="cs">🎒 ${esc(view.date)} ・ ${esc(view.ageLabel)}</div>
        <div class="q">${esc(view.text)}<small>${esc(view.note)}</small></div>
        <div class="ls">${view.items.map((x) => `<div class="l"><span class="e">${x.emoji}</span><span class="n">${esc(x.label)}<small>${x.years}年目 ・ 年${x.cost}万円 ・ ${esc(x.eff)}</small></span>
          <button data-k="${x.id}" data-v="1" class="${keep[x.id] ? 'on' : ''}">続ける</button><button data-k="${x.id}" data-v="0" class="q2 ${keep[x.id] ? '' : 'on'}">やめる</button></div>`).join('')}</div>
        <div class="sum"><span>💡</span><span>続けると：<b>年${cost}万円</b>（${G.age < 16 ? '家計から' : '所持金から'}）${view.cap ? `　家計で出せるめやす：年${view.cap}万円まで` : ''}</span></div>
        <div class="lbtns"><button id="lAdd" ${n >= 4 ? 'disabled' : ''}>＋ 習い事を増やす（${n}/4）</button><button class="ok main" id="lOk">これで決める ▶</button></div>`, 'lbox');
      $$('[data-k]', box).forEach((b) => (b.onclick = () => { keep[b.dataset.k] = b.dataset.v === '1'; render(); }));
      $('#lOk', box).onclick = () => { close(); cb(Engine.chooseLessons(keep)); };
      $('#lAdd', box).onclick = () => picker({ title: '🎒 習い事を増やす', note: '増やすほどストレスも増えます（4つまで）', items: Engine.lessonCandidates() }, (it) => {
        if (!it) { render(); return; }
        const r = Engine.addLesson(it.id, keep);
        if (!r.ok) { info('🎒 習い事を増やす', r.msg, render); return; }
        view.items.push({ ...r.item, quit: false }); keep[it.id] = true; render();
      });
    };
    render();
  }

  // ---- 1ページ8個の候補リスト（重点方針・習い事・趣味など） ----
  function picker({ title, note, items, cur }, cb) {
    let page = 0;
    function render() {
      const pages = Math.max(1, Math.ceil(items.length / PER));
      page = clamp(page, 0, pages - 1);
      const vis = items.slice(page * PER, page * PER + PER);
      const box = show(`<div class="cs">${esc(title)}</div>
        <div class="top"><div class="who">${splitEmoji(title)[0]}</div><div><div class="ttl">${cur ? `いま：${esc(cur)}` : ''}</div><div class="txt">${esc(note || '')}</div></div></div>
        <div class="opts">${vis.length ? vis.map((it, n) => `<button data-n="${n}" class="${it.rate == null ? 'norate' : ''} ${it.on ? 'on' : ''}">${btnHtml(it.emoji, it.name || it.label, it.sub, it.rate)}</button>`).join('') : '<button class="back2" disabled>えらべるものがありません</button>'}</div>
        ${pagerHtml(page, pages)}<div class="nx"><button id="pkX">◀ もどる</button></div>`);
      $$('[data-n]', box).forEach((b) => (b.onclick = () => { close(); cb(vis[+b.dataset.n]); }));
      bindPager(box, 'p', () => page, (v) => { page = v; render(); });
      $('#pkX', box).onclick = () => { close(); cb(null); };
    }
    render();
  }
  function menu({ title, note, items, cur }, cb) {
    picker({ title: '🧭 ' + title, note, items: items.map((it) => ({ ...it, on: it.id === cur })), cur: Menu.focusLabel(cur) }, cb);
  }

  // ---- 家族の人物カード ----
  function person(list, i, done) {
    const render = () => {
      const p = list[i]; if (!p) { done && done(); return; }
      const job = Fam.statusLabel(p);
      const pr = Fam.prefName(p.pref) || '—';
      const sp = p.role === 'spouse' && G.flags.married ? `・結婚${Math.max(1, G.year - (G.vars.marriedYear ?? G.year) + 1)}年目${G.flags.separated ? '（別居中）' : ''}` : '';
      const hbar = (v, c) => `<span class="bar ${c}"><i style="--w:${clamp(v, 0, 100)}%"></i></span>`;
      const inc = p.income > 0 ? `${man(p.income)}万円${p.employment === 'retired' ? '（年金）' : ''}${p.together ? '<span class="chip gy">世帯年収にふくむ</span>' : ''}` : 'なし';
      const box = show(`<button class="x" id="psX">✕</button><div class="cs">👪 家族</div>
        <div class="pcard"><div class="pic" style="background-image:url(${asset(bgFor(p))})"><img src="${faceFile(p.gender, p.age)}" alt=""></div>
        <div><div class="nm"><span class="pn">${esc(p.role === 'grandparent' ? Fam.callName(p) : p.name || roleLabel(p))}</span><small>${esc(roleLabel(p))}${p.alive ? ` ・ ${p.age}歳` : ''}${sp}</small></div>
          ${p.alive ? `<div class="kv"><span class="k">🏠 住まい</span><span>${esc(pr)} ${p.together ? '<span class="chip">同居</span>' : '<span class="chip gy">別居</span>'}${p.inFacility ? '<span class="chip gy">介護施設</span>' : ''}</span></div>
          <div class="kv"><span class="k">💼 くらし</span><span>${esc(job)}${p.jobPref && p.jobPref !== p.pref && Fam.isWorking(p) ? `（職場：${esc(Fam.prefName(p.jobPref))}）` : ''}</span></div>
          <div class="kv"><span class="k">💴 年収</span><span class="num">${inc}</span></div>
          <div class="kv"><span class="k">🏦 資産</span><span class="num">${p.assets > 0 ? `${man(p.assets)}万円くらい${p.together ? '<span class="chip gy">世帯の資産</span>' : ''}` : 'ほとんどない'}</span></div>
          <div class="kv"><span class="k">❤️ 健康</span><span>${hbar(p.health ?? 80, 'c-pink')} ${Math.round(p.health ?? 80)} ・ ${esc(p.illness ? p.illness : '大きな病気なし')}</span></div>
          <div class="kv"><span class="k">🤲 介護</span><span>${p.careLevel ? `要介護${p.careLevel}` : '必要なし'}</span></div>
          <div class="kv"><span class="k">🤝 関係</span><span>${hbar(p.relation, 'c-mint')} ${Math.round(p.relation)}</span></div>`
          : `<div class="kv"><span class="k">🕊️</span><span>${p.diedYear || ''}年に${p.diedAge || ''}歳で亡くなった</span></div>`}
          <div class="pager"><button id="psPrev" ${i ? '' : 'disabled'}>◀ 前の人</button><span class="pdots"><b class="num">${i + 1} / ${list.length}</b></span><button id="psNext" ${i < list.length - 1 ? '' : 'disabled'}>次の人 ▶</button></div></div></div>`, 'cbox pbox');
      $('#psX', box).onclick = () => { close(); done && done(); };
      $('#psPrev', box).onclick = () => { i--; render(); }; $('#psNext', box).onclick = () => { i++; render(); };
    };
    render();
  }
  function bgFor(p) {
    const V = D().visuals; const B = (id) => (V.backgrounds.find((b) => b.id === id) || V.backgrounds[0]).file;
    if (p.age < 6 || p.employment === 'retired' || p.employment === 'homemaker' || !Fam.isWorking(p)) return B(p.age >= 6 && p.age < 12 ? 'bg_elem' : p.age >= 12 && p.age < 18 ? 'bg_secondary' : 'bg_home');
    const j = p.job && Menu.job(p.job);
    return B((j && (V.byJobOverride[j.id] || V.byJobCat[j.cat])) || 'bg_office');
  }

  // ---- 月の支出（生活レベル・趣味・保険を変える） ----
  function expenses(done) {
    const render = () => {
      const ex = Econ.expenses(); const n = Econ.netIncomeYear();
      const m = (y) => round1(y / 12).toFixed(1);
      const items = ex.items.slice(0, 13);
      const inc = [['💴 自分の手取り', n.self], ['💴 ' + ((person('spouse') || {}).name || '配偶者') + 'の手取り', n.spouse], ['👶 児童手当', n.allowance], ['📄 養育費（受け取り）', n.support], ['🏢 家賃収入', n.rent]].filter(([, v]) => v > 0.5);
      if (G.flags.welfare) inc.push(['🏛️ 生活保護', Econ.welfareQ() * 4]);
      const totIn = inc.reduce((a, [, v]) => a + v, 0);
      const left = (totIn - ex.total) / 12;
      const lv = Econ.lifeLevel();
      const box = show(`<button class="x" id="exX">✕</button><div class="cs">🧾 月の支出</div>
        <div class="exp"><div class="el">${items.map((x) => `<div class="li"><span>${x.e}</span><span>${esc(x.l)}<small>${esc(x.note || '')}</small></span><span class="a num">${m(x.y)}万</span></div>`).join('')}
          <div class="li tot"><span>🧾</span><span>合計（月）</span><span class="a num">${m(ex.total)}万</span></div></div>
        <div><div class="bal">${inc.map(([l, v]) => `<div class="li"><span>${esc(l)}</span><b class="num">${m(v)}万</b></div>`).join('')}<div class="li"><span>🧾 支出</span><b class="num">−${m(ex.total)}万</b></div>
          <div class="li big ${left < 0 ? 'neg' : ''}"><span>毎月のこる</span><b class="num">${left >= 0 ? '＋' : '−'}${round1(Math.abs(left)).toFixed(1)}万</b></div></div>
          <div class="sub">🎚️ 生活レベル${G.flags.welfare ? '（生活保護中は「節約」）' : ''}</div>
          <div class="lvb">${Object.entries(Econ.LEVELS).map(([k, L]) => `<button data-lv="${k}" class="${lv === k ? 'on' : ''}" ${G.flags.welfare ? 'disabled' : ''}>${L.e} ${L.l}<small>${L.d}</small></button>`).join('')}</div>
          <div class="sub">🔧 見直す</div>
          <div class="row2"><button id="exHob">✨ 趣味を変える</button><button id="exIns">🛡️ 保険を変える</button></div>
          <div class="src"><span>📊</span><span>2人以上の世帯の1か月の消費支出は平均で約30万円、ひとり暮らしは約17万円。<small>（総務省 家計調査 2024）</small></span></div></div></div>`, 'cbox xbox');
      $('#exX', box).onclick = () => { close(); done && done(); };
      $$('[data-lv]', box).forEach((b) => (b.onclick = () => { G.vars.lifeLevel = b.dataset.lv; G.vars.autoSave = false; save(); render(); }));
      $('#exHob', box).onclick = () => hobbies(render);
      $('#exIns', box).onclick = () => insurance(render);
    };
    render();
  }
  function hobbies(back) {
    const cur = G.hobbies.map((id) => Menu.hobby(id)).filter(Boolean);
    const box = show(`<div class="cs">✨ 趣味を変える</div>
      <div class="q2">いまの趣味（やめるものを押す）<small>趣味があると満足感が上がり、ストレスが下がります。お金がかかるものもあります</small></div>
      <div class="opts">${cur.map((h) => `<button data-q="${h.id}">${btnHtml(h.emoji, h.label, `${h.cost ? `年${h.cost}万円くらい` : 'お金はほぼかからない'} ・ やめる`, null)}</button>`).join('') || '<button class="back2" disabled>趣味はまだありません</button>'}</div>
      <div class="nx2"><button id="hbAdd" ${cur.length >= 6 ? 'disabled' : ''}>＋ 新しい趣味を始める</button><button class="main" id="hbX">◀ 支出にもどる</button></div>`);
    $$('[data-q]', box).forEach((b) => (b.onclick = () => { G.hobbies = G.hobbies.filter((x) => x !== b.dataset.q); save(); hobbies(back); }));
    $('#hbX', box).onclick = back;
    $('#hbAdd', box).onclick = () => picker({ title: '✨ 新しい趣味', note: '何を始める？', items: Menu.build('clubs.hobbies') }, (it) => { if (it && !G.hobbies.includes(it.id)) G.hobbies.push(it.id); save(); hobbies(back); });
  }
  function insurance(back) {
    const cur = G.flags.cancer_insurance ? 'both' : G.flags.life_insurance ? 'med' : 'none';
    const O = [['none', '🙅', '入らない', '公的な健康保険だけ（月0円）'], ['med', '🛡️', '医療保険', '入院したときにお金が出る（月0.5万円）'], ['both', '🛡️', '医療保険＋がん保険', 'がんの治療にも備える（月0.8万円）']];
    const box = show(`<div class="cs">🛡️ 保険を変える</div><div class="q2">どの保険に入る？<small>日本は健康保険で医療費の自己負担が3割まで。さらに「高額療養費制度」で月の上限があります</small></div>
      <div class="opts">${O.map(([k, e, l, d]) => `<button data-i="${k}" class="norate ${cur === k ? 'on' : ''}">${btnHtml(e, l, d, null)}</button>`).join('')}</div><div class="nx"><button class="main" id="inX">◀ 支出にもどる</button></div>`);
    $$('[data-i]', box).forEach((b) => (b.onclick = () => { const k = b.dataset.i; Effects.setFlag('life_insurance', k !== 'none'); Effects.setFlag('cancer_insurance', k === 'both'); save(); insurance(back); }));
    $('#inX', box).onclick = back;
  }

  // ---- 亡くなったとき ----
  function death(d, cb) {
    Audio2.setDuck && Audio2.setDuck(true);
    const box = show(`<div class="dv">🕊️</div><h2>${d.year}年 ${d.ss}。<br>${esc(d.name)}は${d.age}歳で、${esc(d.fam)}<br>息をひきとった。</h2><p>死因：${esc(d.cause)}</p>
      <div class="sum"><div><small>🎓 学歴</small>${esc(d.edu)}</div><div><small>💼 最後の仕事</small>${esc(d.job)}</div><div><small>👪 家族</small>${esc(d.family)}</div><div><small>👶 孫</small>${d.gks}人</div></div>
      <div class="nx"><button class="main" id="dthOk">リザルトへ ▶</button></div>`, 'death');
    ov().classList.add('dark');
    $('#dthOk', box).onclick = () => { ov().classList.remove('dark'); Audio2.setDuck && Audio2.setDuck(false); close(); cb(); };
  }

  // ---- 小さなポップアップ ----
  function info(title, text, cb) {
    const box = show(`<h2>${esc(title)}</h2><p class="msg">${esc(text)}</p><button class="close main" id="ifX">わかった</button>`, 'mbox');
    $('#ifX', box).onclick = () => { close(); cb && cb(); };
  }
  function list(title, arr) {
    const box = show(`<h2>${esc(title)}</h2><div class="list">${arr.map((x) => `<span>${x}</span>`).join('')}</div><button class="close main" id="lx">とじる</button>`, 'mbox');
    $('#lx', box).onclick = close;
  }
  function confirm(text, okLabel, cb) {
    const box = show(`<h2>${esc(text)}</h2><div class="list"><button id="cN">やめる</button><button class="main" id="cY">${esc(okLabel)}</button></div>`, 'mbox');
    $('#cN', box).onclick = () => { close(); cb(false); };
    $('#cY', box).onclick = () => { close(); cb(true); };
  }
  return { choice, result, reports, paperHtml, menu, picker, person, expenses, death, info, list, confirm, close, isOpen: () => open, show };
})();
