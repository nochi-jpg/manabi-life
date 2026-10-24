# 10 イベント一覧（自動生成）

> このファイルは `node tools/catalog.js` で `data/events_*.json` から生成しています。直接編集せず、JSONを直してから再生成してください。

## 必須イベント（条件を満たすと必ず起こる）（66件）

| | ID | 時期 | 条件 | 文章 | 選択肢 |
|---|---|---|---|---|---|
| 👶 | `ev_m_birth` | 0歳 春 |  | {year}年{month}月、{pref}で「{surname} {given}」が生まれた。家族は{family}。 |  |
| 🧸 | `ev_m_preschool` | 3歳 春 |  | {name}も3歳。保育園や幼稚園をどうするか、家族で話し合っている。 | ［候補リスト:schools.preschool］ |
| 🧒 | `ev_m_like_3` | 3歳 秋 |  | {name}は、どんなことをしているときが一番楽しそう？ | 🏃 外で遊ぶ<br>📖 本を読む<br>🎨 絵をかく<br>🔢 数をかぞえる・パズル<br>🎮 テレビゲーム<br>🙂 とくに決まっていない |
| 🎒 | `ev_m_lesson_start` | 4歳 秋 |  | 近所の子が習い事を始めたらしい。{name}にも何かやらせてみる？ | ［候補リスト:clubs.lessons］<br>🏠 今はまだいい |
| 🎩 | `ev_m_ojuken` | 5歳 春 | 地域:AB | 「私立や国立の小学校を受けてみない？」と親が考えている。 | 🎩 お受験の準備をする（家計−60万）<br>🏫 近所の公立小学校に通う |
| 📝 | `ev_m_elem_exam` | 5歳 秋 |  | 小学校受験の日。受ける学校を選ぼう。 | ［候補リスト:schools.elementary］ |
| 🌸 | `ev_m_elem_entry` | 6歳 春 |  | ピカピカの1年生！{school}に入学した。 |  |
| 🧒 | `ev_m_like_6` | 6歳 夏 | 在籍:elem/free_school | 小学校にも慣れてきた。{name}が夢中になっているのは？ | 🏃 外で遊ぶ・体を動かす<br>📖 本を読む<br>🎨 絵をかく・工作<br>🔢 計算・パズル<br>🎮 テレビゲーム<br>🙂 とくになし |
| 📋 | `ev_m_report_card` | 冬 | 在籍:elem/jhs/hs/hs_corr/hs_night/kosen/free_school | {year}年3月。通知表が配られた。来年度は何を大事にする？ | ［候補リスト:focus］ |
| 🧭 | `ev_m_focus_adult` | 冬 | 在籍:univ/univ_med/junior_college/vocational/grad_master/grad_doctor/grad_prof/ronin/none/hikikomori | {year}年。新しい1年、どんなことを大事にする？ | ［候補リスト:focus］ |
| 📝 | `ev_m_juken_decide` | 9歳 春 | 在籍:elem / 除外:edu_elem_private / 地域:AB | 小学4年生。クラスで中学受験の塾に通い始める子が増えてきた。 | 📝 中学受験の塾に通う（3年で約250万）<br>📘 公立中高一貫校の適性検査だけ受ける<br>🏫 地元の公立中学に行く |
| ✏️ | `ev_m_jhs_exam` | 11歳 冬 | 在籍:elem / 必要:juken_track | いよいよ中学受験本番。受ける学校を選ぼう。（合格したら進学先になります） | ［候補リスト:schools.juniorHigh］<br>🏳️ やっぱり受験はやめる |
| 🎒 | `ev_m_jhs_entry` | 12歳 春 | 在籍:elem/free_school | 中学生になった。{school}に入学。 |  |
| 🏸 | `ev_m_club_jhs` | 12歳 春 | 在籍:jhs | 部活動の見学期間。どの部に入る？ | ［候補リスト:clubs.jhsClubs］ |
| 🎯 | `ev_m_hs_target` | 14歳 秋 | 在籍:jhs/free_school | 中3の秋。三者面談で、先生と親から志望校の候補を出された。 | ［候補リスト:schools.highSchool］<br>🔧 高校には行かず働く |
| ✏️ | `ev_m_hs_exam` | 14歳 冬 | 在籍:jhs/free_school | 高校入試の結果発表…… | 🏫 すべり止めの私立高校に行く<br>📕 公立の二次募集を受ける（合格率70%）<br>💻 通信制高校に行く<br>🌙 定時制高校に行って昼は働く<br>🔧 高校に行かず働く |
| 🎓 | `ev_m_jhs_grad` | 14歳 冬 | 在籍:jhs/free_school | 中学校を卒業した。 |  |
| 🏫 | `ev_m_hs_entry` | 15歳 春 | 在籍:none / 必要:edu_jhs_grad | 高校生になった！{school}に入学。 |  |
| 🔧 | `ev_m_after_jhs_work` | 15歳 春 | 在籍:none / 必要:edu_jhs_grad | 中学を出て、働くことにした。どこで働く？（中卒で応募できる仕事） | ［候補リスト:jobs.jobs］<br>🏮 家の手伝いをする |
| 🏉 | `ev_m_club_hs` | 15歳 春 | 在籍:hs/kosen/hs_night | 高校の部活。どうする？ | ［候補リスト:clubs.hsClubs］ |
| 🔀 | `ev_m_bunri` | 15歳 秋 | 在籍:hs / 除外:track_rikei,track_bunkei | 高1の秋。来年からの文系・理系を決める時期だ。 | 📖 文系（法・経済・文・外国語・教育など）<br>🔭 理系（理・工・情報・医・薬・看護など） |
| 👛 | `ev_m_cash_start` | 16歳 春 |  | 16歳。自分のお金を自分で管理するようになった。おこづかい：月{allowance}万円。 |  |
| 🏪 | `ev_m_parttime_start` | 16歳 春 | 在籍:hs/hs_corr/hs_night/kosen | 友だちがアルバイトを始めた。自分はどうする？ | ［候補リスト:jobs.partTimeJobs］<br>📚 バイトはしない（勉強・部活に集中） |
| 🧭 | `ev_m_hs_plan` | 16歳 秋 | 在籍:hs/hs_corr/hs_night | 高2の秋。進路希望調査の紙が配られた。卒業後はどうしたい？ | 🎓 大学に行きたい<br>📚 短大に行きたい<br>🛠️ 専門学校で技術や資格を身につけたい<br>💼 就職したい<br>✈️ 海外の大学に行きたい<br>🤔 まだ決められない |
| 🎯 | `ev_m_post_target` | 17歳 夏 | 在籍:hs/hs_corr/hs_night | 高3の夏。先生と親が、成績と家計に合わせて候補を出してくれた。 | ［候補リスト:schools.postByPlan］<br>💼 やっぱり就職する |
| 💴 | `ev_m_scholarship` | 17歳 秋 | 在籍:hs/hs_corr/hs_night | 進学にかかるお金の話を家族でした。学費は{tuition}万円/年。家は{householdComment} | 👨‍👩‍👧 親に出してもらう<br>📄 貸与型の奨学金を借りる（月5万・卒業後に返す）<br>🏅 給付型奨学金に申し込む（返さなくていい）<br>💪 バイトして自分でなんとかする<br>💼 お金のことを考えて就職に切りかえる |
| 💼 | `ev_m_hs_job_hunt` | 17歳 秋 | 在籍:hs/hs_corr/hs_night | 9月、高卒の採用試験が始まる。学校に来た求人から応募先を選ぼう（はじめは1人1社）。 | ［候補リスト:jobs.jobs］ |
| 💼 | `ev_m_hs_job_hunt2` | 17歳 冬 | 除外:naitei | まだ就職先が決まっていない。卒業までにどうする？ | ［候補リスト:jobs.jobs］<br>🛠️ 専門学校に切りかえる |
| 🌸 | `ev_m_post_exam` | 冬 | 在籍:hs/hs_corr/hs_night/ronin | 合格発表の日…… | 🔁 浪人してもう1年がんばる（予備校 年80万）<br>［候補リスト:schools.postByPlan］<br>🛠️ 専門学校に行く（ほぼ全員合格）<br>💼 就職する<br>🧳 ワーキングホリデーに行く |
| 🎓 | `ev_m_hs_grad` | 冬 | 在籍:hs/hs_corr/hs_night / 最終学年-0 | 高校を卒業した。{gradComment} |  |
| 🤔 | `ev_m_hs_unknown_path` | 冬 | 在籍:hs/hs_corr/hs_night / 除外:naitei,naitei_school / 最終学年-0 | 卒業が近いのに、進路が決まっていない……。 | 🔁 1年浪人して大学をめざす<br>🧺 フリーターとして働きながら考える<br>🛠️ 専門学校に行く |
| 🌸 | `ev_m_post_entry` | 春 | 在籍:none/ronin / 必要:naitei_school | {school}に入学！新しい生活が始まった。 |  |
| 🏠 | `ev_m_living` | 春 | 在籍:univ/univ_med/junior_college/vocational | 学校まで{commute}。どこに住む？ | 🏠 実家から通う<br>🔑 ひとり暮らし（仕送り・家賃 年120万）<br>🏢 学生寮（年50万） |
| 🎾 | `ev_m_circle` | 春 | 在籍:univ/univ_med/junior_college | 新歓の季節。たくさんのサークルから勧誘された。 | ［候補リスト:clubs.univCircles］ |
| 🍎 | `ev_m_teacher_course` | 春 | 在籍:univ / 除外:teacher_course | 大学で教職課程（先生の免許をとる授業）を取ることができる。授業は増えるけど……。 | 🍎 教職課程をとる<br>🙅 とらない |
| 👘 | `ev_m_seijin` | 20歳 冬 |  | 二十歳のつどい（成人式）。{seijinComment} |  |
| 🧭 | `ev_m_career_plan` | 冬 | 在籍:univ/junior_college/vocational/kosen / 最終学年-1 | 卒業まであと1年ちょっと。この先どうする？ | 💼 民間企業に就職活動をする<br>🏛️ 公務員試験を受ける<br>🍎 教員採用試験を受ける<br>🔬 大学院に進む<br>🎓 大学3年に編入する<br>🚀 起業・フリーランスをめざす<br>🤔 まだ考えたい |
| 👔 | `ev_m_job_hunt` | 春 | 在籍:univ/univ_med/junior_college/vocational/kosen/grad_master/grad_doctor/grad_prof / 除外:naitei / 最終学年-0 | 就職活動の本番。エントリーする会社を選ぼう。（落ちても秋にもう一度チャンスがある） | ［候補リスト:jobs.jobs］ |
| 🍁 | `ev_m_job_hunt_autumn` | 秋 | 除外:naitei / 最終学年-0 | まだ内定がない。秋の採用でどうする？ | ［候補リスト:jobs.jobs］<br>📅 わざと留年して来年もう一度（学費1年分）<br>🔬 大学院に進む<br>🧺 卒業してアルバイトをしながら探す（既卒） |
| 🔬 | `ev_m_grad_school_exam` | 夏 | 在籍:univ/grad_master / 最終学年-0 | 大学院の入試。どこを受ける？ | ［候補リスト:schools.graduate］ |
| 🏛️ | `ev_m_civil_exam` | 17〜35歳 夏 | 除外:arrest,naitei | 公務員試験。どの試験を受ける？ | ［候補リスト:jobs.civil］ |
| 🍎 | `ev_m_kyosai` | 21〜45歳 夏 | どれか:teacher_course,lic_teacher_elem,lic_teacher_sec / 除外:arrest,naitei | 教員採用試験の日。（合格率は全国平均で約3〜4倍の倍率） | 🧑‍🏫 小学校の先生<br>🧑‍🏫 中学・高校の先生 |
| 🩺 | `ev_m_kokushi_doctor` | 冬 | 在籍:univ_med / 最終学年-0 | 医師国家試験（合格率 約92%） | ✍️ 受験する |
| 🦷 | `ev_m_kokushi_dentist` | 冬 | 在籍:univ_med / 最終学年-0 | 歯科医師国家試験（合格率 約65%） | ✍️ 受験する |
| 💊 | `ev_m_kokushi_pharm` | 冬 | 在籍:univ_med / 最終学年-0 | 薬剤師国家試験（合格率 約70%） | ✍️ 受験する |
| 🧑‍⚕️ | `ev_m_kokushi_nurse` | 冬 | 在籍:univ/vocational / 最終学年-0 | 看護師国家試験（合格率 約90%） | ✍️ 受験する |
| 📜 | `ev_m_license_exam` | 冬 | 在籍:vocational / 最終学年-0 | 国家試験の日（{examName}） | ✍️ 受験する |
| 🔁 | `ev_m_exam_retry` | 冬 | 在籍:none/ronin | 去年落ちた国家試験に、もう一度挑戦する？ | ✍️ もう一度受ける<br>🏳️ あきらめて別の仕事を探す |
| ⚖️ | `ev_m_shihou` | 夏 | 在籍:grad_prof/none / 除外:lic_lawyer | 司法試験（合格率 約40%・受験は5回まで） | ✍️ 受験する<br>🏳️ 受験をやめて就職する |
| 🎓 | `ev_m_graduation` | 冬 | 在籍:univ/univ_med/junior_college/vocational/kosen/grad_master/grad_doctor/grad_prof / 最終学年-0 | {school}を卒業した。 |  |
| 🏢 | `ev_m_first_job` | 春 | 在籍:none / 必要:naitei | 社会人1年目。{job}として働き始めた。初任給は{income}万円。 |  |
| 🏠 | `ev_m_housing` | 春 | 在籍:none / 除外:owns_house / 雇用:seishain/civil_servant/keiyaku/haken/part/freelance / 勤続0/0年 | 社会人になった。どこに住む？（{pref}の家賃のめやす：ひとり用 月{rentSingle}万円） | 🏠 実家から通う（家に月3万円入れる）<br>🔑 部屋を借りてひとり暮らし（月{rentSingle}万円・最初に家賃の4か月分）<br>🏢 会社の寮・社宅に入る（相場の3割くらい）<br>🏘️ シェアハウスに住む（月{rentShare}万円） |
| 📄 | `ev_m_scholar_repay` | 夏 | 在籍:none / 必要:scholarship_loan / 除外:scholarship_loan_repaying | 奨学金の返済が始まった。毎月{repay}万円、{repayYears}年間。 |  |
| 🔄 | `ev_m_job_review` | 22〜59歳 春 | 雇用:seishain/keiyaku/civil_servant/freelance/self_employed / 勤続5/10/15/20/25/30年 | 今の仕事について{jobYears}年。給料{income}万円、満足感{jobSat}。このままでいい？ | 🙂 今の仕事を続ける<br>［候補リスト:jobs.midCareer］<br>📖 資格をとって仕事を変える<br>🚀 独立・起業する<br>🧺 仕事をゆるめる（パート・アルバイトに）<br>😌 一度やめて休む |
| 📈 | `ev_m_promotion` | 春 | 雇用:seishain/civil_servant/part | 📈 {jobLabel}として{newTitle}になった！ |  |
| 📝 | `ev_m_promotion_exam` | 夏 | 雇用:seishain/civil_servant | {nextTitle}になるための{examName}を受けることができる。受かれば給料は上がるが、責任も重くなる。 | 📝 試験を受ける<br>🙂 今の立場で、目の前の仕事を続けたい |
| 📄 | `ev_m_contract_end` | 冬 | 雇用:keiyaku/haken | 契約期間が終わる。どうなる？ | 🙏 正社員にしてもらえないか相談する<br>［候補リスト:jobs.midCareer］<br>📄 同じ形で更新する |
| 🔍 | `ev_m_unemployed` | 18〜64歳 春・秋 | 在籍:none / 除外:welfare / 雇用:unemployed/none | 今は仕事がない。（失業手当：{benefitLeft}）どうする？ | ［候補リスト:jobs.midCareer］<br>🧺 まずはアルバイトで働く<br>🏫 職業訓練校で技術を身につける（無料・半年）<br>😌 もう少し休む |
| 👶 | `ev_m_child_plan` | 春 | 必要:married / 除外:no_children_choice,wants_children / 人物:spouse | 結婚して1年。{spouse}と子どものことを話し合った。 | 👶 子どもがほしい<br>⏳ もう少し2人で過ごしたい<br>🙅 子どもは持たない |
| 👶 | `ev_m_child_plan2` |  | 必要:married / 除外:no_children_choice,wants_children / 人物:spouse | もう一度、子どものことを話し合った。 | 👶 子どもがほしい<br>🙅 子どもは持たない |
| 🎉 | `ev_m_retire_age` | 60歳 冬 | 雇用:seishain/civil_servant | 60歳。定年を迎えた。退職金は{severance}万円。この先どうする？ | 🏢 同じ会社で再雇用（65歳まで・給料は約6割）<br>🔄 別の仕事を探す<br>🌴 完全に引退する |
| 🌴 | `ev_m_reemploy_end` | 65歳 冬 | 必要:reemployed | 再雇用の期間が終わり、仕事を引退した。おつかれさまでした。 |  |
| 💴 | `ev_m_pension` | 64歳 冬 | 除外:pension_early | 年金をいつから受け取る？（65歳で受け取ると月{pension}万円） | 💴 65歳から受け取る<br>⏳ 70歳まで待って増やす（月額が約1.4倍）<br>⏳⏳ 75歳まで待つ（月額が約1.8倍） |
| 💴 | `ev_m_pension_early` | 60〜63歳 春 | 除外:pension_early / 雇用:none/unemployed/retired/homemaker | 仕事がなく貯金が少ない。年金を早めに受け取る？（月額が減る：1か月早めるごとに0.4%減） | 💴 今から受け取る<br>🙅 まだ待つ |
| 🚗 | `ev_m_license_return` | 75〜100歳 春 | 必要:lic_car / 除外:license_returned | {age}歳。家族から「運転免許、そろそろ返したら？」と言われた。 | 🪪 免許を返納する<br>🚗 まだ運転を続ける |
| 🕊️ | `ev_m_death` |  |  | {year}年{month}月。{name}は{age}歳で人生を終えた。{deathCause} |  |

## ランダム選択肢イベント（119件）

| | ID | 時期 | 条件 | 文章 | 選択肢 |
|---|---|---|---|---|---|
| 😢 | `ev_r_bullied` | 7〜15歳 | 在籍:elem/jhs | 最近、クラスの何人かに無視されたり、からかわれたりしている……。 | 🧑‍🏫 先生に相談する<br>🏠 家族に話す<br>🤐 だれにも言わずにがまんする<br>🤝 仲のいい友だちといっしょに立ち向かう |
| 🚪 | `ev_r_futoko` | 7〜17歳 | 在籍:elem/jhs/hs / 除外:futoko | 朝になると、おなかが痛くて学校に行けない日が続いている。 | 🏠 しばらく学校を休む<br>🌱 フリースクールに通う<br>💻 通信制高校に転校する<br>🏥 保健室やカウンセラーの先生のところに行く<br>😣 がんばって登校する |
| 🌤️ | `ev_r_back_to_school` |  | 必要:futoko | 気持ちが少し落ちついてきた。また学校に行ってみる？ | 🌤️ 少しずつ登校してみる<br>🏠 今の過ごし方を続ける |
| 🙋 | `ev_r_class_rep` | 8〜17歳 | 在籍:elem/jhs/hs | 学級委員に推薦された。 | 🙋 引き受ける<br>🙅 ことわる |
| 🏛️ | `ev_r_council` | 13〜16歳 | 在籍:jhs/hs / 除外:student_council | 生徒会長に立候補しないかと先生に言われた。 | 🎤 立候補する<br>🙅 やめておく |
| 🎒 | `ev_r_new_lesson` | 6〜14歳 |  | 友だちに「いっしょに習わない？」と誘われた。 | ［候補リスト:clubs.lessons］<br>🙅 今はいいや |
| 🚪 | `ev_r_quit_club` | 6〜22歳 |  | {club}がつらくなってきた。やめたい気持ちがある。 | 🚪 やめる<br>💪 続ける<br>［候補リスト:clubs.current］ |
| 🏆 | `ev_r_tournament` | 夏 |  | 🏆 {club}で全国大会に出場した！ |  |
| ⚾ | `ev_r_koshien` | 15〜17歳 夏 |  | ⚾ 夏の甲子園に出場した！一生の思い出だ。 |  |
| 🎹 | `ev_r_recital` | 秋 |  | 🎹 ピアノの発表会、拍手が鳴りやまなかった。 |  |
| 🖼️ | `ev_r_contest` | 7〜17歳 秋 |  | 🖼️ 描いた絵が市のコンクールで入賞した！ |  |
| 🎮 | `ev_r_game_console` | 7〜15歳 |  | 新しいゲーム機が発売された。クラスのみんなが持っている……。 | 🙏 親にねだる<br>🧧 お年玉をためて買う<br>🙅 がまんする |
| 📱 | `ev_r_smartphone` | 10〜14歳 |  | 「スマホがほしい！」と親に頼んだ。 | 📱 ルールを決めて持つ<br>📱 ルールなしで持つ<br>🙅 まだ持たない |
| 💬 | `ev_r_sns_trouble` | 11〜19歳 |  | グループチャットで、友だちの悪口が回ってきた。 | 🙅 乗らずに抜ける<br>📤 おもしろがって広める<br>🧑‍🏫 先生や大人に知らせる |
| 🏪 | `ev_r_shoplift_invite` | 10〜16歳 |  | 友だちに「バレないって。いっしょにやろうぜ」と万引きに誘われた。 | 🙅 きっぱり断る<br>😰 断れずにやってしまう<br>🧑‍🏫 大人に相談する |
| 🚚 | `ev_r_transfer_family` | 6〜15歳 | 人物:father｜mother | 親に転勤の辞令が出た。引っ越し先は{newPref}。 | 🚚 家族みんなで引っ越す（転校）<br>🏠 親が単身赴任する |
| 💔 | `ev_r_parents_divorce` | 3〜17歳 | 除外:parents_divorced,single_parent_home / 人物:father,mother | 両親が離婚することになった。どちらと暮らす？ | 👩 お母さんと暮らす<br>👨 お父さんと暮らす |
| 🐶 | `ev_r_pet` | 6〜70歳 | 除外:pet | 知り合いの家で子犬・子猫が生まれた。もらわない？ | 🐶 飼う（年15万くらいかかる）<br>🙅 飼わない |
| 🚬 | `ev_r_smoke_invite` | 14〜19歳 | 除外:smoker,ex_smoker | 先輩に「1本どう？」とタバコをすすめられた。（20歳未満の喫煙は法律で禁止） | 🙅 断る<br>🚬 吸ってみる |
| 🍺 | `ev_r_drink_invite_minor` | 15〜19歳 |  | 友だちの家で、お酒を飲もうと誘われた。（20歳未満の飲酒は禁止） | 🥤 ジュースにしておく<br>🍺 飲んでみる |
| 🌃 | `ev_r_night_out` | 13〜17歳 |  | 夜中に友だちとコンビニの前でたまろうと誘われた。 | 🏠 家にいる<br>🌃 行く |
| ⚠️ | `ev_r_yami_baito` | 16〜45歳 |  | SNSで「1日10万円・カンタンな運び作業」という募集を見つけた。 | 🙅 あやしいので無視する<br>📞 警察相談専用電話（#9110）に相談する<br>💸 応募してしまう |
| 💌 | `ev_r_first_love` | 11〜18歳 | 除外:has_partner | 気になる人ができた。{crush}のことを考えると、勉強に集中できない。 | 💌 思い切って告白する<br>🤫 気持ちはしまっておく |
| 💝 | `ev_r_confessed` | 13〜60歳 | 除外:has_partner,married | {someone}から「付き合ってください」と告白された。 | 💕 付き合う<br>🙇 ことわる |
| 🤝 | `ev_r_meet` | 19〜55歳 | 除外:has_partner,married | {place}で、話が合う人と出会った。 | 🍽️ 食事に誘ってみる<br>🙂 友だちのままでいい |
| 🥂 | `ev_r_konkatsu` | 26〜50歳 | 除外:has_partner,married | 友だちに婚活パーティーに誘われた。（参加費1万円） | 🥂 行ってみる<br>📱 マッチングアプリを使ってみる<br>🙅 今は興味がない |
| 💔 | `ev_r_breakup` |  | 必要:has_partner / 除外:married / 人物:partner | {partner}とけんかが増えてきた。 | 🗣️ ちゃんと話し合う<br>👋 別れる |
| 💍 | `ev_r_propose` | 20〜70歳 | 必要:has_partner / 除外:married / 人物:partner | {partner}と付き合って{partnerYears}年。結婚を考えている。 | 💍 プロポーズする<br>⏳ まだ早いかな<br>🏠 結婚はせず、いっしょに暮らす |
| 💒 | `ev_r_wedding` |  | 必要:married | 結婚式をどうする？ | 💒 ちゃんと式をあげる（約300万・ご祝儀で半分戻る）<br>📷 写真だけ・家族だけで（約30万）<br>📄 籍を入れるだけ |
| 🤰 | `ev_r_pregnancy` | 確率:fertility | 必要:married / どれか:wants_children / 人物:spouse | 🤰 赤ちゃんができた！ |  |
| 🏥 | `ev_r_infertility` |  | 必要:married,wants_children / 除外:infertility_care / 人物:spouse | 2年以上、子どもができない。病院で相談してみる？ | 🏥 不妊治療を受ける（保険適用あり・年30〜100万）<br>🍀 自然にまかせる<br>🙅 子どもはあきらめる |
| 🍼 | `ev_r_childcare_leave` |  | 雇用:seishain/civil_servant/keiyaku / 子どもあり | 子どもが生まれた。育児休業をとる？ | 🍼 育休を1年とる（給料の約67%の給付金）<br>🍼 育休を数か月とる<br>💼 とらずに働く |
| 📝 | `ev_r_child_juken` |  | 地域:AB / 子どもあり | {child}が小4。中学受験をさせる？（3年で塾代約250万） | 📝 させる<br>🏫 公立に行かせる<br>🗣️ 本人に決めさせる |
| 🎓 | `ev_r_child_univ_cost` |  | 子どもあり | {child}が大学に行きたいと言っている。学費は4年で{childTuition}万円。 | 💴 全部出してあげる<br>🤝 半分出して、残りは奨学金<br>📄 奨学金で行ってもらう<br>🙅 就職してほしいと伝える |
| ⚡ | `ev_r_marital_crisis` |  | 必要:married / 人物:spouse | {spouse}との言い合いが増え、家の空気が重い。 | 🗣️ 時間をとって話し合う<br>🏥 夫婦カウンセリングに行く（10万）<br>💔 離婚する<br>😶 何もしない |
| 💔 | `ev_r_divorce` |  | 必要:married / 人物:spouse | 離婚の話し合い。{childrenComment} | 📄 話し合いで決める（協議離婚）<br>⚖️ 弁護士に頼む（費用50万） |
| 📝 | `ev_r_surname_marry` |  | 必要:married | 婚姻届を出す。日本の法律では、夫婦はどちらかの苗字にそろえる。どちらの苗字にする？ | 🙂 自分の苗字「{surname}」のまま（相手が変える）<br>📝 相手の苗字「{partnerSurname}」に変える |
| 📝 | `ev_r_surname_divorce` |  | 必要:divorced / 除外:married | 離婚した。結婚のときに変えた苗字を、もとにもどす？（今の苗字を使い続けるなら、3か月以内に届け出が必要） | ↩️ 旧姓「{birthSurname}」にもどす<br>📝 今の苗字「{surname}」を使い続ける |
| 🌷 | `ev_r_remarry_meet` | 28〜75歳 | どれか:divorced,widowed / 除外:married,has_partner | 新しい出会いがあった。もう一度、だれかと人生を歩む？ | 🌷 付き合ってみる<br>🙂 今はひとりでいい |
| 🚗 | `ev_r_car_license` | 18〜40歳 | 除外:lic_car | 運転免許をとろうか考えている。 | 🏕️ 合宿で一気にとる（約25万・2週間）<br>🏫 教習所に通う（約32万）<br>🙅 今はとらない |
| 🚙 | `ev_r_car_buy` | 18〜80歳 | 必要:lic_car / 除外:owns_car,license_returned | 車があったら便利だな……。 | 🚙 中古車を買う（80万）<br>🚗 新車をローンで買う（250万・5年ローン）<br>🚲 なくても生活できる |
| 💥 | `ev_r_car_accident` | 確率:traffic_injury | 必要:owns_car | 運転中、交差点で事故を起こしてしまった。 | 📞 すぐに警察と保険会社に連絡 |
| 🚑 | `ev_r_traffic_victim` | 確率:traffic_injury | 除外:owns_car | 🚲 自転車で転んで、車とぶつかりそうになった。打ぼくですんだ。 |  |
| 🍻 | `ev_r_drunk_drive` | 20〜80歳 | 必要:owns_car,drinker | 飲み会の帰り。車で来ていた。「ちょっとだけなら大丈夫だろ」と言われた。 | 🚕 運転代行・タクシーで帰る（5千円）<br>🛏️ 近くに泊まって朝帰る<br>🚗 運転してしまう |
| 🍶 | `ev_r_first_drink` | 20〜21歳 | 除外:drinker | 20歳になり、お酒を飲めるようになった。お酒との付き合い方は？ | 🥂 楽しむ程度に飲む<br>🍺 よく飲む（毎晩のように）<br>🥤 飲まない |
| 🍻 | `ev_r_drink_pressure` | 18〜30歳 | どれか:drinker | 飲み会で「一気！一気！」とあおられている。 | 🙅 「飲めないです」とはっきり断る<br>🍺 飲む |
| 🚬 | `ev_r_smoke_adult` | 20〜50歳 | 除外:smoker,ex_smoker | 職場の喫煙所で、先輩がタバコをすすめてきた。 | 🙅 断る<br>🚬 吸うようになる |
| 🚭 | `ev_r_quit_smoking` |  | 必要:smoker | タバコ代も上がったし、体のことも気になる。禁煙する？ | 🏥 禁煙外来に通う（保険適用・約2万）<br>💪 気合でやめる<br>🚬 やめない |
| 🏃 | `ev_r_exercise` | 20〜85歳 | 除外:exercise_habit | 最近、体力が落ちてきた気がする。 | 🏋️ ジムに通う（月8千円）<br>🚶 毎日歩くようにする<br>🛋️ 特に何もしない |
| 🩺 | `ev_r_kenshin` | 30〜90歳 秋 |  | 健康診断の結果：{kenshinResult} | 🏥 再検査・精密検査を受ける<br>🥗 生活習慣を見直す<br>🙈 気にしない |
| 🔍 | `ev_r_cancer_screen` | 40〜75歳 | 除外:kenshin_habit | 市から「がん検診のお知らせ」が届いた。（自己負担 数千円） | 🔍 毎年受けることにする<br>🙈 忙しいので行かない |
| 🎗️ | `ev_r_cancer` | 20〜105歳 確率:cancer_any | 除外:dz_cancer_lung,dz_cancer_stomach,dz_cancer_colon,dz_cancer_breast | 検査の結果、{cancerName}（ステージ{cancerStage}）と診断された。 | 🏥 手術を受ける<br>💊 抗がん剤・放射線治療<br>🕊️ 緩和ケアで、痛みをおさえて過ごす<br>🌿 高額な民間療法にたよる（200万） |
| 🩸 | `ev_r_diabetes` | 30〜90歳 確率:diabetes | 除外:dz_diabetes | 血糖値が高く、糖尿病と診断された。 | 🥗 食事と運動で治療する<br>💊 薬で治療する<br>🙈 放っておく |
| 🫀 | `ev_r_hypertension` | 30〜95歳 確率:hypertension | 除外:dz_hypertension | 🫀 血圧が高いと言われ、薬を飲み始めた。 |  |
| 🧠 | `ev_r_stroke` | 40〜105歳 確率:stroke |  | 🧠 脳卒中で倒れたが、すぐに治療を受けて回復した。 |  |
| ❤️‍🩹 | `ev_r_heart` | 40〜105歳 確率:heart | 除外:dz_heart | ❤️‍🩹 胸が苦しくなり救急搬送。心臓の病気が見つかり、手術を受けた。 |  |
| 🌧️ | `ev_r_depression` | 15〜90歳 確率:depression | 除外:dz_depression | 眠れない日が続き、何をしても楽しくない。 | 🏥 心療内科・カウンセリングに行く<br>📄 仕事・学校を休む（休職・休学）<br>😣 だれにも言わずにがまんする |
| 🌙 | `ev_r_overwork` |  | 雇用:seishain/civil_servant/keiyaku/executive/self_employed | 毎日終電で帰る日が続いている。 | 🗣️ 上司に仕事量を相談する<br>💪 がんばって乗り切る<br>🔄 転職を考える<br>🏢 労働基準監督署に相談する |
| 😠 | `ev_r_harassment` |  | 雇用:seishain/keiyaku/haken/part/civil_servant | 上司に毎日のように大声でどなられている。 | 🗂️ 相談窓口・人事に報告する<br>🔄 転職する<br>😣 がまんする |
| 📉 | `ev_r_layoff` | 20〜64歳 確率:layoff | 雇用:seishain/keiyaku/haken/part | 会社の業績が悪化し、{layoffType}を告げられた。 | 🔍 すぐ次の仕事を探す<br>💴 失業手当を受けながら、じっくり探す |
| 🔍 | `ev_r_job_search` | 18〜69歳 |  | 転職・就職活動。どこに応募する？ | ［候補リスト:jobs.midCareer］ |
| 📩 | `ev_r_headhunt` | 27〜55歳 | 雇用:seishain | 転職サイト経由で、年収{offerIncome}万円のスカウトが届いた。 | 🤝 面接を受けてみる<br>🙅 今の会社にいる |
| 🧳 | `ev_r_transfer` | 24〜58歳 | 雇用:seishain/civil_servant | {newPref}への転勤を命じられた。 | 🧳 家族で引っ越す<br>🏠 単身赴任する（月8万の負担）<br>🚪 断って会社をやめる |
| 🌏 | `ev_r_transfer_abroad` | 26〜55歳 | 除外:transfer_abroad / 雇用:seishain | 海外支社への赴任（3年）を打診された。 | 🌏 行く<br>🙅 家族の事情で断る |
| 🚀 | `ev_r_startup` | 22〜65歳 | 除外:startup_exp | 温めていたアイデアで、会社を立ち上げる？（資金：最低100万） | 🚀 起業する<br>💼 副業として小さく始める<br>🙅 今の生活を続ける |
| 🏮 | `ev_r_family_business` | 18〜50歳 | 人物:father｜mother | 親から「そろそろ家の仕事を継いでくれないか」と言われた。 | 🏮 継ぐ<br>🙇 自分の道を進むと伝える |
| 🗼 | `ev_r_tokyo_offer` | 18〜35歳 | 除外:moved_to_tokyo | 東京の会社から声がかかった。給料は今の{tokyoRatio}倍くらい。でも家賃も高い。 | 🗼 上京する<br>🏡 地元に残る |
| 🏡 | `ev_r_u_turn` | 27〜60歳 | 必要:moved_to_tokyo / 除外:u_turn | ふるさとに帰ろうか考えている。 | 🏡 地元に戻る（Uターン）<br>🗼 今の場所で暮らす |
| 🏠 | `ev_r_house` | 28〜55歳 | 除外:owns_house | マイホームを買う？（{housePrice}万円・頭金{downPayment}万円） | 🏠 新築を変動金利で買う（今は約0.6%・上がるかも）<br>🔒 新築を固定金利で買う（約1.9%・ずっと同じ）<br>🏚️ 中古を買ってリフォーム（新築の約6割）<br>🏢 賃貸のまま暮らす<br>🏡 実家を二世帯住宅にする |
| 📈 | `ev_r_nisa` | 18〜75歳 | 除外:nisa | 同僚から「NISAで積み立て投資してる？」と聞かれた。 | 📈 毎月3万円の積み立てを始める<br>📈📈 毎月10万円を積み立てる<br>🏦 貯金のほうが安心 |
| 💹 | `ev_r_stock_tip` | 20〜80歳 |  | 「この株・コインは絶対上がる」という話を聞いた。 | 💹 50万円分買う<br>🙅 「絶対」という話は信じない |
| 📉 | `ev_r_market_crash` |  | どれか:nisa,stock_trader,crypto | 世界的な株の暴落！持っている投資が{crashPct}%値下がりした。 | 😱 こわいので全部売る<br>🧘 そのまま持ち続ける<br>🛒 安くなったので買い増す |
| ☎️ | `ev_r_scam` | 18〜100歳 |  | {scamText} | 📞 家族や警察（#9110）に確認する<br>💸 言われた通りにお金を払う |
| 🎫 | `ev_r_lottery` | 20〜100歳 冬 |  | 年末ジャンボ宝くじの季節。買う？（1枚300円） | 🎫 10枚買う（3千円）<br>🙅 買わない |
| 💳 | `ev_r_debt_crisis` | 20〜90歳 |  | 借金が{debt}万円にふくらみ、返せなくなってきた。 | 🏛️ 法テラス・弁護士に相談して債務整理<br>⚖️ 自己破産する<br>👨‍👩‍👧 家族に相談する<br>💳 別のところから借りて返す |
| 🏛️ | `ev_r_welfare` | 18〜105歳 | 除外:welfare | 収入がなく、生活ができなくなってきた。市役所で生活保護の相談ができる。 | 🏛️ 生活保護を申請する<br>🙅 頼らずにがんばる |
| 🤲 | `ev_r_parent_care` |  | 除外:caregiving / 人物:father｜mother | {parentName}が{careReason}で、介護が必要になった。（要介護{careLevel}） | 🏠 同居して自分が介護する<br>🏢 介護施設に入ってもらう（月15万）<br>🤝 ヘルパー・デイサービスを使いながら仕事を続ける（月5万）<br>👨‍👩‍👧 きょうだいと分担する<br>🚪 仕事をやめて介護に専念する（介護離職） |
| 🦯 | `ev_r_care_self` | 65〜105歳 確率:careNeed |  | 体が思うように動かなくなり、介護が必要になった。 | 🏠 家で介護サービスを使う<br>🏢 介護施設に入る<br>👨‍👩‍👧 子どもの家で暮らす |
| 🌫️ | `ev_r_dementia_parent` | 確率:dementia | 人物:father｜mother｜grandparent | 🌫️ {personName}の物忘れがひどくなり、認知症と診断された。 |  |
| 🌫️ | `ev_r_dementia_self` | 65〜105歳 確率:dementia | 除外:dz_dementia | 🌫️ 最近、物忘れが多くなった。認知症の初期と言われた。 |  |
| 📖 | `ev_r_qualify` | 15〜70歳 |  | 資格の勉強をしようかな。 | ［候補リスト:qualifications］<br>🙅 今はいい |
| 🔤 | `ev_r_eiken` | 10〜22歳 |  | 英検を受けてみる？ | 🔤 {nextEikenLevel}を受ける<br>🙅 受けない |
| 📝 | `ev_r_toeic` | 18〜60歳 |  | TOEICを受ける？（受験料 約8千円） | 📝 受ける<br>🙅 受けない |
| ✈️ | `ev_r_study_abroad` | 15〜21歳 | 在籍:hs/univ / 除外:edu_abroad_hs,edu_abroad_univ | 学校の留学プログラムの募集があった。 | ［候補リスト:schools.abroad］<br>🙅 今回は見送る |
| 🎒 | `ev_r_dropout_crisis` |  | 在籍:hs/univ | 学校をやめたい気持ちが強くなってきた。 | 💻 通信制に転校する<br>📝 やめて高卒認定試験をめざす<br>🚪 やめて働く<br>📅 休学して少し休む<br>💪 なんとか続ける |
| 📝 | `ev_r_kentei` |  | 必要:edu_hs_dropout / 除外:edu_hs_kentei,edu_hs_grad | 高卒認定試験（合格すれば大学・専門学校を受けられる） | ✍️ 受ける<br>🙅 受けない |
| 🚪 | `ev_r_hikikomori` | 16〜60歳 | 在籍:none / 雇用:none/unemployed | ほとんど家から出ない日が続いている。 | 🏛️ 地域の相談窓口（ひきこもり支援センター）に行く<br>🧺 短時間のアルバイトから始める<br>🏠 このまま過ごす |
| 🌟 | `ev_r_creator_hit` |  | 除外:creator_hit | 🌟 作品が大ヒット！一気に有名になった。 |  |
| 🏁 | `ev_r_athlete_retire` |  |  | 体力の限界。プロ選手を引退することになった。次の人生は？ | 🧑‍🏫 コーチ・指導者になる<br>💼 会社員になる（セカンドキャリア）<br>📺 解説者・タレントをめざす |
| 💻 | `ev_r_side_job` | 22〜65歳 | 除外:side_job / 雇用:seishain/keiyaku/haken/part | 週末に副業をしてみる？ | 💻 得意なことで副業を始める<br>🙅 本業に集中する |
| 📊 | `ev_r_mba` | 27〜50歳 | 必要:edu_univ_grad / 雇用:seishain | 働きながら社会人大学院（MBA）に通う？（2年・約200万） | 📊 夜間・週末のコースに通う<br>🙅 今はやめておく |
| 🌊 | `ev_r_disaster` | 0〜105歳 確率:disaster |  | {disasterType}で、家が大きな被害を受けた。 | 🏫 避難所でしばらく暮らす<br>🏠 親せき・知り合いの家に身を寄せる<br>🚚 別の土地に引っ越す |
| 🤝 | `ev_r_volunteer` | 15〜85歳 | 除外:volunteer | 地域のボランティア活動に誘われた。 | 🤝 参加する<br>🙅 時間がない |
| 📣 | `ev_r_pta` |  | 子どもあり | 子どもの学校で、PTAの役員をやってほしいと言われた。 | 🙋 引き受ける<br>🙇 仕事を理由に断る |
| 🧓 | `ev_r_senior_job` | 60〜80歳 | 雇用:none/retired/unemployed | シルバー人材センターから仕事の紹介がきた。 | 🧹 週3日だけ働く<br>🌴 のんびり暮らす |
| 🎣 | `ev_r_senior_hobby` | 60〜95歳 |  | 時間ができた。新しく何か始めてみる？ | 🎣 趣味のサークルに入る<br>📚 大学の公開講座に通う<br>🧳 夫婦・友人と旅行する（50万）<br>📺 家でのんびり |
| 🏘️ | `ev_r_downsize` | 70〜95歳 | 必要:owns_house / 除外:mortgage | 広い家の手入れが大変になってきた。 | 🏢 家を売って小さなマンションへ<br>🏡 サービス付き高齢者住宅に入る<br>🏠 住み慣れた家で暮らす |
| 📓 | `ev_r_ending_note` | 70〜105歳 |  | 「もしものとき」のことを考えておく？ | 📓 エンディングノート・遺言を書く<br>🙂 まだ考えたくない |
| 🍻 | `ev_r_reunion` | 25〜80歳 |  | {schoolName}の同窓会のお知らせが届いた。 | 🍻 行く<br>🙅 行かない |
| 🏢 | `ev_r_hq_transfer` | 30〜58歳 | 除外:hq_assign / 雇用:seishain/civil_servant | {hqName}への異動の話が来た。現場をはなれ、全体の計画や管理をする仕事になる。 | 🏢 本社（本部）で働く<br>🔧 現場に残りたいと伝える |
| ✨ | `ev_r_new_hobby` | 6〜105歳 |  | {hobbyTrigger}がきっかけで、新しいことをやってみたくなった。 | ［候補リスト:clubs.hobbies］<br>🙂 今の趣味で十分 |
| 🦷 | `ev_r_dental` | 16〜90歳 |  | 歯が痛くて歯医者に行ったら、治療が必要と言われた。 | 🦷 保険の治療にする（3万円）<br>✨ 見た目のいい自費の治療・インプラント（40万円）<br>🙈 がまんする |
| 🧾 | `ev_r_hospital_bill` | 16〜105歳 |  | 退院のとき、請求書を見てびっくり。医療費は全部で{billTotal}万円。でも健康保険で3割に、さらに「高額療養費制度」で上限があり、払うのは{billPay}万円になった。 | 💴 所持金から払う<br>🛡️ 医療保険・がん保険の給付金を使う<br>💳 分割で払う（カード） |
| 🛡️ | `ev_r_insurance` | 22〜55歳 | 除外:life_insurance | 保険の営業の人に、医療保険や生命保険をすすめられた。（月5千円〜） | 🛡️ 医療保険に入る（月5千円）<br>🎗️ がん保険も入る（月8千円）<br>🙅 公的な健康保険と貯金で十分 |
| 🤒 | `ev_r_child_illness` |  | 子どもあり | {child}が高い熱を出して入院した。 | 🏥 仕事を休んで付き添う<br>👵 祖父母に頼む |
| ✏️ | `ev_r_child_juku` |  | 子どもあり | {child}が「高校受験のために塾に行きたい」と言っている。（年40〜60万円） | ✏️ 通わせる<br>📱 オンラインの安い教材にする（年6万円）<br>🙇 家計がきびしいので、ごめんねと伝える |
| 🏫 | `ev_r_child_private_hs` |  | 子どもあり | {child}の第一志望の公立高校が不合格。合格した私立高校に行く？（入学金など約30万円＋年に約50万円） | 🏫 私立高校に行かせる<br>📕 公立の二次募集を受けさせる<br>💻 通信制高校にする（年20万円） |
| 🌸 | `ev_r_child_entrance` |  | 子どもあり | {child}が大学に合格！入学金と前期の授業料で、まず{entranceFee}万円を3月中に払わないといけない。 | 💴 所持金から払う<br>🏦 教育ローンを借りる（年2%・10年）<br>👵 祖父母に援助をお願いする |
| ✈️ | `ev_r_child_abroad` |  | 子どもあり | {child}が「1年間、留学したい」と言っている。（約200万円） | ✈️ 行かせる<br>🏅 奨学金の留学プログラムをいっしょに探す<br>🙇 今は無理だと伝える |
| 📄 | `ev_r_scholar_trouble` |  | 必要:scholarship_loan_repaying | 所持金がマイナスで、奨学金の返済（月{repay}万円）がきびしい。 | 📮 返還猶予を申請する（返すのを待ってもらう）<br>➗ 減額返還を申請する（月の返済を半分に・期間はのびる）<br>🙈 そのまま払わない |
| 🏠 | `ev_r_remote_work` |  | 除外:remote_work / 雇用:seishain/keiyaku/haken/freelance | 会社で、家で働く「在宅勤務（リモートワーク）」ができるようになった。 | 🏠 在宅中心にする<br>🏢 会社に通い続ける |
| 🏡 | `ev_r_housing_family` |  | 必要:married / 除外:owns_house | 結婚して、2人でどこに住む？（ファミリー向けの家賃：月{rentFamily}万円） | 🔑 2人で部屋を借りる（月{rentFamily}万円）<br>👵 どちらかの実家で同居する<br>🏠 思い切って家を買う |
| 📈 | `ev_r_rate_rise` |  | 必要:mortgage | 世の中の金利が上がり、変動金利の住宅ローンの返済が月{rateUp}万円増えることになった。 | 🔒 固定金利に借りかえる（手数料30万円）<br>💴 貯金でくり上げ返済する（200万円）<br>😐 そのまま返し続ける |
| 🏢 | `ev_r_invest_property` | 28〜65歳 | 除外:owns_rental,blacklisted,bankruptcy / 雇用:seishain/civil_servant/executive | 不動産会社から「投資用のマンションを買って貸せば、家賃でローンが返せますよ」とすすめられた。（{pref}の部屋：{unitPrice}万円・家賃 月{unitRent}万円） | 🏢 ローンを組んで買う（頭金200万円）<br>📚 話を聞いて、もう少し勉強する<br>🙅 ことわる |
| 🚪 | `ev_r_vacancy` | 確率:rentalVacancy | 必要:owns_rental / 除外:rental_vacant | 貸していた部屋の人が出ていき、空き部屋になった。家賃が入らないのに、ローンは毎月{loanMonthly}万円かかる。 | 💸 家賃を下げて、すぐに次の人を探す<br>🛠️ リフォームして、家賃はそのまま（50万円）<br>🏷️ 売ってしまう |
| 🔧 | `ev_r_rental_repair` | 確率:rentalRepair | 必要:owns_rental | 🔧 貸している部屋の給湯器がこわれ、修理に{repairCost}万円かかった。 |  |
| 🏷️ | `ev_r_sell_rental` |  | 必要:owns_rental | 持っている部屋を売る？（いまの値段：{rentalValue}万円、ローンの残り：{rentalLoanLeft}万円） | 🏷️ 売る<br>🏢 持ち続ける |
| 🏚️ | `ev_r_inherit_house` | 30〜105歳 |  | 親が住んでいた家を相続した。（評価額 {houseValue}万円・固定資産税 年{houseTax}万円） | 🏠 自分たちが住む<br>🔑 人に貸す<br>🏷️ 売る<br>🏚️ とりあえずそのままにする（空き家） |
| 🏥 | `ev_r_spouse_illness` |  | 必要:married / 人物:spouse | {spouse}が病気で入院した。 | 🏥 仕事を調整して付き添う<br>💼 仕事を続け、できる範囲で支える |

## 流れるだけイベント（67件）

| | ID | 時期 | 条件 | 文章 | 選択肢 |
|---|---|---|---|---|---|
| 👶 | `ev_f_sibling_birth` |  | 人物:mother,father | {siblingRelation}が生まれた！{name}は{olderTitle}になった。 |  |
| 🕯️ | `ev_f_grandparent_death` | 確率:death_byPerson | 人物:grandparent | {personName}が亡くなった。{age}歳の{name}は、初めてお葬式に出た。 |  |
| 🕯️ | `ev_f_parent_death` | 確率:death_byPerson | 人物:father｜mother | {personName}が{personAge}歳で亡くなった。 |  |
| 📜 | `ev_f_inheritance` | 18〜105歳 |  | {inheritText} |  |
| 🕊️ | `ev_f_spouse_death` | 確率:death_byPerson | 必要:married / 人物:spouse | {spouse}が{personAge}歳で亡くなった。長い間、ありがとう。 |  |
| 👶 | `ev_f_childbirth` |  | どれか:married,has_partner / 人物:spouse｜partner | {year}年{month}月、{child}が生まれた！ |  |
| 🎒 | `ev_f_child_entry` |  | 子どもあり | {child}が小学校に入学した。ランドセル姿がまぶしい。 |  |
| 🧑‍🎓 | `ev_f_child_jhs` |  | 子どもあり | {child}が中学生になった。最近、あまり話してくれない。 |  |
| 🏫 | `ev_f_child_hs` |  | 子どもあり | {child}が{childSchool}に進学した。 |  |
| 🧭 | `ev_f_child_after_hs` |  | 子どもあり | {child}は{childPath}。 |  |
| 💼 | `ev_f_child_work` |  | 子どもあり | {child}が{childJob}として働き始めた。学費の支払いが終わった。 |  |
| 💒 | `ev_f_child_marry` |  | 子どもあり | 💒 {child}が結婚した！ |  |
| 👼 | `ev_f_grandchild` |  | 子どもあり | 👼 {child}に子どもが生まれた。{name}は{grandTitle}になった！ |  |
| 🕯️ | `ev_f_child_death` | 確率:death_byPerson | 子どもあり | {child}が亡くなった。親より先に……。 |  |
| 🟥 | `ev_f_cash_negative` | 16〜105歳 |  | 所持金がマイナスになった。足りない分は、カードローンで借りていることになる。借りたお金には毎年15%の利息がつき、放っておくとどんどん増えていく。 |  |
| 🟩 | `ev_f_cash_recover` |  | 必要:debt_card | やっと所持金がプラスにもどった。借金を返し終えた。 |  |
| 🎉 | `ev_f_scholar_done` |  | 必要:scholarship_loan_repaying | 奨学金を{repayYears}年かけて、ついに返し終わった。返した合計は{repayTotal}万円（借りたのは{borrowTotal}万円）。 |  |
| 🛡️ | `ev_f_danshin` |  | 必要:widowed,mortgage | 住宅ローンは亡くなった{spouse}の名前で借りていた。団体信用生命保険で、残りのローン{loanLeft}万円がなくなった。 |  |
| 🎉 | `ev_f_mortgage_done` |  | 必要:mortgage | 住宅ローンを返し終わった！ 家は完全に自分たちのものになった。 |  |
| 🌈 | `ev_f_pet_death` |  | 必要:pet | 長い間いっしょだったペットが、虹の橋をわたった。 |  |
| 🛬 | `ev_f_return_japan` |  | 必要:lives_abroad,transfer_abroad | 海外赴任を終えて日本に帰ってきた。 |  |
| 🌤️ | `ev_f_recover_depression` |  | 必要:dz_depression | 少しずつ、朝起きるのがつらくなくなってきた。回復に向かっている。 |  |
| 🎨 | `ev_f_hint_art_hi` | 3〜12歳 |  | 幼稚園の先生に「絵の色づかいがすてきね」とほめられた。 |  |
| ✏️ | `ev_f_hint_art_lo` | 5〜12歳 |  | 図工の作品、思ったとおりの形にならなくてくやしかった。 |  |
| 🧮 | `ev_f_hint_math_hi` | 4〜12歳 |  | 買い物のとき、おつりを暗算してお母さんをびっくりさせた。 |  |
| 📖 | `ev_f_hint_book_hi` | 5〜12歳 |  | 図書室の本を1年で100冊読んで、表彰された。 |  |
| 😵 | `ev_f_hint_study_lo` | 7〜12歳 |  | 九九がなかなか覚えられなくて、居残りになった。 |  |
| 🏃 | `ev_f_hint_sport_hi` | 4〜12歳 |  | 運動会のかけっこで1位！「足が速いね」とみんなに言われた。 |  |
| 🤸 | `ev_f_hint_sport_lo` | 6〜12歳 |  | 逆上がりの練習、今日もできなかった。 |  |
| 🧑‍🤝‍🧑 | `ev_f_hint_comm_hi` | 3〜12歳 |  | 転校生にいちばんに話しかけたのは{name}だった。すぐに仲良くなった。 |  |
| 🫥 | `ev_f_hint_comm_lo` | 4〜12歳 |  | 休み時間、みんなの輪に入るタイミングがわからなかった。 |  |
| 💪 | `ev_f_hint_health_hi` | 6〜12歳 |  | 今年も1日も休まず、皆勤賞をもらった。 |  |
| 🤧 | `ev_f_hint_health_lo` | 1〜12歳 |  | 季節の変わり目になると、すぐ熱を出してしまう。 |  |
| 🎵 | `ev_f_hint_music_hi` | 4〜12歳 |  | 一度聞いただけの曲を、すぐに口ずさめた。先生が目を丸くしていた。 |  |
| ✨ | `ev_f_hint_looks` | 13〜18歳 |  | 文化祭のあと、知らない学年の人から声をかけられた。 |  |
| 🤔 | `ev_f_hint_like_gap` | 8〜14歳 |  | 好きなのに、なかなか上手くならない。でも、やっぱり好きだ。 |  |
| 🚅 | `ev_f_school_trip` | 春・秋 | 在籍:elem/jhs/hs | 修学旅行で{tripDest}へ。{tripMemory} |  |
| 🏁 | `ev_f_sports_day` | 春・秋 | 在籍:elem/jhs | 運動会。{sportsDayResult} |  |
| 🎪 | `ev_f_culture_fest` | 秋 | 在籍:jhs/hs/univ | 文化祭でクラスの出し物をした。{festMemory} |  |
| 🌻 | `ev_f_summer_homework` | 夏 | 在籍:elem | 夏休みの宿題、{homeworkResult} |  |
| 🧧 | `ev_f_otoshidama` | 3〜18歳 冬 |  | お年玉を{otoshidama}円もらった。 |  |
| 🍫 | `ev_f_valentine` | 10〜18歳 冬 |  | {valentineText} |  |
| 🏖️ | `ev_f_family_trip` | 3〜15歳 夏 |  | 家族で{tripPlace}に旅行した。 |  |
| 🏠 | `ev_f_no_trip` | 6〜15歳 夏 |  | 夏休み、友だちは旅行の話をしていた。うちはどこにも行かなかった。 |  |
| 🌙 | `ev_f_parent_overtime` | 3〜12歳 | 人物:father｜mother | {parentName}は今日も帰りが遅い。夕ごはんはひとりで食べた。 |  |
| 👵 | `ev_f_grandparent_live` | 3〜12歳 | 人物:grandparent | おばあちゃんに、昔の{pref}の話を聞いた。 |  |
| ⛄ | `ev_f_snow` | 冬 |  | 今年は大雪。{snowText} |  |
| 🌀 | `ev_f_typhoon` | 夏 |  | 大きな台風が来て、学校や仕事が休みになった。 |  |
| 💴 | `ev_f_first_salary` | 夏 | 雇用:seishain/civil_servant/keiyaku / 勤続0/0年 | 初めてのボーナス。{firstBonusUse} |  |
| 💰 | `ev_f_bonus` | 夏・冬 | 雇用:seishain/civil_servant | ボーナスが出た。{bonus}万円。 |  |
| 🤖 | `ev_f_ai_at_work` |  | 雇用:seishain/keiyaku/haken/civil_servant | 職場に新しいAIツールが入った。仕事のやり方が大きく変わりそうだ。 |  |
| 🛒 | `ev_f_inflation` | 16〜105歳 |  | 物の値段がまた上がった。スーパーのレシートを見てため息。 |  |
| 🧾 | `ev_f_tax_return` | 冬 | 雇用:freelance/self_employed/executive | 確定申告の季節。1年分のレシートと格闘した。 |  |
| 💐 | `ev_f_wedding_anniv` |  | 必要:married | {spouse}と結婚{marriedYears}周年。{anniversaryText} |  |
| 😶 | `ev_f_promotion_peer` | 30〜50歳 | 雇用:seishain | 同期が先に課長になった。 |  |
| 🚃 | `ev_f_commute` |  | 地域:A / 雇用:seishain/keiyaku/haken | 満員電車で片道1時間。毎日のことだけど、なかなか慣れない。 |  |
| 🛣️ | `ev_f_rural_car` | 18〜75歳 | 除外:owns_car | バスは1時間に1本。車がないと、どこに行くにも不便だ。 |  |
| 👓 | `ev_f_reading_glasses` | 43〜50歳 |  | スマホの文字が読みにくい……老眼が始まったらしい。 |  |
| 🦴 | `ev_f_back_pain` | 40〜90歳 |  | 腰が痛くて、朝起き上がるのがつらい。 |  |
| 💴 | `ev_f_pension_start` |  |  | 年金の受け取りが始まった。2か月ごとに{pension2m}万円が振り込まれる。 |  |
| 🧸 | `ev_f_grandchild_play` | 55〜100歳 | 人物:grandchild | 孫の{grandchildName}が遊びに来た。あっという間に1日が過ぎた。 |  |
| 🕯️ | `ev_f_old_friend` | 70〜105歳 |  | 学生時代からの友人が亡くなったと知らせが届いた。 |  |
| 🎂 | `ev_f_100` | 100歳 |  | 100歳の誕生日。市長からお祝いの品が届いた。 |  |
| 🌱 | `ev_f_daily_child` | 1〜5歳 |  | {babyMilestone} |  |
| 📝 | `ev_f_daily_student` |  | 在籍:elem/jhs/hs/univ | {studentDaily} |  |
| ☕ | `ev_f_daily_adult` | 22〜64歳 |  | {adultDaily} |  |
| 🍵 | `ev_f_daily_senior` | 65〜105歳 |  | {seniorDaily} |  |

## 世の中の出来事（2010年スタート）（11件）

| | ID | 時期 | 条件 | 文章 | 選択肢 |
|---|---|---|---|---|---|
| 🌊 | `ev_w_311` | 2011-03 |  | 東日本大震災が起きた。テレビでは、津波の映像が何度も流れた。（{name}はまだ赤ちゃんだった） |  |
| 😷 | `ev_w_covid` | 2020-04 |  | 新型コロナウイルスが世界中に広がり、緊急事態宣言が出た。学校は休校になり、家でオンライン授業を受けた。 |  |
| 🏅 | `ev_w_olympics` | 2021-07 |  | 1年おくれで、東京オリンピック・パラリンピックが開かれた。会場にお客さんは入れなかった。 |  |
| 🙂 | `ev_w_covid_end` | 2023-05 |  | 新型コロナが季節性インフルエンザと同じあつかいになった。マスクを外す人が少しずつ増えてきた。 |  |
| 🏚️ | `ev_w_noto` | 2024-01 |  | 元日に、能登半島で大きな地震が起きた。 |  |
| 🌐 | `ev_w_expo` | 2025-04 |  | 大阪・関西万博が開幕した。空飛ぶクルマのデモ飛行がニュースになった。 |  |
| 🤖 | `ev_w_ai_dawn` | 2035-04 |  | （ゲームの中の未来）AIが人と同じように考え、仕事をこなす時代がやってきた。ニュースでは毎日のように『AIに置きかわる仕事』が話題になっている。 |  |
| 🚘 | `ev_w_auto_drive` | 2038-04 |  | （ゲームの中の未来）運転手のいない自動運転タクシーが、街を走りはじめた。 |  |
| 🤖 | `ev_w_ai_restructure` | 確率:aiRestructure | 雇用:seishain/keiyaku/haken/part/civil_servant | （ゲームの中の未来）会社がAIを導入し、{jobLabel}の仕事の多くが自動化された。{name}の部署はなくなることになった。 | 🔄 会社の中の別の部署に移る（学び直しが必要）<br>［候補リスト:jobs.midCareer］<br>🏫 職業訓練でスキルを学び直す（半年・無料）<br>🌴 早期退職に応じる（退職金が上乗せ） |
| 📉 | `ev_w_ai_pressure` |  | 雇用:seishain/keiyaku/haken/part/civil_servant/freelance | （ゲームの中の未来）AIのおかげで{jobLabel}の仕事は速くなった。でも、そのぶん給料は上がりにくくなった。 |  |
| 📈 | `ev_w_ai_growth` |  |  | （ゲームの中の未来）AIを使いこなせる人の取り合いになり、{jobLabel}の給料が上がった。 |  |

