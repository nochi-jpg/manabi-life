'use strict';
// ===== メイン画面（ui/mock.html） =====
const Main = (() => {
  let el = null, timer = 0, postQ = [], running = false, famPage = 0;
  const speed = () => (G && G.uiSpeed != null ? G.uiSpeed : Options.get().speed || 1);
  const BASE_MS = 1500;

  function skeleton() {
    el.innerHTML = `
      <div id="head">
        <div class="date"><span class="ssn" id="ssnIc">🌸</span><span id="date" class="num"></span></div>
        <div class="pname" id="pname"></div>
        <div class="ctrl"><span class="lb2">⏳ 人生</span><span class="bar c-mint lifebar"><i id="lifebar"></i></span>
          <div id="speed">
            <button data-s="0" title="一時停止"><span class="pz"></span></button>
            <button data-s="1" title="ふつう"><span class="pl"></span></button>
            <button data-s="2">×2</button><button data-s="4">×4</button>
          </div></div>
      </div>
      <div class="panel" id="hero"><div class="pic" id="pic"><img id="faceImg" alt=""><span class="place" id="bgTag"></span><button id="backChoice">💬 選択肢に<br>もどる ▶</button></div><div class="role" id="role"></div></div>
      <div class="panel" id="stat"><div id="statL"></div><div id="statR"></div></div>
      <div id="mid">
        <button id="focusBtn"></button>
        <div class="seasons" id="ssn">${SS_NAME.map((n, i) => `<span>${SS_EMOJI[i]} ${n}</span>`).join('')}</div>
      </div>
      <div id="tl"><div class="top"><div class="hd">📜 タイムライン</div>
        <div class="sz">${['s', 'm', 'l'].map((k) => `<button data-sz="${k}">${{ s: '小', m: '中', l: '大' }[k]}</button>`).join('')}</div></div>
        <div id="feed"></div></div>
      <div id="paused">⏸ 一時停止中</div>
      <div class="panel rs" id="pS"></div>
      <div class="panel rs" id="pM"></div>
      <div class="panel rs" id="pF"></div>
      <div id="foot"><button class="main" id="repBtn">📋 通知表</button><button id="logBtn">📖 バックログ</button><button id="optBtn">⚙️ オプション</button></div>
      <div id="sus"></div>`;
    $$('#speed button', el).forEach((b) => (b.onclick = () => setSpeed(+b.dataset.s)));
    $$('[data-sz]', el).forEach((b) => (b.onclick = () => { Options.set('tlSize', b.dataset.sz); applySize(); }));
    $('#focusBtn', el).onclick = () => openFocus();
    $('#backChoice', el).onclick = () => Popup.restore();
    $('#repBtn', el).onclick = () => { stop(); Popup.reports(() => { refresh(); kick(); }); };
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
    $('#pname', el).innerHTML = `${hp >= 70 ? '😄' : hp >= 50 ? '🙂' : hp >= 30 ? '😐' : '😣'} <span class="pn">${esc(G.given)}</span> <small>${G.age}歳</small>`;
    $('#lifebar', el).style.setProperty('--w', Math.min(100, (G.age / 90) * 100) + '%');
    const bg = bgOf();
    $('#pic', el).style.backgroundImage = `url(${asset(bg.file)})`;
    const fi = $('#faceImg', el), ff = faceImgOf(G); if (fi.getAttribute('src') !== ff) fi.src = ff;
    $('#bgTag', el).textContent = '📍 ' + bg.label;
    $('#role', el).innerHTML = roleHtml();
    drawStats();
    $('#focusBtn', el).innerHTML = `<span class="k">重点方針</span>${Menu.focusLabel(G.focus)}<span class="arw">▼</span>`;
    $('#focusBtn', el).disabled = G.age < 6;
    pageStatus(); pageMoney(); pageFamily();
    $$('#speed button', el).forEach((b) => b.classList.toggle('on', +b.dataset.s === speed()));
    $('#paused', el).classList.toggle('on', speed() === 0);
    $('#repBtn', el).disabled = !G.reports.length;
    Audio2.bgm(Audio2.forLife(G));
  }
  function roleHtml() {
    if (G.job && G.job.id && Econ.working()) {
      const j = Menu.job(G.job.id) || {};
      const ind = D().ranks.industry[j.cat] || j.label;
      const st = Econ.curStep();
      const form = G.job.form !== 'seishain' && G.job.form !== 'civil_servant' ? `<span class="form">${esc((D().jobs.forms[G.job.form] || {}).label || D().flags.employment[G.job.form] || '')}</span>` : '';
      return `<span class="r1">${j.emoji || '💼'} ${esc(ind)}｜${esc(j.label)}</span><span class="r2">${st ? `<b>${esc(st.t)}</b>・` : ''}${G.jobYears + 1}年目${form}${G.employment === 'leave' ? '<span class="form">休職中</span>' : ''}${G.flags.long_commute ? '<span class="form">遠距離通勤</span>' : ''}</span>`;
    }
    if (G.school) {
      const stName = D().flags.stages[G.stage] || '';
      const grade = G.stage === 'ronin' ? '浪人中' : ['nursery', 'kindergarten'].includes(G.stage) ? `${G.age}歳児` : `${G.school.yearIn}年生`;
      const part = G.job && G.job.part ? ` ・ ${(Menu.job(G.job.part) || {}).emoji || ''}バイト` : '';
      return `<span class="r1">${G.school.emoji} ${esc(stName)}｜${esc(G.school.name)}</span><span class="r2"><b>${grade}</b>${part}</span>`;
    }
    if (G.age < 3) return `<span class="r1">🍼 家庭</span><span class="r2"><b>${G.age}歳</b></span>`;
    if (G.age < 6) return `<span class="r1">🏠 家庭</span><span class="r2"><b>${G.age}歳</b></span>`;
    const emp = G.employment === 'homemaker' ? (G.gender === 'M' ? '専業主夫' : '専業主婦') : D().flags.employment[G.employment] || '';
    const ic = { retired: '🌴', unemployed: '🔍', homemaker: '🏠', leave: '😌' }[G.employment] || '🏠';
    return `<span class="r1">${ic} ${esc(G.stage === 'hikikomori' ? '家で過ごしている' : emp)}</span><span class="r2"><b>${G.age}歳</b></span>`;
  }
  function bar(c, v, show = true) { return `<span class="bar ${c}"><i style="--w:${clamp(v, 0, 100)}%"></i></span><span class="v">${show ? Math.round(v) : '—'}</span>`; }
  function drawStats() {
    const s = G.stats;
    $('#statL', el).innerHTML = `<h3>🙂 本人ステータス</h3>
      <div class="row"><span class="lb">📚 学力</span>${bar('c-blue', s.academic)}</div>
      <div class="row"><span class="lb">😣 ストレス</span>${bar('c-red', s.stress)}</div>
      <div class="row"><span class="lb">🤝 人間関係</span>${bar('c-mint', s.social)}</div>
      <div class="row"><span class="lb">❤️ 健康</span>${bar('c-pink', s.health)}</div>
      <div class="row"><span class="lb">😊 満足感</span>${bar('c-gold', s.happiness)}</div>`;
    const work = G.job && G.job.id && Econ.working();
    const last = work ? `<span class="num">月 ${Math.round(Econ.overtime())}<small>時間</small></span>` : `<span class="dash">${Menu.isStudent() ? '— 学生 —' : '—'}</span>`;
    $('#statR', el).innerHTML = `<h3>💼 しごとステータス</h3>
      <div class="row"><span class="lb">💴 月収</span>${work ? `<span class="num">${round1(Econ.monthlyIncome()).toFixed(1)}<small>万円</small></span>` : `<span class="dash">${Menu.isStudent() ? '— 学生 —' : G.vars.pensionAge && G.age >= G.vars.pensionAge ? '年金 ' + Econ.pensionMonthly() + '万' : '—'}</span>`}</div>
      <div class="row"><span class="lb">💪 肉体負荷</span>${bar(work ? 'c-red' : 'c-gray', work ? s.physicalLoad : 0, work)}</div>
      <div class="row"><span class="lb">🧠 精神負荷</span>${bar(work ? 'c-purple' : 'c-gray', work ? s.mentalLoad : 0, work)}</div>
      <div class="row"><span class="lb">⭐ 仕事満足</span>${bar(work ? 'c-gold' : 'c-gray', work ? s.jobSatisfaction : 0, work)}</div>
      <div class="row"><span class="lb">🕘 残業</span>${last}</div>`;
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

  // ---------- 右：状況・お金・家族（切りかえなしで全部見せる） ----------
  // はみ出さないチップ：入るだけ並べて、のこりは「+N」
  const chips = (arr, max = 2) => {
    if (!arr.length) return '<span class="chips"><span class="chip no">なし</span></span>';
    const show = arr.slice(0, max).map((x) => `<span class="chip cut">${x}</span>`).join('');
    return `<span class="chips">${show}${arr.length > max ? `<span class="chip more" data-more="1">+${arr.length - max}</span>` : ''}</span>`;
  };
  function lists() {
    const lessons = G.clubs.map((c) => { const d = Menu.club(c.id); return d ? `${d.emoji} ${esc(d.label.replace(/（.*）/, ''))}` : ''; }).filter(Boolean);
    const hobbies = G.hobbies.map((id) => { const d = Menu.hobby(id); return d ? `${d.emoji} ${esc(d.label.replace(/（.*）/, ''))}` : ''; }).filter(Boolean);
    const love = people('spouse').map((x) => `💍 ${esc(x.name)}${G.flags.separated ? '（別居中）' : `（${Math.max(1, G.year - (G.vars.marriedYear ?? G.year) + 1)}年目）`}`).concat(people('partner').map((x) => `💕 ${esc(x.name)}`));
    const LIC = D().flags.flags.license;
    const lic = Object.keys(LIC).filter((f) => G.flags[f]).map((f) => `📜 ${esc(licLabel(f))}`);
    const HE = ['dz_diabetes', 'dz_hypertension', 'dz_depression', 'dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast', 'dz_heart', 'dz_stroke_after', 'dz_dementia', 'dz_allergy', 'dz_asthma', 'injury_sports', 'injury_traffic'];
    const ill = HE.filter((f) => G.flags[f]).map((f) => `🏥 ${esc(D().flags.flags.health[f] || f)}`);
    const other = [];
    if (G.vars.phone) other.push(G.vars.phoneNoRule ? '📱 スマホ' : '📱 スマホ（ルールあり）');
    if (G.flags.owns_car) other.push('🚗 車'); if (G.flags.pet) other.push('🐶 ペット'); if (G.flags.exercise_habit) other.push('🏃 運動習慣');
    if (G.flags.smoker) other.push('🚬 たばこ'); if (G.flags.drinker || G.flags.heavy_drinker) other.push('🍺 お酒');
    if (G.flags.nisa) other.push('📈 NISA'); if (G.flags.caregiving) other.push('🤲 介護中'); if (G.flags.volunteer) other.push('🤝 ボランティア');
    if (G.flags.welfare) other.push('🏛️ 生活保護');
    return { lessons, hobbies, love, lic, ill, other };
  }
  function pageStatus() {
    const L = lists();
    const rows = [['🏠 住まい', null, `<span class="tx1">${esc(Fam.livingLabel())}</span>`], [`🎒 ${G.age >= 12 && G.age < 23 ? '部活など' : '習い事'}`, L.lessons], ['✨ 趣味', L.hobbies], [G.flags.married ? '💍 結婚' : '💕 恋愛', L.love], ['📜 資格', L.lic], ['🏥 病気', L.ill], ['🧳 その他', L.other]];
    $('#pS', el).innerHTML = `<h3>📍 状況</h3>` + rows.map(([k, arr, html], i) => `<div class="kv" data-i="${i}"><span class="k">${k}</span>${html || chips(arr, 2)}</div>`).join('');
    $$('#pS .kv', el).forEach((row) => { const m = $('[data-more]', row); const r = rows[+row.dataset.i]; if (m) m.onclick = () => Popup.list(r[0], r[1]); });
  }
  function licLabel(f) { const m = ({ lic_car: '普通自動車免許', lic_bike: 'バイク免許', lic_teacher_elem: '小学校教員免許', lic_teacher_sec: '中学・高校教員免許', lic_nurse: '看護師', lic_doctor: '医師', lic_dentist: '歯科医師', lic_pharmacist: '薬剤師', lic_lawyer: '弁護士', lic_pt: '理学療法士', lic_cook: '調理師', lic_beauty: '美容師', lic_pilot: 'パイロット', eiken_3: '英検3級', eiken_2: '英検2級', eiken_p1: '英検準1級', eiken_1: '英検1級', toeic_600: 'TOEIC 600点以上', toeic_800: 'TOEIC 800点以上（高得点）', toeic_900: 'TOEIC 900点以上（高得点）' })[f]; if (m) return m; const q = D().events_random.qualifications.find((x) => x.flag === f); return q ? q.label.replace(/（.*）/, '') : f; }
  function pageMoney() {
    const on = G.age >= 16;
    const d = G.lastDelta;
    let delta = '';
    if (on && d && Math.abs(d.v) >= 1) delta = d.bonus >= 5 ? `<span class="delta bonus">💰+${man(d.v)}</span>` : d.v > 0 ? `<span class="delta inc">+${man(d.v)}</span>` : `<span class="delta exp">${man(d.v)}</span>`;
    G.lastDelta = null;
    const debt = Econ.totalDebt();
    const tile = (cls, lb, v, extra = '') => `<div class="tile ${cls}"><small>${lb}</small><b class="num">${v}${extra}</b></div>`;
    const tiles = on ? tile(G.cash < 0 ? 'neg' : '', '💴 現金', `${man(Math.max(0, G.cash))}<u>万</u>`, delta) + tile('as', '📈 資産 ▶', `${man(Econ.assetsValue())}<u>万</u>`) + tile('debt', '💳 借金', `${man(debt)}<u>万</u>`) + tile('net', '🧮 合計', `${man(Econ.netWorth())}<u>万</u>`)
      : `<div class="tile wide"><small>🏠 家のくらし</small><b>${esc(bandOf(G.talents.familyWealth).label)}</b></div><div class="tile wide"><small>👛 自分のお金</small><b>16歳から</b></div>`;
    const hi = Fam.householdIncome(), ha = Fam.householdAssets(); const selfPart = (v) => (v > 0 ? [`自分 ${man(v)}`] : []);
    const incRow = hi.others.length ? `${man(hi.total)}万円（${selfPart(hi.self).concat(hi.others.slice(0, 2).map((x) => roleLabel(x.p) + ' ' + man(x.v))).join('・')}）` : Econ.annualIncome() ? `${man(Econ.annualIncome())}万円（自分）` : '—';
    const asRow = ha.others.length && on ? `${man(ha.total)}万円（${selfPart(ha.self).concat(ha.others.slice(0, 2).map((x) => roleLabel(x.p) + ' ' + man(x.v))).join('・')}）` : null;
    const ins = G.flags.cancer_insurance ? 'がん保険・医療保険' : G.flags.life_insurance ? '医療保険' : G.age < 22 && !G.job ? '親の健康保険（扶養）' : '公的な健康保険のみ';
    const ex = Econ.expenses();
    const tax = Object.entries(G.tax).filter(([k]) => k !== 'socialInsurance').reduce((a, [, v]) => a + v, 0);
    $('#pM', el).innerHTML = `<h3>💰 お金</h3><div class="tiles">${tiles}</div>
      <div class="kv"><span class="k">🏠 世帯年収</span><span class="tx1 num">${incRow}</span></div>
      <div class="kv"><span class="k">${asRow ? '🏦 世帯の資産' : '🛡️ 保険'}</span><span class="tx1 num">${asRow || ins}</span></div>
      <div class="kv ${on ? 'link' : ''}" id="exRow"><span class="k">🧾 月の支出</span><span class="tx1 num">${on ? `${round1(ex.total / 12)}万円 ・ 生活レベル ${Econ.LEVELS[Econ.lifeLevel()].l}` : '— （16歳から）'}</span></div>
      <div class="kv"><span class="k">🏛️ 税金</span><span class="tx1 num">これまで ${man(tax)}万円</span></div>`;
    if (on) $('#exRow', el).onclick = () => { stop(); Popup.expenses(() => { refresh(); kick(); }); };
    const at = $('#pM .tile.as', el); if (at) at.onclick = () => { stop(); Popup.assets(() => { refresh(); kick(); }); };
  }
  const FAM_ORDER = ['spouse', 'partner', 'child', 'father', 'mother', 'sibling', 'grandparent', 'grandchild'];
  function famList() { return G.people.filter((p) => FAM_ORDER.includes(p.role) && (p.alive || calYear() - (p.diedYear || 0) < 3)).sort((a, b) => FAM_ORDER.indexOf(a.role) - FAM_ORDER.indexOf(b.role) || (b.alive - a.alive) || b.age - a.age); }
  function pageFamily() {
    const list = famList();
    const per = 4; const pages = Math.max(1, Math.ceil(list.length / per));
    famPage = clamp(famPage, 0, pages - 1);
    const vis = list.slice(famPage * per, famPage * per + per);
    const tag = (p) => (!p.alive ? '<span class="tag out">—</span>' : p.together ? '<span class="tag in">同居</span>' : `<span class="tag out">${esc(Fam.prefName(p.pref).replace(/[都府県]$/, ''))}</span>`);
    $('#pF', el).innerHTML = `<h3>👪 家族${pages > 1 ? `<span class="pg"><button class="pgb" id="fp">◀</button><span class="num">${famPage + 1}/${pages}</span><button class="pgb" id="fn">▶</button></span>` : ''}</h3>` +
      (vis.length ? vis.map((p) => `<div class="kv fam ${p.alive ? '' : 'dead'}" data-id="${p.id}"><span class="av">${p.alive ? roleEmoji(p) : '🕊️'}</span><span class="k">${esc(roleLabel(p))} ${p.alive ? p.age : ''}</span><span class="nm">${esc(p.role === 'grandparent' ? (p.side === 'mother' ? '母方' : '父方') : p.name || '')}</span><span class="w">${esc(Fam.statusLabel(p))}</span>${tag(p)}</div>`).join('') : '<div class="kv"><span class="k">家族</span><span>ひとり</span></div>');
    if (pages > 1) { $('#fp', el).onclick = () => { famPage = (famPage - 1 + pages) % pages; pageFamily(); }; $('#fn', el).onclick = () => { famPage = (famPage + 1) % pages; pageFamily(); }; }
    $$('#pF .fam', el).forEach((r) => (r.onclick = () => { stop(); const L = famList(); Popup.person(L, L.findIndex((x) => x.id === r.dataset.id), () => kick()); }));
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
  // 選択肢を最小化しているあいだ：顔グラに「選択肢にもどる」、ゲームは進まない
  function setMini(on) { if (!el) return; el.classList.toggle('mini', on); const b = $('#backChoice', el); if (b) b.classList.toggle('on', on); if (on) { stop(); refresh(); } }
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
      if (r.end) { refresh(); flushPosts(); setTimeout(() => Popup.death(deathInfo(), () => Screens.result.finish()), 900); return; }
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
    const withResult = () => { if (r.result) { flushPosts(); refresh(); Popup.result(r.result, after); } else after(); };
    if (r.suspense) Sus.show(r.suspense, withResult); else withResult();
  }
  function deathInfo() {
    const jobs = (G.jobRecord || []).map((x) => x.l).filter((x, i, a) => a.indexOf(x) === i && x !== '引退');
    const kids = people('child', false).length, gks = people('grandchild', false).length;
    const sp = G.people.find((p) => p.role === 'spouse');
    const fam = sp && sp.alive ? `家族に見守られて` : kids ? '子どもたちに見守られて' : '';
    return { year: calYear(), ss: SS_NAME[G.q], name: G.given, age: G.age, cause: G.deathCause || '病気', fam, edu: eduLabel(), job: jobs[jobs.length - 1] || 'なし', family: [sp ? roleLabel(sp) : null, kids ? `子ども${kids}人` : null].filter(Boolean).join('・') || 'ひとり', gks };
  }
  function flushPosts() { while (postQ.length) addPost(postQ.shift()); }
  const FX_L = { happiness: '満足感', stress: 'ストレス', social: '人間関係', health: '健康', academic: '学力', jobSatisfaction: '仕事満足', mentalLoad: '精神負荷', rel: '関係', cash: '所持金' };
  function fxHtml(fx) {
    if (!fx || !fx.length) return '';
    const bad = (x) => (x.k === 'stress' || x.k === 'mentalLoad' ? x.d > 0 : x.d < 0);
    return `<span class="fx">${fx.slice(0, 3).map((x) => `<span class="chip ${bad(x) ? 'rd' : 'gr'}">${FX_L[x.k] || x.k}${x.d > 0 ? '+' : '−'}${Math.abs(x.d)}${x.k === 'cash' ? '万' : ''}</span>`).join('')}</span>`;
  }
  function addPost(p) {
    const f = $('#feed', el); if (!f) return;
    const d = document.createElement('div');
    d.className = 'post' + (p.kind ? ' ' + p.kind : '');
    d.innerHTML = `<span class="y">${p.y}年</span><span class="m">${p.m}月</span><span class="a">${p.age}歳</span><span class="e">${p.e}</span><span class="t">${esc(p.t)}${p.chosen ? `<small>選んだ：${esc(p.chosen)}</small>` : ''}</span>${fxHtml(p.fx)}`;
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
      Popup.clearMini();
      skeleton(); refresh(); fillFeed();
      if (G.pending) { Popup.choice(G.pending.view, (res) => handle(res)); }
      else kick();
    },
    refresh, kick, stop, fxHtml, FX_L, setMini,
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
      box.innerHTML = `<div class="ic">${s.emoji || '📝'}</div><div class="stx">${esc(s.text.replace(/……$/, ''))}<span id="dots"></span></div><div class="tap"></div>`;
      box.classList.add('on');
      const stopBeat = Audio2.loopSe(S.sound, S.durationMs - 1000);
      let n = 0; const dt = setInterval(() => { n = (n + 1) % 7; const d = $('#dots'); if (d) d.textContent = '・'.repeat(n); }, 400);
      let finished = false;
      const end = () => {
        if (finished) return; finished = true;
        clearInterval(dt); stopBeat();
        const win = s.win || (s.kind === 'exam' ? '🌸 合格！' : '🌸 成功！'), lose = s.lose || (s.kind === 'exam' ? '🍂 不合格……' : '🍂 残念……');
        box.innerHTML = `<div class="res">${s.ok ? win : lose}</div>`;
        Audio2.se(s.ok ? 'cheer' : 'shock');
        setTimeout(() => { box.classList.remove('on'); on = false; Audio2.setDuck(false); done(); }, 1400);
      };
      const t = setTimeout(end, S.durationMs);
      setTimeout(() => { if (finished) return; if (Options.get().suspenseSkip) { $('.tap', box).textContent = 'タップで結果へ'; box.onclick = () => { clearTimeout(t); end(); }; } }, S.skippableAfterMs);
    },
  };
})();
