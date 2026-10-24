'use strict';
// ===== ポップアップ（選択肢・メニュー・一覧） =====
const Popup = (() => {
  const ov = () => $('#pop');
  let open = false;
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

  // ---- 選択肢イベント ----
  // view.opts: [{i, label, rate} | {i, menu:true, items:[...], label?}]
  function choice(view, cb) {
    // 1つのリストにまとめる（ふつうの選択肢 → メニューの候補）。6こ以上なら5こずつページ送り
    const entries = [];
    for (let k = 0; k < view.opts.length; k++) {
      const o = view.opts[k];
      if (o.menu && o.label) entries.push({ k, sub: true, label: o.label, o });
      else if (o.menu) o.items.forEach((it) => entries.push({ k, item: it, o }));
      else entries.push({ k, label: o.label, rate: o.rate });
    }
    let page = 0, subOpen = null;
    const report = view.popup === 'reportCard' && G.reports.length ? G.reports[G.reports.length - 1] : null;
    function render() {
      const list = subOpen ? subOpen.o.items.map((it) => ({ k: subOpen.k, item: it, o: subOpen.o })) : entries;
      const per = list.length > 6 ? 5 : 6;
      const pages = Math.max(1, Math.ceil(list.length / per));
      page = page % pages;
      const vis = list.slice(page * per, page * per + per);
      const fact = view.fact ? `<div class="src"><span>📊</span><span>${esc(view.fact.text)}<small>（${esc(view.fact.src)}）</small></span></div>` : '';
      const rep = report ? reportHtml(report) : '';
      const box = show(`
        <div class="cs">${COUNSEL[view.counselor] || '💭 どうする？'}</div>
        <div class="top"><div class="who">${view.emoji || '💭'}</div>
          <div><div class="ttl">${esc(view.date)} ・ ${esc(view.ageLabel)}</div><div class="txt">${esc(view.text)}</div></div></div>
        ${rep}
        <div class="opts">${vis.map((x, n) => {
          if (x.item) return `<button data-n="${n}" class="${x.item.rate == null ? 'norate' : ''}">${btnHtml(x.item.emoji, x.item.name, x.item.sub, x.item.rate)}</button>`;
          const [e, l] = splitEmoji(x.label);
          return `<button data-n="${n}" class="${x.rate == null ? 'norate' : ''}">${btnHtml(e, l + (x.sub ? ' ▶' : ''), '', x.rate)}</button>`;
        }).join('')}
          ${pages > 1 ? '<button class="more" id="pMore">別の候補を見る ▶</button>' : ''}
          ${subOpen ? '<button class="back2" id="pBack">◀ もどる</button>' : ''}</div>
        ${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>` : ''}
        ${fact}`);
      $$('[data-n]', box).forEach((b) => (b.onclick = () => pickEntry(vis[+b.dataset.n])));
      const m = $('#pMore', box); if (m) m.onclick = () => { page++; render(); };
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
  function reportHtml(r) {
    const cls = (v) => (r.kind === 3 ? (v === '◎' ? 's2' : v === '〇' ? 's1' : 's0') : v >= 4 ? 's2' : v >= 3 ? 's1' : 's0');
    return `<div class="repcard"><div class="rh">📋 ${esc(r.gradeLabel)}の通知表</div>
      <div class="rg">${Object.entries(r.grades).map(([k, v]) => `<div><span>${k}</span><b class="${cls(v)}">${v}</b></div>`).join('')}</div>
      <div class="rcm">🧑‍🏫 ${esc(r.comment)}</div></div>`;
  }

  // ---- かんたんなメニュー（重点方針など） ----
  function menu({ title, note, items, cur }, cb) {
    let page = 0;
    function render() {
      const per = items.length > 6 ? 5 : 6;
      const pages = Math.ceil(items.length / per);
      const vis = items.slice(page * per, page * per + per);
      const box = show(`<div class="cs">🧭 ${esc(title)}</div>
        <div class="top"><div class="who">🧭</div><div><div class="ttl">いまの重点方針：${esc(Menu.focusLabel(cur))}</div><div class="txt">${esc(note || '')}</div></div></div>
        <div class="opts">${vis.map((it, n) => `<button data-n="${n}" class="norate ${it.id === cur ? 'on' : ''}">${btnHtml(it.emoji, it.name, it.sub, null)}</button>`).join('')}
        ${pages > 1 ? '<button class="more" id="pMore">ほかの方針 ▶</button>' : ''}<button class="back2" id="pX">とじる</button></div>`);
      $$('[data-n]', box).forEach((b) => (b.onclick = () => { close(); cb(vis[+b.dataset.n]); }));
      const m = $('#pMore', box); if (m) m.onclick = () => { page = (page + 1) % pages; render(); };
      $('#pX', box).onclick = () => { close(); cb(null); };
    }
    render();
  }
  // ---- 一覧（趣味の「+3」など） ----
  function list(title, arr) {
    const box = show(`<h2>${esc(title)}</h2><div class="list">${arr.map((x) => `<span>${x}</span>`).join('')}</div><button class="close main" id="lx">とじる</button>`, 'mbox');
    $('#lx', box).onclick = close;
  }
  function confirm(text, okLabel, cb) {
    const box = show(`<h2>${esc(text)}</h2><div class="list"><button id="cN">やめる</button><button class="main" id="cY">${esc(okLabel)}</button></div>`, 'mbox');
    $('#cN', box).onclick = () => { close(); cb(false); };
    $('#cY', box).onclick = () => { close(); cb(true); };
  }
  return { choice, menu, list, confirm, close, isOpen: () => open, show };
})();

// 職業・学校の詳細（task5 で中身をつくる）
const Detail = { enabled: false, isSchool: () => false };
