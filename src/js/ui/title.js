'use strict';
// ===== タイトル（ui/title.html） =====
Screens.title = {
  enter(el) {
    Audio2.bgm('title');
    const has = !!G && G.alive;
    const n = histories().length;
    el.innerHTML = `
      <div class="logo" style="background-image:url(${asset('assets/ui/title.jpg')})"></div>
      <div class="menu">
        <button class="main" id="tStart">${has ? `つづきから <small>${esc(G.given)}・${G.age}歳</small>` : 'はじめから'}</button>
        <button id="tHist">これまでの人生 <small>（${n}人）</small></button>
        <button id="tOpt">オプション</button>
      </div>
      <div class="note">人生は一度きり　途中でやめて最初からやり直すことはできません（自動でセーブされ、ブラウザを開きなおすと再開します）</div>
      <div class="cred">© のち（まなび堂）</div>
      ${Platform.showIOSHint() ? '<div class="ios">📲 共有 → ホーム画面に追加 で全画面で遊べます <button id="iosX">✕</button></div>' : ''}`;
    $('#tStart').onclick = () => (has ? App.show('main') : App.show('start'));
    $('#tHist').onclick = () => App.show('history');
    $('#tOpt').onclick = () => App.show('options', 'title');
    const x = $('#iosX'); if (x) x.onclick = () => { Store.set('iosHintClosed', true); x.parentElement.remove(); };
  },
};
