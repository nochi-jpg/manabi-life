'use strict';
// ===== 画面の大きさ・全画面・縦横（docs/11・docs/13 §1） =====
// 横長の画面：1280×720。縦長の画面：はば720・高さ1280〜1600（画面に合わせてのばす）。どちらもステージごと拡大・縮小する
const Platform = (() => {
  const ua = navigator.userAgent;
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIPhone || isIPad || isAndroid;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const el = document.documentElement;
  const canFull = !!(el.requestFullscreen || el.webkitRequestFullscreen) && !isIPhone && (!inFrame || document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  let port = null;
  const W = () => (port ? 720 : 1280);
  let H = 720;
  function fit() {
    const st = document.getElementById('stage');
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => parseFloat(cs.getPropertyValue(v)) || 0;
    const w = window.innerWidth - px('--safeL') - px('--safeR');
    const hgt = window.innerHeight - px('--safeT') - px('--safeB');
    const p = hgt > w * 1.05;
    H = p ? Math.round(clamp((720 * hgt) / w, 1280, 1600)) : 720;
    st.style.width = W() + 'px'; st.style.height = H + 'px';
    if (p !== port) {
      const first = port === null;
      port = p;
      st.classList.toggle('port', p); st.classList.toggle('land', !p);
      st.style.width = W() + 'px';
      if (!first) document.dispatchEvent(new Event('layoutchange'));
    }
    st.style.setProperty('--stageH', H + 'px');
    const s = Math.min(w / W(), hgt / H);
    st.style.left = `calc(50% + ${(px('--safeL') - px('--safeR')) / 2}px)`;
    st.style.top = `calc(50% + ${(px('--safeT') - px('--safeB')) / 2}px)`;
    st.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  async function enter() {
    if (!canFull || isFull()) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) { /* できなくてもそのまま遊べる */ }
  }
  async function exit() {
    try { if (document.exitFullscreen) await document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch (e) { /* なにもしない */ }
  }
  const toggle = () => (isFull() ? exit() : enter());
  // 最初のタップで全画面（スマホ・タブレットだけ。PCは自動では全画面にしない）
  function autoOnFirstTap() {
    if (!isMobile || standalone) return;
    const once = () => { enter(); document.removeEventListener('pointerup', once, true); };
    document.addEventListener('pointerup', once, true);
  }
  // iPhone の Safari で開いているときだけ「ホーム画面に追加」の案内
  const showIOSHint = () => isIPhone && !standalone && !inFrame && !Store.get('iosHintClosed', false);

  function init() {
    fit();
    addEventListener('resize', fit);
    addEventListener('orientationchange', () => setTimeout(fit, 200));
    document.addEventListener('fullscreenchange', fit);
    // ダブルタップ拡大・ピンチを止める
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    let last = 0;
    // すばやく続けてタップしたとき：ダブルタップの拡大は止めるが、タップ（クリック）は自分で起こす（早送り・連打が効くように）
    document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - last < 300 && e.target.tagName !== 'INPUT') { e.preventDefault(); const t = e.target.closest ? e.target : e.target.parentElement; if (t && t.click) t.click(); } last = n; }, { passive: false });
    autoOnFirstTap();
  }
  const portrait = () => !!port;
  return { init, fit, enter, exit, toggle, isFull, canFull, showIOSHint, portrait, isMobile, isIPhone, stageH: () => H };
})();

// 画像・音のパス（1つのHTMLにまとめたときは埋め込みデータを使う）
const asset = (p) => (window.ASSETS && window.ASSETS[p]) || '../' + p;
