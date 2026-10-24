'use strict';
// ===== 音（data/audio.json） =====
const Audio2 = (() => {
  const A = () => window.DATA.audio;
  let bgmEl = null, bgmKey = null, fadeT = 0, duck = 1;
  const opt = () => Options.get();
  function vol() { return opt().bgmVolume * duck; }
  function bgm(key) {
    if (key === bgmKey) return;
    bgmKey = key;
    const def = A().bgm[key];
    const old = bgmEl;
    if (old) fadeOut(old);
    if (!def) { bgmEl = null; return; }
    const el = new Audio(asset(def.file));
    el.loop = def.loop !== false; el.volume = 0;
    bgmEl = el;
    el.play().then(() => fadeTo(el, vol())).catch(() => { /* まだタップされていない：あとで resume */ });
  }
  function fadeTo(el, target, ms = A().bgmRules.fadeMs) {
    const start = el.volume, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); el.volume = Math.max(0, Math.min(1, start + (target - start) * k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function fadeOut(el) { fadeTo(el, 0, 800); setTimeout(() => { el.pause(); }, 850); }
  function resume() { if (bgmEl && bgmEl.paused) bgmEl.play().then(() => fadeTo(bgmEl, vol())).catch(() => {}); }
  function setDuck(on) { duck = on ? 0.3 : 1; if (bgmEl) bgmEl.volume = vol(); }
  function refresh() { if (bgmEl) bgmEl.volume = vol(); }
  const seCache = {};
  function se(key) {
    const def = A().se[key]; if (!def || opt().seVolume <= 0) return null;
    try {
      const el = new Audio(asset(def.file)); el.volume = opt().seVolume;
      el.play().catch(() => {});
      if (def.maxMs) setTimeout(() => fadeTo(el, 0, 600), def.maxMs - 600), setTimeout(() => el.pause(), def.maxMs);
      seCache[key] = el; return el;
    } catch (e) { return null; }
  }
  function loopSe(key, ms) { const def = A().se[key]; if (!def) return () => {}; const el = new Audio(asset(def.file)); el.loop = true; el.volume = opt().seVolume; el.play().catch(() => {}); const t = setTimeout(() => el.pause(), ms); return () => { clearTimeout(t); el.pause(); }; }
  // 人生の段階から BGM を決める
  function forLife(G) {
    if (!G) return 'title';
    if (G.age <= 5) return 'baby';
    if (G.flags.retired_flag || (G.age >= 65 && !['seishain', 'keiyaku', 'haken', 'part', 'freelance', 'self_employed', 'civil_servant', 'executive'].includes(G.employment))) return 'retire';
    if (G.stage !== 'none' && G.stage !== 'hikikomori') return 'school';
    return 'work';
  }
  document.addEventListener('pointerdown', resume, true);
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('button,.chip.more,.tap')) se('click'); }, true);
  return { bgm, se, loopSe, setDuck, refresh, forLife };
})();

// ===== オプション（保存する） =====
const Options = (() => {
  let o = null;
  const def = () => ({ bgmVolume: 0.6, seVolume: 0.8, speed: 1, suspenseSkip: false, tlSize: 'm', ...window.DATA.audio.optionsDefault });
  return {
    get() { if (!o) o = { ...def(), ...Store.get('options', {}) }; return o; },
    set(k, v) { this.get()[k] = v; Store.set('options', o); },
  };
})();
