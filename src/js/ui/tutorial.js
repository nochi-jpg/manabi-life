'use strict';
// ===== 動くチュートリアル（docs/13 §4） =====
// 本物のゲーム画面の上で、説明する場所だけを明るくして、ふきだしで説明する。説明中は時間が止まる。
// 1〜6は最初の人生のはじめに続けて。「選択肢」「人生の分岐点」は、その場面が初めて来たときに出す。
const Tutorial = (() => {
  let on = false, cur = null, done = null;
  const KEY = 'tut';
  const seen = () => Store.get(KEY, {});
  const mark = (k) => { const s = seen(); s[k] = true; Store.set(KEY, s); };
  const simple = () => UIMode.simple();
  // 最初に続けて見せる説明
  const STEPS = () => [
    { t: '#head .ctrl, #speed', h: '人生は自動で進む', b: '春・夏・秋・冬と、時間がどんどん進みます。<br>右上のボタンで、一時停止・ふつう・×2・×4に切りかえられます。' },
    { t: '#tl', h: 'タイムライン', b: 'あなたの人生のできごとが、新しい順に上から出てきます。' },
    { t: simple() ? '#gauge' : '#stat', h: 'ステータス', b: simple() ? '満足感・健康・ストレスと、お金のようすです。<br>できごとや選んだことで変わります。' : '学力・ストレス・健康・満足感や、仕事のようすです。<br>できごとや選んだことで変わります。' },
    { t: simple() ? '#moreBtn' : (Platform.portrait() ? '#rtab' : '#pM'), h: simple() ? '［くわしく］' : 'くわしい情報', b: simple() ? 'お金・仕事・家族・生まれた家などは、ここをおすと見られます。<br>見ているあいだ、時間は止まります。' : 'くらし・お金・家族のようすです。オプションで「シンプル」な画面にもできます。' },
    { t: '#focusBtn', h: '方針', b: 'これからの毎日で、何をがんばるかを決められます。<br>6歳から選べて、伸びるステータスが変わります。' },
    { t: null, h: '幸せレベルは、自分で決める', b: '人生の最後に、点数はつきません。<br>ふりかえって「幸せだったか」を★1〜5で自分で決めます。<br>それでは、人生のはじまりです！' },
  ];
  function ov() {
    let o = $('#tut');
    if (!o) { o = document.createElement('div'); o.id = 'tut'; o.innerHTML = '<div class="hole"></div><div class="bub"></div>'; $('#stage').appendChild(o); }
    return o;
  }
  // 画面上の位置（ステージの座標）
  function rectOf(sel) {
    if (!sel) return null;
    const el = $$(sel.split(',').map((x) => x.trim()).join(',')).find((x) => x.offsetParent !== null || x.getClientRects().length);
    if (!el) return null;
    const st = $('#stage'), sr = st.getBoundingClientRect(), s = sr.width / st.offsetWidth;
    const r = el.getBoundingClientRect();
    return { x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s };
  }
  function draw() {
    if (!cur) return;
    const o = ov(), st = $('#stage'), W = st.offsetWidth, H = st.offsetHeight;
    const r = cur.rect ? cur.rect() : rectOf(cur.t);
    const hole = $('.hole', o), bub = $('.bub', o);
    const pad = 8;
    if (r) Object.assign(hole.style, { display: 'block', left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.w + pad * 2 + 'px', height: r.h + pad * 2 + 'px' });
    else Object.assign(hole.style, { display: 'block', left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
    const n = cur.n ? `<span class="tn num">${cur.i + 1} / ${cur.n}</span>` : '';
    bub.innerHTML = `<div class="th">${n}<b>${cur.h}</b></div><p>${cur.b}</p><div class="tb">${cur.skip ? '<button id="tutSkip">スキップ</button>' : '<span></span>'}<button class="main" id="tutNx">${cur.last ? 'わかった' : 'つぎへ ▶'}</button></div>`;
    const bw = Math.min(560, W - 32); bub.style.width = bw + 'px';
    const bh = bub.offsetHeight;
    let x, y;
    if (!r) { x = (W - bw) / 2; y = (H - bh) / 2; }
    else {
      x = clamp(r.x + r.w / 2 - bw / 2, 16, W - bw - 16);
      const below = r.y + r.h + pad + 16, above = r.y - pad - 16 - bh;
      y = below + bh <= H - 16 ? below : above >= 16 ? above : clamp(r.y + r.h / 2 - bh / 2, 16, H - bh - 16);
    }
    Object.assign(bub.style, { left: x + 'px', top: y + 'px' });
    o.classList.add('on');
    $('#tutNx', o).onclick = () => { Audio2.se('click'); cur.next(); };
    const sk = $('#tutSkip', o); if (sk) sk.onclick = () => { Audio2.se('click'); finishIntro(); };
  }
  function hide() { const o = $('#tut'); if (o) o.classList.remove('on'); cur = null; on = false; }
  // ---- 最初の説明 ----
  let introCb = null;
  function finishIntro() { mark('intro'); hide(); const f = introCb; introCb = null; f && f(); }
  function start(cb) {
    if (seen().intro || !G) { cb(); return; }
    introCb = cb; on = true;
    const S = STEPS();
    const show = (i) => {
      if (i >= S.length) { finishIntro(); return; }
      cur = { ...S[i], i, n: S.length, skip: true, last: i === S.length - 1, next: () => show(i + 1) };
      draw();
    };
    // 画面ができてから
    setTimeout(() => show(0), 120);
  }
  // ---- その場面が初めて来たとき（選択肢・人生の分岐点） ----
  function hint(key, rect, h, b, cb) {
    if (seen()[key] || !seen().intro) { cb && cb(); return false; }
    on = true;
    cur = { rect, h, b, last: true, next: () => { mark(key); hide(); cb && cb(); } };
    setTimeout(draw, 80);
    return true;
  }
  const boxRect = () => rectOf('#pop .box');
  return {
    start,
    isOn: () => on,
    relayout() { if (cur) setTimeout(draw, 60); },
    reset() { Store.set(KEY, {}); },
    // 選択肢のポップアップが初めて出たとき
    onChoice() { hint('choice', () => rectOf('#pop .opts') || boxRect(), '選択肢', '人生の大事な場面では、自分で選びます。<br>％は「うまくいく確率」です。<br>［ステータスを見る］で、今のようすを確かめてから選べます。'); },
    // 人生の分岐点が初めて出たとき
    onMilestone() { hint('milestone', boxRect, '人生の分岐点', '入学・就職・結婚・子どもの誕生など、<br>人生が大きく変わったときは、こうして知らせます。'); },
  };
})();
