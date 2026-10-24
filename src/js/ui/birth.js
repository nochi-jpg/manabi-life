'use strict';
// ===== 誕生（ui/birth.html）：都道府県のルーレット → 家族と県のデータ =====
const faceFile = (g, age) => { const a = D().visuals.portraits.ages.find((r) => age >= r.from && age <= r.to); return asset(`assets/faces/${g}_${a ? a.img : 0}.png`); };
function familyLine(p) {
  let what = '';
  if (p.role === 'father' || p.role === 'mother') what = `${p.jobEmoji || '💼'} ${esc(p.jobLabel || '')}`;
  else if (p.role === 'sibling') what = p.age < 1 ? '👶 赤ちゃん' : p.age < 3 ? '🏠 家で過ごす' : p.age < 6 ? '🧸 保育園・幼稚園' : p.age < 12 ? '🎒 小学生' : p.age < 15 ? '🏫 中学生' : '📚 学生';
  else if (p.role === 'grandparent') what = p.livesTogether ? '🏠 いっしょに住んでいる' : '🏘️ 別の家に住んでいる';
  return `<div class="kv"><span class="k">${roleEmoji(p)} ${roleLabel(p)}（${p.age}）</span><span>${what}</span></div>`;
}
Screens.birth = {
  enter(el) {
    const p = pref();
    const ps = D().prefectures.prefectures;
    const rank = ps.slice().sort((a, b) => b.population - a.population).findIndex((x) => x.id === p.id) + 1;
    const tierD = D().prefectures.tiers[p.tier];
    const fam = G.people.filter((x) => x.role !== 'grandparent').concat(G.people.filter((x) => x.role === 'grandparent' && x.livesTogether).slice(0, 1));
    const famShow = fam.slice(0, 4);
    const nat = 58;
    el.innerHTML = `
      <div class="date">2010年 4月</div>
      <div id="roul"><div id="reel"></div></div>
      <div id="born">🎉 <b>${esc(p.name)}</b> に誕生した！</div>
      <div class="panel" id="card">
        <div>
          <div class="pic" style="background-image:url(${faceFile(G.gender, 0)})"></div>
          <div class="fn"><small>${esc(G.kana[0])} ${esc(G.kana[1])}</small>${esc(G.surname)} ${esc(G.given)}</div>
          <div class="sx ${G.gender}">${G.gender === 'M' ? '👦 男の子' : '👧 女の子'}</div>
        </div>
        <div>
          <h3>👨‍👩‍👧 家族</h3>
          ${famShow.map(familyLine).join('')}
          ${fam.length > 4 ? `<div class="kv"><span class="k">ほか</span><span>${fam.length - 4}人</span></div>` : ''}
        </div>
        <div>
          <h3>📍 ${esc(p.name)}のデータ</h3>
          <div class="kv"><span class="k">地域</span><span>${esc(p.region)}<span class="tier">${esc(tierD.label)}</span></span></div>
          <div class="kv"><span class="k">人口</span><span class="num">約${p.population}万人<small>（全国${rank}位）</small></span></div>
          <div class="mini"><span class="k">大学進学率</span><span class="bar c-blue"><i style="--w:${p.univRate}%"></i></span><span class="v num">${p.univRate}%</span></div>
          <div class="mini"><span class="k">（全国）</span><span class="bar c-mint"><i style="--w:${nat}%"></i></span><span class="v num">${nat}%</span></div>
          <div class="kv"><span class="k">学校・会社</span><span>${p.tier === 'A' ? '多い（選べる道が広い）' : p.tier === 'B' ? 'ほどほど' : '少なめ（車や上京が道を広げる）'}</span></div>
        </div>
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
