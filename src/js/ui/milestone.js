'use strict';
// ===== イベントCG（data/cg.json）：assets/cg/<id>.jpg を置くだけで使われる。なければ null =====
const CG = (() => {
  const files = () => (window.DATA && window.DATA.cgFiles) || {};
  // id の {g} は主人公の性別（M/F）。配列なら、あるものの最初
  function url(id) {
    if (!id) return null;
    if (Array.isArray(id)) { for (const x of id) { const u = url(x); if (u) return u; } return null; }
    const k = String(id).replace('{g}', (G && G.gender) || 'M');
    const f = files()[k];
    return f ? asset(f) : null;
  }
  const C = () => D().cg || {};
  return {
    url,
    forSuspense: (ev) => url((C().suspense || {})[ev]),
    forSuspenseResult(ev, ok) {
      const R = C().suspenseResult || {};
      const kind = (R.examEvents || []).includes(ev) ? 'exam' : (R.jobEvents || []).includes(ev) ? 'job' : null;
      return kind ? url(R[kind][ok ? 'ok' : 'ng']) : null;
    },
    forChoice: (ev) => url((C().choice || {})[ev]),
    forMilestone: (k) => url((C().milestone || {})[k]),
  };
})();

// ===== 人生の分岐点（docs/13 §6）：状態が前と変わったら、大きなポップアップで知らせる =====
// イベントごとに書きこまず、在籍段階・仕事・結婚・子ども・住む県などの「変化」から見つける
const Milestone = (() => {
  const SCHOOL = ['elem', 'jhs', 'hs', 'hs_corr', 'hs_night', 'kosen', 'univ', 'univ_med', 'junior_college', 'vocational', 'grad_master', 'grad_doctor', 'grad_prof', 'abroad_study', 'free_school'];
  const ILL = ['dz_cancer_lung', 'dz_cancer_stomach', 'dz_cancer_colon', 'dz_cancer_breast', 'dz_heart', 'dz_stroke_after', 'dz_dementia'];
  const LOSS = ['father', 'mother', 'spouse', 'child'];
  function snap() {
    if (!G) return null;
    const j = G.job && G.job.id && Econ.working() ? G.job.id : null;
    const st = j ? Econ.curStep() : null;
    return {
      stage: G.stage, school: G.school ? G.school.name : null, job: j, emp: G.employment,
      rank: G.rank || 0, rankT: st ? st.t : null, steps: j ? Econ.steps().length : 0,
      partner: !!G.flags.has_partner, married: !!G.flags.married, marriageNo: G.vars.marriageNo || 0,
      kids: G.people.filter((p) => p.role === 'child').map((p) => p.id),
      pref: G.pref, abroad: !!G.flags.lives_abroad, house: !!G.flags.owns_house, pregnant: !!G.flags.pregnant,
      ill: ILL.filter((f) => G.flags[f]),
      alive: G.people.filter((p) => LOSS.includes(p.role) && p.alive).map((p) => p.id),
    };
  }
  const jobLabel = (id) => (Menu.job(id) || {}).label || '';
  const nm = (p) => (p ? p.name || roleLabel(p) : '');
  // 変わったところ → [{cat, head, sub, cg}]
  function diff(a, b) {
    if (!a || !b) return [];
    const out = [];
    const add = (cat, head, sub, cg) => out.push({ cat, head, sub: sub || '', cg: cg || null });
    // ---- 進路 ----
    const wasSchool = SCHOOL.includes(a.stage), isSchool = SCHOOL.includes(b.stage);
    if (b.stage !== a.stage || (isSchool && b.school !== a.school)) {
      if (wasSchool && a.school && (!isSchool || b.school !== a.school) && b.stage !== 'ronin') add('進路', `${a.school}を卒業した`, '', 'graduation');
      if (isSchool && b.school && b.school !== a.school) add('進路', `${b.school}に入学した`, b.stage === 'elem' ? 'ランドセルを背負って、小学生になった。' : '', b.stage === 'elem' ? 'entrance_elem' : null);
      if (b.stage === 'ronin') add('進路', '浪人することになった', '来年の入試に向けて、もう1年勉強する。');
    }
    // ---- 仕事 ----
    if (b.job && b.job !== a.job) {
      if (!a.job) add('仕事', `${jobLabel(b.job)}として働き始めた`, b.rankT ? `はじめは「${b.rankT}」から。` : '', a.emp === 'none' || a.emp === 'student_part' ? 'first_job' : null);
      else add('仕事', `${jobLabel(b.job)}に転職した`, `前の仕事：${jobLabel(a.job)}`);
    } else if (b.job && b.job === a.job && b.rank > a.rank && b.steps && b.rank >= Math.floor(b.steps / 2) && b.rankT) {
      add('仕事', `${b.rankT}になった`, `${jobLabel(b.job)}として、責任のある立場になった。`);
    }
    if (b.emp !== a.emp) {
      if (b.emp === 'unemployed') add('仕事', '仕事を失った', a.job ? `${jobLabel(a.job)}の仕事が終わった。` : '');
      if (b.emp === 'retired') add('仕事', '仕事を引退した', 'これからは年金でくらす。', 'retire');
    }
    // ---- 家族 ----
    if (b.partner && !a.partner && !b.married) { const p = person('partner'); add('家族', `${nm(p)}と付き合い始めた`, '恋人ができた。'); }
    if (b.married && !a.married) { const p = person('spouse'); add('家族', `${nm(p)}と${b.marriageNo > 1 ? '再婚' : '結婚'}した`, '', 'marry'); }
    if (!b.married && a.married && G.flags.divorced) add('家族', '離婚した', '別々の道を歩くことになった。');
    if (b.pregnant && !a.pregnant) add('家族', G.gender === 'F' ? '赤ちゃんができた' : `${nm(person('spouse')) || '妻'}に赤ちゃんができた`, 'もうすぐ家族がふえる。', 'pregnant');
    for (const id of b.kids.filter((x) => !a.kids.includes(x))) { const c = G.people.find((p) => p.id === id); if (c && c.age <= 1) add('家族', `${nm(c)}が生まれた`, `${roleLabel(c)}の誕生。`, 'birth'); }
    // ---- くらし ----
    if (b.abroad && !a.abroad) add('くらし', '海外で暮らし始めた', '');
    else if (b.pref !== a.pref) add('くらし', `${Fam.prefName(b.pref)}に引っ越した`, `${Fam.prefName(a.pref)}から${Fam.prefName(b.pref)}へ。`, 'move');
    if (b.house && !a.house) add('くらし', 'マイホームを手に入れた', '', 'house');
    // ---- 健康・別れ（現実的モードだけで起きる） ----
    for (const f of b.ill.filter((x) => !a.ill.includes(x))) add('健康', `${D().flags.flags.health[f] || '大きな病気'}と診断された`, '');
    for (const id of a.alive.filter((x) => !b.alive.includes(x))) { const p = G.people.find((q) => q.id === id); if (p && !p.alive) add('別れ', `${roleLabel(p)}の${nm(p)}が亡くなった`, ''); }
    return out.slice(0, 3);
  }
  let base = null;
  return {
    reset() { base = snap(); },
    // 前に見たときから変わったものを返して、基準を今にする
    take() { const now = snap(); const d = diff(base, now); base = now; return d; },
  };
})();
