'use strict';
// ===== 職業の詳細（ui/job.html）・学校の詳細（ui/school.html）：候補をタップすると必ず出る =====
const Detail = (() => {
  const JD = () => D().job_display;
  const lvl = (v) => (v >= JD().levels.large ? ['大', 'h'] : v >= JD().levels.mid ? ['中', 'm'] : ['小', 'l']);
  const effLv = (v) => { const a = Math.abs(v); const L = JD().statEffects.displayLevels.find(([t]) => a >= t); return L ? L[1] : '−'; };
  const rcCls = (r) => (r >= 70 ? '' : r >= 40 ? 'mid' : 'lo');
  const isSchool = (it) => !it.job && !/^(pre_|ab_|ls_|al_|c_|u_tennis|h_)/.test(it.tmpl || it.id || '') && !!(Menu.school(it.tmpl) || it.dept || (it.id || '').includes('#') || (it.id || '').startsWith('u_affil'));
  const bgFile = (id) => (D().visuals.backgrounds.find((b) => b.id === id) || D().visuals.backgrounds[0]).file;
  const eduLabel = ['中卒以上', '高校卒以上', '専門・短大・高専卒以上', '大学卒以上', '大学院（修士）以上', '博士'];

  function jobEffects(j) {
    const E = { ...(JD().statEffects.byCat[j.cat] || {}) };
    const add = (o) => { for (const [k, v] of Object.entries(o)) if (k !== 'if') E[k] = (E[k] || 0) + v; };
    const [pl, ml] = j.load || [30, 40];
    for (const m of JD().statEffects.loadMods) {
      if (m.if === 'physicalLoad>=70' && pl >= 70) add(m); if (m.if === 'mentalLoad>=70' && ml >= 70) add(m);
      if (m.if === 'overtime>=40' && (j.overtime || 0) >= 40) add(m); if (m.if === 'shiftWork' && j.shiftWork) add(m);
      if (m.if === 'likeMatch' && (j.tags || []).includes(Cond.likeMain())) add(m);
    }
    return E;
  }
  function effHtml(E) {
    return `<div class="eff">${JD().statEffects.stats.map((k) => { const v = E[k] || 0; const good = k === 'stress' ? v < 0 : v > 0; const l = effLv(v); return `<div>${JD().statEffects.labels[k]}<b class="${l === '−' ? '' : good ? 'up' : 'dn'}">${l === '−' ? '−' : (v > 0 ? '↑ ' : '↓ ') + l}</b></div>`; }).join('')}</div>`;
  }
  function frame(cs, left, right, ok, back, okLabel) {
    const box = Popup.show(`<div class="cs">${cs}</div><div class="dleft">${left}</div><div class="dright">${right}
      <div class="btns"><button id="dBack">◀ ほかの候補にもどる</button><button class="main" id="dOk">${okLabel} ▶</button></div></div>`, 'dbox');
    $('#dBack', box).onclick = back; $('#dOk', box).onclick = ok;
  }

  function job(item, ok, back) {
    const j = Menu.job(item.id); if (!j) { ok(); return; }
    const form = j.form || 'seishain';
    const F = D().jobs.forms[form] || {};
    const sal0 = Econ.salaryPreview(j);
    const peak = Math.round((j.salary ? j.salary[1] : sal0) * pref().wage * (F.salaryMul ?? 1));
    const bm = JD().pay.bonusMonthsByForm[form] || 0;
    const take = round1((sal0 / (12 + bm)) * JD().pay.takeHome);
    const [pl, ml] = j.load || [30, 40];
    const plv = Math.round(pl + (j.overtime || 0) * 0.3), mlv = Math.round(ml + (j.overtime || 0) * 0.4);
    const stars = clamp((JD().welfare.byForm[form] || 3) + (JD().welfare.catBonus[j.cat] || 0), 1, 5);
    const ai = D().ai_impact.jobs[j.id] || { risk: 0 };
    const aiL = ai.risk >= 0.7 ? ['大', 'dn', 'AIや機械に置きかわりやすい'] : ai.risk >= 0.45 ? ['中', 'mid', '仕事のやり方が大きく変わりそう'] : ['小', 'up', '人にしかできない部分が大きい'];
    const chips = [];
    (j.requires || []).forEach((f) => chips.push(`<span class="chip ${G.flags[f] ? 'ok' : 'ng'}">${G.flags[f] ? '✓' : '✗'} ${esc(licName(f))}</span>`));
    chips.push(`<span class="chip ok">✓ ${eduLabel[j.eduMin || 0]}</span>`);
    if (j.shiftWork) chips.push('<span class="chip">🌙 夜勤・交代制</span>');
    chips.push(`<span class="chip">⏰ 残業 月${j.overtime || 10}時間</span>`);
    if (j.transfer) chips.push('<span class="chip">🚚 転勤あり</span>');
    if (j.remoteOk) chips.push('<span class="chip">🏠 在宅OK</span>');
    const bgId = D().visuals.byJobOverride[j.id] || D().visuals.byJobCat[j.cat] || 'bg_office';
    const ind = D().ranks.industry[j.cat] || '';
    const left = `<div class="img" style="background-image:url(${asset(bgFile(bgId))})"><span class="tag">📍 ${esc(pref().name)}</span></div>
      <div class="jt"><span class="e">${j.emoji}</span><span class="n"><small>${esc(ind)}｜${esc(F.label || '')}</small>${esc(j.label)}</span></div>
      <div class="chips">${chips.join('')}</div>
      <div class="drate ${rcCls(item.rate)}"><span>この職場の合格率</span><b>${item.rate}%</b></div>
      <div class="ai">🤖 AIの影響：<b class="${aiL[1]}">${aiL[0]}</b>（${aiL[2]}）</div>`;
    const right = `<div class="sec"><h4>💴 お給料</h4><div class="money">
        <div><span>年収（1年目）</span><b>${sal0}</b><small>万円</small></div>
        <div><span>年収（${j.salary ? j.salary[2] : 45}歳ごろ）</span><b>${peak}</b><small>万円</small></div>
        <div><span>手取りの月収</span><b>${take}</b><small>万円</small></div></div>
        <div class="note">💰 賞与（ボーナス）：${bm ? `年2回・合計${bm}か月分` : 'なし'}　／　${j.variance ? '収入は年によって大きく変わる' : '手取り＝給料から税金・保険料をひいた額'}</div></div>
      <div class="sec"><h4>⚖️ たいへんさ・はたらきやすさ</h4>
        <div class="ld"><span>💪 肉体負荷</span><span class="bar c-red"><i style="--w:${clamp(plv, 0, 100)}%"></i></span><span class="num">${clamp(plv, 0, 100)}</span><span class="lv ${lvl(plv)[1]}">${lvl(plv)[0]}</span></div>
        <div class="ld"><span>🧠 精神負荷</span><span class="bar c-blue"><i style="--w:${clamp(mlv, 0, 100)}%"></i></span><span class="num">${clamp(mlv, 0, 100)}</span><span class="lv ${lvl(mlv)[1]}">${lvl(mlv)[0]}</span></div>
        <div class="ld"><span>🏢 福利厚生</span><span class="stars">${'★'.repeat(stars)}<i>${'★'.repeat(5 - stars)}</i></span><span></span><span class="lv ${stars >= 4 ? 'l' : stars >= 3 ? 'm' : 'h'}">${stars >= 4 ? 'よい' : stars >= 3 ? 'ふつう' : '少ない'}</span></div></div>
      <div class="sec"><h4>📊 この仕事を1年続けたときのステータスの変化（めやす）</h4>${effHtml(jobEffects(j))}</div>`;
    frame(`💼 ${G.age < 23 ? '就職活動' : '仕事さがし'} ・ ${calYear()}年${MONTH[G.q]}月`, left, right, ok, back, 'この職場を受ける');
  }
  function licName(f) { const q = D().events_random.qualifications.find((x) => x.flag === f); if (q) return q.label.replace(/（.*）/, ''); return ({ lic_car: '普通免許', lic_large: '大型免許', lic_nurse: '看護師免許', lic_doctor: '医師免許', lic_dentist: '歯科医師免許', lic_pharmacist: '薬剤師免許', lic_lawyer: '弁護士資格', lic_pt: '理学療法士', lic_teacher_elem: '小学校教員免許', lic_teacher_sec: '中高教員免許', lic_nursery: '保育士', lic_beauty: '美容師免許', lic_cpa: '公認会計士', lic_tax: '税理士', lic_architect: '建築士', lic_electric: '電気工事士' })[f] || f; }

  function school(item, ok, back) {
    const t = Menu.school(item.tmpl) || {};
    const d = item.dept ? Menu.dept(item.dept) : null;
    const stage = item.stage || t.stage || 'univ';
    const years = item.years || t.years || { jhs: 3, hs: 3, kosen: 5, univ: 4, univ_med: 6, junior_college: 2, vocational: 2, elem: 6 }[stage] || 3;
    const yearly = item.cost ?? t.cost ?? 0;
    const entry = item.entry ?? (stage === 'univ' || stage === 'univ_med' ? 28 : stage === 'hs' || stage === 'jhs' ? 10 : 20);
    const total = entry + yearly * years;
    const bgId = D().visuals.byStage[stage] || 'bg_univ';
    const where = item.where === 'abroad' ? '海外' : item.city ? prefOf(item.city).name : pref().name;
    const away = item.where === 'abroad' || !!item.city;
    const subs = Object.entries((d && d.subjects) || t.subjects || { jpn: 1, math: 1, eng: 1 }).slice(0, 4);
    const need = item.h ? Math.round(clamp((item.h - 25) * 2, 1, 99)) : null;
    const SUBN = { jpn: '📖 国語', math: '🔢 数学', sci: '🔬 理科', soc: '🌏 社会', eng: '🔤 英語', pe: '🏃 体育', art: '🎨 美術' };
    const type = /私立/.test(t.label || item.name) ? '私立' : /国立/.test(t.label || item.name) ? '国立' : /公立|県立/.test(t.label || item.name) ? '公立' : '';
    const track = d ? ({ bunkei: '文系', rikei: '理系', both: '文系・理系' })[d.track] : '';
    const after = d && d.opens ? d.opens.map((o) => { const j = D().jobs.jobs.find((x) => x.cat === o || (x.tags || []).includes(o) || x.id.includes(o)); return j ? `${j.emoji} ${j.label}` : ''; }).filter(Boolean).slice(0, 3).join('・') : stage === 'hs' ? `大学・専門学校、就職（${pref().name}の大学進学率 ${pref().univRate}%）` : stage === 'jhs' ? '系列の高校・高校受験' : '';
    const q = t.quality || 1;
    const E = { academic: (q - 1) * 6 + 0.6, stress: stage === 'hs' || stage === 'jhs' ? 1 + (item.h || 50) / 60 : 0.8, social: away ? 1 : 1.2, health: 0, happiness: 0.6 };
    const left = `<div class="img" style="background-image:url(${asset(bgFile(bgId))})"><span class="tag">📍 ${esc(where)}（${away ? 'ひとり暮らし' : '実家から通学'}）</span></div>
      <div class="jt"><span class="e">${item.emoji || t.emoji || '🏫'}</span><span class="n"><small>${[type, years + '年制', track].filter(Boolean).join('｜')}</small>${esc(item.name)}</span></div>
      <div class="chips">${item.h ? `<span class="chip">📈 偏差値 ${item.h}</span>` : '<span class="chip">📄 書類・面接</span>'}${t.note ? `<span class="chip">💡 ${esc(t.note.split('。')[0].slice(0, 22))}</span>` : ''}</div>
      ${item.rate != null ? `<div class="drate ${rcCls(item.rate)}"><span>あなたの合格率</span><b>${item.rate}%</b></div>` : ''}`;
    const right = `<div class="sec"><h4>💴 学費（${G.age < 18 ? '家計から' : '家計・奨学金から'}）</h4><div class="money">
        <div><span>入学のとき</span><b>${entry + yearly}</b><small>万円</small></div>
        <div><span>2年目から（毎年）</span><b>${yearly}</b><small>万円</small></div>
        <div><span>${years}年間の合計</span><b>${total}</b><small>万円</small></div></div></div>
      ${need ? `<div class="sec"><h4>✏️ 入試で見られる教科（あなた ／ めやす）</h4>
        ${subs.map(([k]) => { const me = Math.round(G.subj[k] ?? 50); return `<div class="subj"><span>${SUBN[k] || k}</span><span class="bar c-blue"><i style="--w:${me}%"></i></span><span class="me ${me >= need ? 'ok' : 'ng'}">${me}</span><span class="need">${need}</span></div>`; }).join('')}</div>` : ''}
      <div class="sec"><h4>🧭 卒業したあと ／ 📊 ${years}年間のステータスの変化</h4>
        ${after ? `<div class="after"><span class="k">おもな進路</span><span>${esc(after)}</span></div>` : ''}
        ${effHtml(E)}</div>`;
    frame(`🎯 進路選択 ・ ${calYear()}年${MONTH[G.q]}月 ・ ${Engine.ageLabel()}`, left, right, ok, back, 'この学校を受ける');
  }
  return { enabled: true, job, school, isSchool };
})();
