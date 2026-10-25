'use strict';
// ===== 画面の大きさ・全画面・横向き（docs/11「スマホ・タブレットでのフルスクリーン」） =====
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

  function fit() {
    const st = document.getElementById('stage');
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => parseFloat(cs.getPropertyValue(v)) || 0;
    const w = window.innerWidth - px('--safeL') - px('--safeR');
    const hgt = window.innerHeight - px('--safeT') - px('--safeB');
    const s = Math.min(w / 1280, hgt / 720);
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
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* 対応していない端末 */ }
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
    if (isMobile) document.getElementById('rotate').classList.add('mobile');
    // ダブルタップ拡大・ピンチを止める
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    let last = 0;
    // すばやく続けてタップしたとき：ダブルタップの拡大は止めるが、タップ（クリック）は自分で起こす（早送り・連打が効くように）
    document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - last < 300 && e.target.tagName !== 'INPUT') { e.preventDefault(); const t = e.target.closest ? e.target : e.target.parentElement; if (t && t.click) t.click(); } last = n; }, { passive: false });
    autoOnFirstTap();
  }
  const portrait = () => isMobile && window.innerHeight > window.innerWidth;
  return { init, fit, enter, exit, toggle, isFull, canFull, showIOSHint, portrait, isMobile, isIPhone };
})();

// 画像・音のパス（1つのHTMLにまとめたときは埋め込みデータを使う）
const asset = (p) => (window.ASSETS && window.ASSETS[p]) || '../' + p;
