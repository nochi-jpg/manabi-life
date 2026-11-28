'use strict';
// ===== 画面の切りかえと起動 =====
const App = {
  cur: null,
  show(name, ...args) {
    $$('.scr').forEach((s) => s.classList.remove('on'));
    const el = $('#scr-' + name); el.classList.add('on');
    this.cur = name;
    const S = Screens[name]; if (S && S.enter) S.enter(el, ...args);
  },
};
// 画面の表示（シンプル／くわしい）：#stage の class で切りかえる（docs/13 §2）
const UIMode = { simple: () => (Options.get().ui || 'simple') === 'simple', apply() { const st = $('#stage'); st.classList.toggle('simple', this.simple()); st.classList.toggle('detail', !this.simple()); } };
// 縦⇔横が変わったとき：メイン画面だけ組み立てなおす（ほかの画面は CSS だけで切りかわる）
document.addEventListener('layoutchange', () => { if (App.cur === 'main' && Screens.main.relayout) Screens.main.relayout(); });
window.addEventListener('DOMContentLoaded', () => {
  UIMode.apply();
  Platform.init();
  loadLife();
  App.show('title');
});
