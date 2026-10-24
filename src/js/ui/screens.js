'use strict';
// ===== リザルト・これまでの人生・オプション（task6 でくわしく） =====
Screens.result = {
  enter(el) { el.innerHTML = '<div style="padding:80px;font-size:28px">リザルト（つくり中）</div><button class="main" id="rBack" style="position:absolute;left:40px;bottom:40px;width:240px;height:52px">タイトルへ</button>'; $('#rBack', el).onclick = () => App.show('title'); },
  finish() { App.show('result'); },
};
Screens.history = { enter(el) { el.innerHTML = '<div style="padding:80px;font-size:28px">これまでの人生（つくり中）</div><button class="main" id="hBack" style="position:absolute;left:40px;bottom:40px;width:240px;height:52px">もどる</button>'; $('#hBack', el).onclick = () => App.show(G && G.alive ? 'main' : 'title'); } };
Screens.options = { enter(el, from) { el.innerHTML = '<div style="padding:80px;font-size:28px">オプション（つくり中）</div><button class="main" id="oBack" style="position:absolute;left:40px;bottom:40px;width:240px;height:52px">もどる</button>'; $('#oBack', el).onclick = () => App.show(from || 'title'); } };
