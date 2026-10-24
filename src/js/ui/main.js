'use strict';
// ===== メイン画面（ui/mock.html） =====
const Main = (() => {
  let el = null, timer = 0, postQ = [], running = false, lastSeason = -1, famPage = 0, repPage = -1, tab = 'p1';
  const speed = () => (G && G.uiSpeed != null ? G.uiSpeed : Options.get().speed || 1);
  const BASE_MS = 1500;

  function skeleton() {
    el.innerHTML = `
      <div id="head">
        <div class="date"><span class="ssn" id="ssnIc">🌸</span><span id="date" class="num"></span></div>
        <div class="pname" id="pname"></div>
        <div class="ctrl"><span class="lb2">🕰️ 人生</span><span class="bar c-mint lifebar"><i id="lifebar"></i></span>
          <div id="speed">
            <button data-s="0" title="一時停止"><span class="pz"></span></button>
            <button data-s="1" title="ふつう"><span class="pl"></span></button>
            <button data-s="2">×2</button><button data-s="4">×4</button>
          </div></div>
      </div>
      <div class="panel" id="face"><div class="pic" id="pic"></div><div class="role" id="role"></div></div>
      <div class="panel" id="stat"><div id="statL"></div><div id="statR"></div></div>
      <div id="mid">
        <button id="focusBtn"></button>
        <div class="seasons" id="ssn">${SS_NAME.map((n, i) => `<span>${SS_EMOJI[i]} ${n}</span>`).join('')}</div>
      </div>
      <div id="tl"><div class="top"><div class="hd">📜 タイムライン</div>
        <div class="sz">${['s', 'm', 'l'].map((k) => `<button data-sz="${k}">${{ s: '小', m: '中', l: '大' }[k]}</button>`).join('')}</div></div>
        <div id="feed"></div></div>
      <div id="paused">⏸ 一時停止中</div>
      <div id="bg"><div class="tag" id="bgTag"></div></div>
      <div class="panel" id="det">
        <div class="tabs">${[['p1', '状況'], ['p2', '家族'], ['p3', '通知表'], ['p4', 'お金']].map(([k, l]) => `<button data-p="${k}">${l}</button>`).join('')}</div>
        <div class="page" id="p1"></div><div class="page" id="p2"></div><div class="page" id="p3"></div><div class="page" id="p4"></div>
      </div>
      <div id="foot"><button id="logBtn">📖 バックログ</button><button id="optBtn">⚙️ オプション</button></div>
      <div id="sus"></div>`;
    $$('#speed button', el).forEach((b) => (b.onclick = () => setSpeed(+b.dataset.s)));
    $$('[data-sz]', el).forEach((b) => (b.onclick = () => { Options.set('tlSize', b.dataset.sz); applySize(); }));
    $$('.tabs button', el).forEach((b) => (b.onclick = () => { tab = b.dataset.p; drawTabs(); }));
    $('#focusBtn', el).onclick = () => openFocus();
    $('#logBtn', el).onclick = () => { stop(); App.show('history', 'backlog'); };
    $('#optBtn', el).onclick = () => { stop(); App.show('options', 'main'); };
    applySize();
  }
  function applySize() { const s = Options.get().tlSize || 'm'; $('#feed', el).className = s; $$('[data-sz]', el).forEach((b) => b.classList.toggle('on', b.dataset.sz === s)); }
  function setSpeed(s) { G.uiSpeed = s; $$('#speed button', el).forEach((b) => b.classList.toggle('on', +b.dataset.s === s)); $('#paused', el).classList.toggle('on', s === 0); if (s > 0) kick(); save(); }

  // ---------- 表示の更新 ----------
  function refresh() {
    if (!G) return;
    $('#date', el).textContent = `${calYear()}年 ${String(MONTH[G.q]).padStart(2, ' ')}月`;
    $('#ssnIc', el).textContent = SS_EMOJI[G.q];
    $$('#ssn span', el).forEach((s, i) => s.classList.toggle('on', i === G.q));
    const hp = G.stats.happiness;
    $('#pname', el).innerHTML = `${hp >= 70 ? '😄' : hp >= 50 ? '🙂' : hp >= 30 ? '😐' : '😣'} ${esc(G.given)} <small>${G.age}歳</small>`;
    $('#lifebar', el).style.setProperty('--w', Math.min(100, (G.age / 90) * 100) + '%');
    $('#pic', el).style.backgroundImage = `url(${faceFile(G.gender, G.age)})`;
    $('#role', el).innerHTML = roleHtml();
    drawStats();
    $('#focusBtn', el).innerHTML = `<span class="k">重点方針</span>${Menu.focusLabel(G.focus)}<span class="arw">▼</span>`;
    $('#focusBtn', el).disabled = G.age < 6;
    const bg = bgOf();
    $('#bg', el).style.backgroundImage = `url(${asset(bg.file)})`;
    $('#bgTag', el).textContent = '📍 ' + bg.label;
    drawTabs();
    $$('#speed button', el).forEach((b) => b.classList.toggle('on', +b.dataset.s === speed()));
    $('#paused', el).classList.toggle('on', speed() === 0);
    Audio2.bgm(Audio2.forLife(G));
  }
  function roleHtml() {
    if (G.job && G.job.id && Econ.working()) {
      const j = Menu.job(G.job.id) || {};
      const ind = D().ranks.industry[j.cat] || j.label;
      const st = Econ.curStep();
      const form = G.job.form !== 'seishain' && G.job.form !== 'civil_servant' ? `<span class="form">${esc((D().jobs.forms[G.job.form] || {}).label || D().flags.employment[G.job.form] || '')}</span>` : '';
      return `<span class="r1">${j.emoji || '💼'} ${esc(ind)}｜${esc(j.label)}</span><span class="r2">${st ? `<b>${esc(st.t)}</b>・` : ''}${G.jobYears + 1}年目${form}${G.employment === 'leave' ? '<span class="form">休職中</span>' : ''}</span>`;
    }
    if (G.school) {
      const stName = D().flags.stages[G.stage] || '';
      const grade = G.stage === 'ronin' ? '浪人中' : ['nursery', 'kindergarten'].includes(G.stage) ? `${G.age}歳児` : `${G.school.yearIn}年生`;
      const part = G.job && G.job.part ? ` ・ ${(Menu.job(G.job.part) || {}).emoji || ''}バイト` : '';
      return `<span class="r1">${G.school.emoji} ${esc(stName)}｜${esc(G.school.name)}</span><span class="r2"><b>${grade}</b>${part}</span>`;
    }
    if (G.age < 3) return `<span class="r1">🍼 家庭</span><span class="r2"><b>${G.age}歳</b></span>`;
    if (G.age < 6) return `<span class="r1">🏠 家庭</span><span class="r2"><b>${G.age}歳</b></span>`;
    const emp = D().flags.employment[G.employment] || '';
    const ic = { retired: '🌴', unemployed: '🔍', homemaker: '🏠', leave: '😌' }[G.employment] || '🏠';
    return `<span class="r1">${ic} ${esc(G.stage === 'hikikomori' ? '家で過ごしている' : emp)}</span><span class="r2"><b>${G.age}歳</b></span>`;
  }
  function bar(c, v, show = true) { return `<span class="bar ${c}"><i style="--w:${clamp(v, 0, 100)}%"></i></span><span class="v">${show ? Math.round(v) : '—'}</span>`; }
  function drawStats() {
    const s = G.stats;
    $('#statL', el).innerHTML = `<h3>🧑 本人ステータス</h3>
      <div class="row"><span class="lb">📚 学力</span>${bar('c-blue', s.academic)}</div>
      <div class="row"><span class="lb">😣 ストレス</span>${bar('c-red', s.stress)}</div>
      <div class="row"><span class="lb">🤝 人間関係</span>${bar('c-mint', s.social)}</div>
      <div class="row"><span class="lb">❤️ 健康</span>${bar('c-pink', s.health)}</div>
      <div class="row"><span class="lb">😊 満足感</span>${bar('c-gold', s.happiness)}</div>`;
    const work = G.job && G.job.id && Econ.working();
    const cashOn = G.age >= 16;
    const d = G.lastDelta;
    let delta = '';
    if (cashOn && d && Math.abs(d.v) >= 1) delta = d.bonus >= 5 ? `<span class="delta bonus">💰+${man(d.v)}</span>` : d.v > 0 ? `<span class="delta inc">+${man(d.v)}</span>` : `<span class="delta exp">${man(d.v)}</span>`;
    G.lastDelta = null;
    $('#statR', el).innerHTML = `<h3>💼 職業ステータス</h3>
      <div class="row"><span class="lb">💴 月収</span>${work ? `<span class="num">${round1(Econ.monthlyIncome()).toFixed(1)}<small>万円</small></span>` : `<span class="dash">${Menu.isStudent() ? '— 学生 —' : G.vars.pensionAge && G.age >= G.vars.pensionAge ? '年金 ' + Econ.pensionMonthly() + '万' : '—'}</span>`}</div>
      <div class="row"><span class="lb">💪 肉体負荷</span>${bar(work ? 'c-red' : 'c-gray', work ? s.physicalLoad : 0, work)}</div>
      <div class="row"><span class="lb">🧠 精神負荷</span>${bar(work ? 'c-blue' : 'c-gray', work ? s.mentalLoad : 0, work)}</div>
      <div class="row"><span class="lb">⭐ 仕事満足</span>${bar(work ? 'c-gold' : 'c-gray', work ? s.jobSatisfaction : 0, work)}</div>
      <div class="row"><span class="lb">👛 所持金</span>${cashOn ? `<span class="num ${G.cash < 0 ? 'neg' : ''}">${delta}${man(G.cash)}<small>万円</small></span>` : '<span class="dash">16歳から</span>'}</div>`;
  }
  function bgOf() {
    const V = D().visuals;
    const B = (id) => V.backgrounds.find((b) => b.id === id) || V.backgrounds[0];
    if (G.flags.lives_abroad || G.stage === 'abroad_study') return B('bg_abroad');
    if (G.school && G.vars.schoolAway && Menu.picked(G.school.pick) && Menu.picked(G.school.pick).where === 'abroad') return B('bg_abroad');
    if (G.school && V.byStage[G.stage]) return B(V.byStage[G.stage]);
    if (G.flags.remote_work) return B('bg_home');
    if (G.job && G.job.id && Econ.working()) {
      if (G.flags.hq_assign) return B('bg_hq');
      if (G.job.id === 'j_pro_athlete') return B(G.clubs.some((c) => V.sportByClub.arena.includes(c.id)) ? 'bg_arena' : 'bg_stadium');
      const j = Menu.job(G.job.id) || {};
      return B(V.byJobOverride[G.job.id] || V.byJobCat[j.cat] || (G.job.form === 'part' ? V.byFormFallback.part : 'bg_office'));
    }
    return B(V.byEmployment[G.employment] || 'bg_home');
  }

  // ---------- 右のタブ ----------
  function drawTabs() {
    $$('.tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.p === tab));
    $$('.page', el).forEach((p) => p.classList.toggle('on', p.id === tab));
    if (tab === 'p1') pageStatus(); else if (tab === 'p2') pageFamily(); else if (tab === 'p3') pageReport(); else pageMoney();
  }
  const chips = (arr, max = 3) => {
    if (!arr.length) return '<span class="chips"><span class="chip no">なし</span></span>';
    const show = arr.slice(0, max).map((x) => `<span class="chip">${x}</span>`).join('');
    return `<span class="chips">${show}${arr.length > max ? `<span class="chip more" data-more="1">+${arr.length - max}</span>` : ''}</span>`;
  };
  function pageStatus() {
    const p = pref();
    const live = G.flags.living_alone ? 'ひとり暮らし' : G.flags.lives_dorm ? '寮' : G.flags.company_housing ? '社宅' : G.flags.owns_house ? '持ち家' : G.flags.married ? '家族と' : G.flags.lives_with_parents ? '実家' : '賃貸';
    const lessons = G.clubs.map((c) => { const d = Menu.club(c.id); return d ? `${d.emoji} ${esc(d.label.replace(/（.*）/, ''))}` : ''; }).filter(Boolean);
    const hobbies = G.hobbies.map((id) => { const d = Menu.hobby(id); return d ? `${d.emoji} ${esc(d.label.replace(/（.*）/, ''))}` : ''; }).filter(Boolean);
    const love = people('spouse').map((x) => `💍 ${esc(x.name)}`).concat(people('partner').map((x) => `💕 ${esc(x.name)}`));
    const LIC = D().flags.flags.license;
    const lic = Object.keys(LIC).filter((f) => G.flags[f]).map((f) => `📜 ${esc(licLabel(f))}`);
    const HE = ['dz_diabetes', 'dz_hypertension', 'dz_depression', 'dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast', 'dz_heart', 'dz_stroke_after', 'dz_dementia', 'dz_allergy', 'dz_asthma', 'injury_sports', 'injury_traffic'];
    const ill = HE.filter((f) => G.flags[f]).map((f) => `🏥 ${esc(D().flags.flags.health[f] || f)}`);
    const other = [];
    if (G.vars.phone) other.push(G.vars.phoneNoRule ? '📱 スマホ' : '📱 スマホ（ルールあり）');
    if (G.flags.smoker) other.push('🚬 たばこ'); if (G.flags.drinker || G.flags.heavy_drinker) other.push('🍺 お酒');
    if (G.flags.owns_car) other.push('🚗 車'); if (G.flags.pet) other.push('🐶 ペット'); if (G.flags.exercise_habit) other.push('🏃 運動習慣');
    if (G.flags.nisa) other.push('📈 NISA'); if (G.flags.caregiving) other.push('🤲 介護中'); if (G.flags.volunteer) other.push('🤝 ボランティア');
    $('#p1', el).innerHTML = `
      <div class="kv"><span class="k">📍 住まい</span><span>${esc(p.name)}（${live}）</span></div>
      <div class="kv"><span class="k">🎒 ${G.age >= 12 && G.age < 23 ? '部活など' : '習い事'}</span>${chips(lessons, 2)}</div>
      <div class="kv"><span class="k">✨ 趣味</span>${chips(hobbies, 2)}</div>
      <div class="kv"><span class="k">💕 恋愛</span>${chips(love, 2)}</div>
      <div class="kv"><span class="k">📜 資格</span>${chips(lic, 2)}</div>
      <div class="kv"><span class="k">🏥 病気</span>${chips(ill, 2)}</div>
      <div class="kv"><span class="k">🏷️ その他</span>${chips(other, 2)}</div>`;
    const lists = [null, lessons, hobbies, love, lic, ill, other];
    $$('#p1 .kv', el).forEach((row, i) => { const m = $('[data-more]', row); if (m) m.onclick = () => Popup.list($('.k', row).textContent, lists[i]); });
  }
  function licLabel(f) { const q = D().events_random.qualifications.find((x) => x.flag === f); if (q) return q.label.replace(/（.*）/, ''); return ({ lic_car: '普通免許', lic_bike: 'バイク免許', lic_teacher_elem: '小学校教員免許', lic_teacher_sec: '中高教員免許', lic_nurse: '看護師', lic_doctor: '医師', lic_dentist: '歯科医師', lic_pharmacist: '薬剤師', lic_lawyer: '弁護士', lic_pt: '理学療法士', lic_cook: '調理師', lic_beauty: '美容師', lic_pilot: 'パイロット', eiken_3: '英検3級', eiken_2: '英検2級', eiken_p1: '英検準1級', eiken_1: '英検1級', toeic_600: 'TOEIC600', toeic_800: 'TOEIC800', toeic_900: 'TOEIC900' })[f] || f; }
  function famLine(p) {
    let w = '';
    if (!p.alive) w = `🕊️ ${p.diedYear || ''}年に亡くなった`;
    else if (p.role === 'father' || p.role === 'mother') w = p.careLevel >= 1 ? `🤲 要介護${p.careLevel}` : `${p.jobEmoji || '💼'} ${esc(p.jobLabel || '')}`;
    else if (p.role === 'spouse' || p.role === 'partner') w = `${p.role === 'spouse' ? '💍' : '💕'} ${esc(p.name)}・関係${Math.round(p.relation)}`;
    else if (p.role === 'child' || p.role === 'sibling' || p.role === 'grandchild') w = `${esc(p.name)}・${kidStage(p)}`;
    else if (p.role === 'grandparent') w = p.livesTogether ? '🏠 同居' : '🏘️ 別居';
    return `<div class="fam ${p.alive ? '' : 'dead'}"><span class="av">${p.alive ? roleEmoji(p) : '🕊️'}</span><span class="r">${roleLabel(p)} ${p.alive ? p.age : ''}</span><span class="w">${w}</span></div>`;
  }
  function kidStage(p) { const a = p.age; if (p.stage === 'work_start' || p.stage === 'work') return '社会人'; return a < 3 ? '赤ちゃん' : a < 6 ? '保育園・幼稚園' : a < 12 ? '小学生' : a < 15 ? '中学生' : a < 18 ? '高校生' : a < 22 ? '学生' : '社会人'; }
  function pageFamily() {
    const order = ['spouse', 'partner', 'child', 'father', 'mother', 'sibling', 'grandparent', 'grandchild'];
    const list = G.people.filter((p) => order.includes(p.role) && (p.alive || calYear() - (p.diedYear || 0) < 3)).sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
    const per = 6; const pages = Math.max(1, Math.ceil(list.length / per));
    famPage = clamp(famPage, 0, pages - 1);
    $('#p2', el).innerHTML = (list.length ? list.slice(famPage * per, famPage * per + per).map(famLine).join('') : '<div class="kv"><span class="k">家族</span><span>ひとり</span></div>') +
      (pages > 1 ? `<div class="pager2"><button id="fp">◀</button><span>${famPage + 1} / ${pages}</span><button id="fn">▶</button></div>` : '');
    if (pages > 1) { $('#fp', el).onclick = () => { famPage = (famPage - 1 + pages) % pages; pageFamily(); }; $('#fn', el).onclick = () => { famPage = (famPage + 1) % pages; pageFamily(); }; }
  }
  function pageReport() {
    const R = G.reports;
    if (!R.length) { $('#p3', el).innerHTML = '<div class="kv"><span class="k">📋 通知表</span><span>小学生になったら</span></div>'; return; }
    if (repPage < 0 || repPage >= R.length) repPage = R.length - 1;
    const r = R[repPage];
    const cls = (v) => (r.kind === 3 ? (v === '◎' ? 's2' : v === '〇' ? 's1' : 's0') : v >= 4 ? 's2' : v >= 3 ? 's1' : 's0');
    $('#p3', el).innerHTML = `<div class="kv"><span class="k">📋 ${esc(r.gradeLabel)}</span><span>${r.year}年3月の通知表</span></div>
      <div class="rc">${Object.entries(r.grades).map(([k, v]) => `<div>${k}<b class="${cls(v)}">${v}</b></div>`).join('')}</div>
      <div class="rcnote">🧑‍🏫 ${esc(r.comment)}</div>
      <div class="pager2"><button id="rp" ${repPage === 0 ? 'disabled' : ''}>◀</button><span>${repPage + 1} / ${R.length}</span><button id="rn" ${repPage === R.length - 1 ? 'disabled' : ''}>▶</button></div>`;
    $('#rp', el).onclick = () => { repPage--; pageReport(); }; $('#rn', el).onclick = () => { repPage++; pageReport(); };
  }
  function pageMoney() {
    const cashOn = G.age >= 16;
    const debt = Econ.totalDebt();
    const loans = (G.loans || []).filter((l) => l.left > 0).map((l) => `${{ scholar: '🎓 奨学金', mortgage: '🏠 住宅ローン', car: '🚗 車', investment: '🏢 投資ローン', startup: '💼 事業' }[l.type] || '💳'} ${man(l.left)}万`);
    if (G.cash < 0) loans.unshift(`💳 カード ${man(-G.cash)}万`);
    const ins = G.flags.cancer_insurance ? 'がん保険・医療保険' : G.flags.life_insurance ? '医療保険' : G.age < 22 && !G.job ? '親の健康保険（扶養）' : '公的な健康保険のみ';
    const inv = [];
    if (G.assets > 1) inv.push(`📈 ${man(G.assets)}万`);
    if (G.flags.owns_house) inv.push(`🏠 家 ${man(G.vars.houseValue || 0)}万`);
    if (G.flags.owns_rental) inv.push('🏢 貸している部屋');
    $('#p4', el).innerHTML = `
      <div class="kv"><span class="k">👛 所持金</span><span class="num">${cashOn ? man(G.cash) + '万円' : '— （16歳から）'}</span></div>
      <div class="kv"><span class="k">🏠 家計</span><span>${G.age < 22 && !G.job ? bandOf(G.talents.familyWealth).label : '自分で管理'}</span></div>
      <div class="kv"><span class="k">💴 年収</span><span class="num">${Econ.annualIncome() ? man(Econ.annualIncome()) + '万円' : '—'}</span></div>
      <div class="kv"><span class="k">💳 借金</span>${chips(loans, 2)}</div>
      <div class="kv"><span class="k">🛡️ 保険</span><span>${ins}</span></div>
      <div class="kv"><span class="k">📈 資産</span>${chips(inv, 2)}</div>
      <div class="kv"><span class="k">🧾 税金</span><span class="num">これまで ${man(Object.entries(G.tax).filter(([k]) => k !== 'socialInsurance').reduce((a, [, v]) => a + v, 0))}万円</span></div>`;
    void debt;
  }

  // ---------- 重点方針 ----------
  function openFocus() {
    if (G.age < 6) return;
    stop();
    Popup.menu({ title: '重点方針を変える', note: '変えると次の季節から。年の途中の変更は効果が半分になります', items: Menu.build('focus'), cur: G.focus }, (it) => {
      if (it) { Engine.setFocus(it.id, false); save(); }
      refresh(); kick();
    });
  }

  // ---------- 進行 ----------
  function stop() { clearTimeout(timer); timer = 0; running = false; }
  function kick() { if (App.cur !== 'main') return; clearTimeout(timer); running = true; timer = setTimeout(loop, 60); }
  function loop() {
    timer = 0;
    if (App.cur !== 'main' || !G) return;
    if (speed() === 0 || Popup.isOpen() || Sus.isOn()) { running = false; return; }
    if (postQ.length) {
      const p = postQ.shift();
      addPost(p);
      refresh();
      timer = setTimeout(loop, BASE_MS / speed());
      return;
    }
    const r = Engine.next();
    handle(r);
  }
  function handle(r) {
    const after = () => {
      if (r.posts && r.posts.length) postQ.push(...r.posts);
      if (r.end) { refresh(); flushPosts(); setTimeout(() => Screens.result.finish(), 1800); return; }
      if (r.choice) {
        // 前の投稿を見せてから、ポップアップ
        flushPosts();
        refresh();
        Popup.choice(r.choice, (res) => handle(res));
        return;
      }
      const wait = r.season ? 200 / speed() : 0;
      timer = setTimeout(loop, wait);
    };
    if (r.suspense) Sus.show(r.suspense, after); else after();
  }
  function flushPosts() { while (postQ.length) addPost(postQ.shift()); }
  function addPost(p) {
    const f = $('#feed', el); if (!f) return;
    const d = document.createElement('div');
    d.className = 'post' + (p.kind ? ' ' + p.kind : '');
    d.innerHTML = `<span class="y">${p.y}年</span><span class="m">${p.m}月</span><span class="a">${p.age}歳</span><span class="e">${p.e}</span><span class="t">${esc(p.t)}${p.chosen ? `<small>選んだ：${esc(p.chosen)}</small>` : ''}</span>`;
    f.prepend(d);
    while (f.children.length > 14) f.lastChild.remove();
  }
  function fillFeed() {
    const f = $('#feed', el); f.innerHTML = '';
    for (const p of G.log.slice(-14)) addPost(p);
    $$('.post', f).forEach((x) => (x.style.animation = 'none'));
  }

  return {
    enter(elm) {
      el = elm; postQ = [];
      skeleton(); refresh(); fillFeed();
      if (G.pending) { Popup.choice(G.pending.view, (res) => handle(res)); }
      else kick();
    },
    refresh, kick, stop,
  };
})();
Screens.main = { enter: (el) => Main.enter(el) };

// ===== ドキドキ演出（ui/suspense.html, data/suspense.json） =====
const Sus = (() => {
  let on = false;
  return {
    isOn: () => on,
    show(s, done) {
      const box = $('#sus'); if (!box) { done(); return; }
      const S = D().suspense;
      on = true; Audio2.setDuck(true);
      box.innerHTML = `<div class="ic">${s.emoji || '📝'}</div><div class="tx">${esc(s.text.replace(/……$/, ''))}<span id="dots"></span></div><div class="tap"></div>`;
      box.classList.add('on');
      const stopBeat = Audio2.loopSe(S.sound, S.durationMs - 1000);
      let n = 0; const dt = setInterval(() => { n = (n + 1) % 7; const d = $('#dots'); if (d) d.textContent = '・'.repeat(n); }, 400);
      let finished = false;
      const end = () => {
        if (finished) return; finished = true;
        clearInterval(dt); stopBeat();
        box.innerHTML = `<div class="res">${s.ok ? '🌸 合格・成功！' : '🍂 残念……'}</div>`;
        Audio2.se(s.ok ? 'cheer' : 'shock');
        setTimeout(() => { box.classList.remove('on'); on = false; Audio2.setDuck(false); done(); }, 1400);
      };
      const t = setTimeout(end, S.durationMs);
      setTimeout(() => { if (finished) return; if (Options.get().suspenseSkip) { $('.tap', box).textContent = 'タップで結果へ'; box.onclick = () => { clearTimeout(t); end(); }; } }, S.skippableAfterMs);
    },
  };
})();
