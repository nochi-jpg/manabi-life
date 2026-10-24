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
window.addEventListener('DOMContentLoaded', () => {
  Platform.init();
  loadLife();
  App.show('title');
});
