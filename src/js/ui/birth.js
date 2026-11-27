'use strict';
// ===== 誕生（ui/birth.html）：都道府県のルーレット → 家族と県のデータ =====
const faceFile = (g, age) => { const a = D().visuals.portraits.ages.find((r) => age >= r.from && age <= r.to); return asset(`assets/faces/${g}_${a ? a.img : 0}.png`); };
// 主人公の顔：学生のあいだはライフステージで決める（小学生=10・中高=15・大学など/浪人=20）
const STU20 = ['univ', 'univ_med', 'junior_college', 'vocational', 'grad_master', 'grad_doctor', 'grad_prof', 'ronin'];
function faceImgOf(g) {
  const st = g.stage, a = g.age;
  let n;
  if (a < 3) n = 0;
  else if (st === 'elem' || st === 'free_school') n = 10;
  else if (['jhs', 'hs', 'hs_corr', 'hs_night'].includes(st)) n = 15;
  else if (st === 'kosen') n = g.school && g.school.yearIn > 3 ? 20 : 15;
  else if (STU20.includes(st)) n = 20;
  else if (a < 7) n = 5;
  else if (a < 13) n = 10;
  else if (a < 18) n = 15;
  else if (a < 35) n = a <= 22 ? 20 : 30;
  else n = a < 50 ? 40 : a < 70 ? 60 : 80;
  return asset(`assets/faces/${g.gender}_${n}.png`);
}
const playerFace = () => faceImgOf(G);
function familyLine(p) {
  let what = '';
  if (p.role === 'father' || p.role === 'mother') what = esc(Fam.statusLabel(p));
  else if (p.role === 'sibling') what = p.age < 1 ? '👶 赤ちゃん' : p.age < 3 ? '🏠 家で過ごす' : p.age < 6 ? '🧸 保育園・幼稚園' : p.age < 12 ? '🎒 小学生' : p.age < 15 ? '🏫 中学生' : '📚 学生';
  else if (p.role === 'grandparent') what = p.together ? '🏠 いっしょに住んでいる' : `🏘️ ${esc(Fam.prefName(p.pref))}に住んでいる`;
  // なんとしても1行に：長い職業名ほど字を小さく（それでも入らなければ…で切る）
  const len = String(what).replace(/<[^>]+>/g, '').replace(/\p{Extended_Pictographic}/gu, '').length;
  const fs = len <= 9 ? '' : len <= 12 ? 'f14' : len <= 15 ? 'f12' : 'f11';
  const kl = `${p.role === 'grandparent' ? (p.side === 'mother' ? '母方の' : '父方の') : ''}${roleLabel(p)}（${p.age}）`;
  return `<div class="kv"><span class="k ${kl.length >= 8 ? 'long' : ''}">${roleEmoji(p)} ${kl}</span><span class="one ${fs}">${what}</span></div>`;
}
// ===== ゲーム開始時のお知らせ（両親・家庭・都道府県）docs/13 §2。［くわしく］→［生まれ］でも同じ中身を見られる =====
const BirthInfo = (() => {
  const NAT = 58; // 全国の大学進学率（%）
  // 都道府県の特徴：統計のデータ（data/prefectures.json）から文にする
  function feature(p) {
    const t = [];
    t.push(p.tier === 'A' ? '大学や会社が多く、進学や就職の選択肢が広い。' : p.tier === 'B' ? '県内に大学や会社がほどほどにある。' : '大学や会社は少なめで、進学や就職で県の外に出る人も多い。');
    t.push(p.wage >= 1.0 ? '給料の水準は全国より高め。' : p.wage <= 0.8 ? '給料の水準は全国より低め。' : '給料の水準は全国の平均に近い。');
    t.push((p.rural ?? 0.5) >= 0.6 ? '車がないと不便なところが多い。' : (p.rural ?? 0.5) <= 0.25 ? '電車やバスで動きやすい。' : '');
    return t.filter(Boolean);
  }
  function pages() {
    const p = prefOf(G.birthPref || G.pref);
    const ps = D().prefectures.prefectures;
    const rank = ps.slice().sort((a, b) => b.population - a.population).findIndex((x) => x.id === p.id) + 1;
    const par = G.people.filter((x) => x.role === 'father' || x.role === 'mother');
    const sib = G.people.filter((x) => x.role === 'sibling');
    const gp = G.people.filter((x) => x.role === 'grandparent' && x.together);
    const band = bandOf(G.talents.familyWealth).label;
    const row = (k, v) => `<div class="kv"><span class="k">${k}</span><span class="one">${v}</span></div>`;
    return [
      { title: '👪 お父さん・お母さん', body: (par.length ? par.map(familyLine).join('') : row('親', 'いない')) + (par.length === 1 ? `<div class="bnote">ひとり親の家庭です。</div>` : '') },
      { title: '🏠 家庭', body: row('きょうだい', sib.length ? sib.map((x) => `${roleLabel(x)}（${x.age}）`).join('・') : 'いない（ひとりっ子）') +
          row('いっしょに住む', gp.length ? gp.map((x) => `${x.side === 'mother' ? '母方の' : '父方の'}${roleLabel(x)}`).join('・') : '祖父母とは別に住んでいる') +
          row('家のくらし', `<b>${esc(band)}</b>`) +
          `<div class="bnote">家のくらしは、習い事・進学・ひとり暮らしのしやすさに関係します。</div>` },
      { title: `📍 ${esc(p.name)}の特徴`, body: row('地域', `${esc(p.region)}<span class="tier">${esc(D().prefectures.tiers[p.tier].label)}</span>`) +
          row('人口', `<span class="num">約${p.population}万人<small>（全国${rank}位）</small></span>`) +
          `<div class="mini"><span class="k">大学進学率</span><span class="bar c-blue"><i style="--w:${p.univRate}%"></i></span><span class="v num">${p.univRate}%</span></div>` +
          `<div class="mini"><span class="k">（全国）</span><span class="bar c-mint"><i style="--w:${NAT}%"></i></span><span class="v num">${NAT}%</span></div>` +
          `<div class="bfeat">${feature(p).map((x) => `<span>${esc(x)}</span>`).join('')}</div>` },
    ];
  }
  // 人生の最初に1回だけ、3枚を順に見せる
  function maybeShow(done) {
    if (!G || G.vars.birthInfoShown || G.age > 0) return false;
    const P = pages(); let i = 0;
    const draw = () => {
      const pg = P[i];
      const box = Popup.show(`<div class="cs">生まれた家</div><div class="bdots">${P.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <h2>${pg.title}</h2><div class="bbody">${pg.body}</div>
        <div class="nx"><button class="main" id="biNx">${i < P.length - 1 ? 'つぎへ ▶' : '人生をはじめる ▶'}</button></div>`, 'mbox binfo');
      $('#biNx', box).onclick = () => { Audio2.se('click'); if (++i < P.length) draw(); else { Popup.close(); G.vars.birthInfoShown = true; save(); done(); } };
    };
    draw();
    return true;
  }
  return { pages, maybeShow, feature };
})();

Screens.birth = {
  enter(el) {
    const p = pref();
    const ps = D().prefectures.prefectures;
    el.innerHTML = `
      <div class="date">2010年 4月 ー 誕生</div>
      <div id="roul"><div id="reel"></div></div>
      <div id="born">🎉 <b>${esc(p.name)}</b> に誕生した！</div>
      <div class="panel v2" id="card">
        <div class="pic" style="background-image:url(${faceFile(G.gender, 0)})"></div>
        <div class="fn pn">${esc(G.surname)} ${esc(G.given)}</div>
        <div class="sx ${G.gender}">${G.gender === 'M' ? '👦 男の子' : '👧 女の子'}</div>
        <div class="src"><span>📊</span><span>日本で生まれる赤ちゃんは年に約70万人。生まれる場所・家族・才能は、だれにも選べません。<small>（厚生労働省 人口動態統計）</small></span></div>
      </div>
      <button class="main go" id="goLife">人生をはじめる ▶</button>`;
    const reel = $('#reel', el);
    const seq = []; for (let i = 0; i < 40; i++) seq.push(ps[Math.floor(Math.random() * 47)].name); seq.push(p.name);
    reel.innerHTML = seq.map((x) => `<div>${esc(x)}</div>`).join('');
    const done = () => { reel.style.transition = 'none'; reel.style.transform = `translateY(${-(seq.length - 1) * 152}px)`; ['#born', '#card', '#goLife'].forEach((s) => $(s, el).classList.add('on')); Audio2.se('cheer'); };
    reel.style.transition = 'transform 3.2s cubic-bezier(.15,.85,.25,1)';
    requestAnimationFrame(() => requestAnimationFrame(() => { reel.style.transform = `translateY(${-(seq.length - 1) * 152}px)`; }));
    const t = setTimeout(done, 3400);
    $('#roul', el).onclick = () => { clearTimeout(t); done(); };
    $('#goLife', el).onclick = () => { Audio2.se('decide'); Engine.begin(); App.show('main'); };
  },
};
