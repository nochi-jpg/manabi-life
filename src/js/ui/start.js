'use strict';
// ===== はじめから（ui/start.html）：①性別 ②幸せの基準 ③モード ④名前 =====
Screens.start = {
  enter(el) {
    const E = D().ending, M = D().modes, N = D().names;
    const st = { g: null, hp: null, mode: null, S: null, Gv: null, self: false };
    const pk = (a) => a[Math.floor(Math.random() * a.length)]; // 名前の候補は人生の乱数とは別
    const dots = (n) => `<div class="dots">${[0, 1, 2, 3].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
    el.innerHTML = `
      <div class="step on" id="st1">${dots(1)}
        <div class="q">どちらで 生まれる？<small>あとから変えることはできません</small></div>
        <div class="panel sex" id="sM" data-g="M"><div class="pic" style="background-image:url(${asset('assets/faces/M_20.png')})"></div><div class="l">👦 男の子</div><div class="d">0歳から人生がはじまります</div></div>
        <div class="panel sex" id="sF" data-g="F"><div class="pic" style="background-image:url(${asset('assets/faces/F_20.png')})"></div><div class="l">👧 女の子</div><div class="d">0歳から人生がはじまります</div></div>
      </div>
      <div class="step" id="stH">${dots(2)}
        <div class="q">${esc(E.question.text)}<small>${esc(E.question.note)}</small></div>
        <div class="opts4">${E.question.choices.map((c) => `<button class="pick sq" data-hp="${c.id}"><span class="i">${c.emoji}</span><span>${esc(c.label)}</span></button>`).join('')}</div>
        <button class="back" data-back="st1">◀ もどる</button>
      </div>
      <div class="step" id="stM">${dots(3)}
        <div class="q">${esc(M.question)}<small>あとから変えることはできません</small></div>
        <div class="opts2">${['real', 'gentle'].map((k) => { const m = M.modes[k]; const [ic, ...lb] = m.label.split(' '); return `<button class="pick mode sq" data-mode="${k}"><span class="i">${ic}</span><span class="l">${esc(lb.join(' '))}</span><span class="d">${esc(m.desc)}</span></button>`; }).join('')}</div>
        <button class="back" data-back="stH">◀ もどる</button>
      </div>
      <div class="step" id="st2">${dots(4)}
        <div class="q">名前は？<small>🔀 でべつの名前に。自分で決めることもできます</small></div>
        <div class="panel" id="nm">
          <div class="row"><span class="k">苗字</span><div class="field" id="fS"></div><button class="sh" id="shS">🔀</button></div>
          <div class="row"><span class="k">名前</span><div class="field" id="fG"></div><button class="sh" id="shG">🔀</button></div>
          <div class="full">この名前で生まれます：<b id="full"></b></div>
        </div>
        <div class="stbtns"><button id="self">✏️ 自分で決める</button><button class="main" id="ok">この名前で生まれる ▶</button></div>
        <button class="back" data-back="stM">◀ もどる</button>
      </div>`;
    const go = (id) => { $$('.step', el).forEach((x) => x.classList.toggle('on', x.id === id)); if (id === 'st2') draw(); };
    const readInputs = () => {
      if (!st.self) return;
      const iS = $$('#fS input', el), iG = $$('#fG input', el);
      if (iS.length) st.S = [iS[1].value.trim().slice(0, N.maxLength) || st.S[0], iS[0].value.trim()];
      if (iG.length) st.Gv = [iG[1].value.trim().slice(0, N.maxLength) || st.Gv[0], iG[0].value.trim()];
    };
    function draw() {
      for (const [id, v] of [['fS', st.S], ['fG', st.Gv]]) {
        $('#' + id, el).innerHTML = st.self
          ? `<input class="kana" value="${esc(v[1])}" placeholder="ふりがな"><input value="${esc(v[0])}" maxlength="${N.maxLength}">`
          : `<span class="kana">${esc(v[1])}</span><span class="kj">${esc(v[0])}</span>`;
      }
      const upd = () => { readInputs(); $('#full', el).textContent = `${st.S[0]} ${st.Gv[0]}（${st.S[1]} ${st.Gv[1]}）`; };
      $$('input', el).forEach((i) => (i.oninput = upd));
      upd();
    }
    $$('.sex', el).forEach((c) => (c.onclick = () => {
      st.g = c.dataset.g; $$('.sex', el).forEach((x) => x.classList.toggle('sel', x === c));
      st.Gv = pk(N.given[st.g]); if (!st.S) st.S = pk(N.surnames);
      setTimeout(() => go('stH'), 250);
    }));
    $$('[data-hp]', el).forEach((b) => (b.onclick = () => { st.hp = b.dataset.hp; go('stM'); }));
    $$('[data-mode]', el).forEach((b) => (b.onclick = () => { st.mode = b.dataset.mode; go('st2'); }));
    $$('[data-back]', el).forEach((b) => (b.onclick = () => { readInputs(); go(b.dataset.back); }));
    $('#shS', el).onclick = () => { st.S = pk(N.surnames); st.self = false; draw(); };
    $('#shG', el).onclick = () => { st.Gv = pk(N.given[st.g]); st.self = false; draw(); };
    $('#self', el).onclick = () => { st.self = true; draw(); const i = $('#fS input:last-child', el); if (i) i.focus(); };
    $('#ok', el).onclick = () => {
      readInputs();
      Audio2.se('decide');
      G = newLife({ gender: st.g, surname: st.S[0], given: st.Gv[0], kana: [st.S[1], st.Gv[1]], happinessType: st.hp, mode: st.mode });
      App.show('birth');
    };
  },
};
