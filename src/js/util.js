'use strict';
const Screens = {}; // 画面ごとの処理（ui/*.js で登録）
// ===== 小道具 =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

// ===== 乱数（セーブできる。同じ状態なら同じ結果） =====
// mulberry32。状態は G.rng（32bit整数）に入れて、セーブといっしょに保存する。
const RNG = {
  s: 1,
  seed(n) { this.s = (n >>> 0) || 1; },
  next() {
    let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
};
const rnd = () => RNG.next();
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p) => rnd() < p;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const normal = (mu, sd) => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const talent = () => Math.round(clamp(normal(50, 15), 1, 99));
const weighted = (items, wf) => {
  const ws = items.map(wf); const tot = ws.reduce((a, b) => a + Math.max(0, b), 0);
  if (tot <= 0) return null;
  let r = rnd() * tot;
  for (let i = 0; i < items.length; i++) { r -= Math.max(0, ws[i]); if (r <= 0) return items[i]; }
  return items[items.length - 1];
};
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// 範囲 [a,b] またはただの数
const rangeVal = (r) => (Array.isArray(r) ? r[0] + rnd() * (r[1] - r[0]) : +r || 0);
const rangeInt = (r) => (Array.isArray(r) ? rint(r[0], r[1]) : +r || 0);
// 年齢カーブ { "40":0.01, "60":0.03 } を直線でつないで読む
const curve = (obj, x) => {
  const ks = Object.keys(obj).filter((k) => !k.startsWith('_')).map(Number).sort((a, b) => a - b);
  if (!ks.length) return 0;
  if (x <= ks[0]) return +obj[ks[0]];
  for (let i = 1; i < ks.length; i++) if (x <= ks[i]) { const a = ks[i - 1], b = ks[i]; return obj[a] + (obj[b] - obj[a]) * (x - a) / (b - a); }
  return +obj[ks[ks.length - 1]];
};
const logistic = (d, s = 3.5) => clamp(1 / (1 + Math.exp(-d / s)), 0.03, 0.97);

// ===== お金の表示 =====
const man = (v) => { const n = Math.round(v); return (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('ja-JP'); };
const manFull = (v) => { const n = Math.round(v); const a = Math.abs(n); const s = a >= 10000 ? `${Math.floor(a / 10000)}億${a % 10000 ? (a % 10000).toLocaleString('ja-JP') + '万' : ''}` : `${a.toLocaleString('ja-JP')}万`; return (n < 0 ? '−' : '') + s + '円'; };

// ===== 保存（localStorage は使えないことがあるので try でつつむ） =====
const Store = {
  get(k, d = null) { try { const v = localStorage.getItem('mlife_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mlife_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem('mlife_' + k); } catch (e) { /* なにもしない */ } },
};

// ===== トースト =====
let toastT = 0;
function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
