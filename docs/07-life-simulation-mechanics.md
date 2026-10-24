# 人生シミュレーション詳細メカニクス

## 概要
プレイヤーが日本で「ごく普通に」生まれて、経済格差、社会保障、リスクイベント、親子関係など**現実のすべて**を体験するシミュレーション。

---

## 1. 地域別リアリティ（学校・企業数の格差）

### 1-1. 地域別学校数・企業数（実データ参考）

```json
{
  "regionData": {
    "tokyo": {
      "kindergarten": 1200,
      "elementary_public": 1100,
      "elementary_private": 150,
      "junior_high": 650,
      "high_school": 350,
      "university": 150,
      "technical_school": 80,
      "corporations": 45000,
      "economicLevel": "very_high",
      "populationDensity": "very_high",
      "description": "大都市。学校・企業豊富。選択肢が最も多い"
    },
    "kyoto": {
      "kindergarten": 450,
      "elementary_public": 500,
      "elementary_private": 60,
      "junior_high": 200,
      "high_school": 120,
      "university": 50,
      "technical_school": 20,
      "corporations": 15000,
      "economicLevel": "high",
      "populationDensity": "high",
      "description": "古都。観光・教育・文化が中心"
    },
    "aomori": {
      "kindergarten": 150,
      "elementary_public": 280,
      "elementary_private": 5,
      "junior_high": 100,
      "high_school": 40,
      "university": 8,
      "technical_school": 5,
      "corporations": 2000,
      "economicLevel": "low",
      "populationDensity": "very_low",
      "description": "地方。選択肢少ない。上京圧力強い"
    }
  }
}
```

### 1-2. 地域によって提示される進路選択肢の数

```
東京都生まれ → 進路選択肢：最大50個（非常に豊富）
大阪府生まれ → 進路選択肢：最大30個
地方県生まれ → 進路選択肢：最大10個

さらに、「東京への進学」「上京」が地方出身者には
頻繁にイベントとして出現する
```

---

## 2. 学校・企業の地名付きランダム生成

### 2-1. 学校名の生成ルール

```
実際の大学名を使わず、地名+学部+偏差値で表示

【大学の例】

東京都：
- 東京大学相当（偏差値70、工学部）
  → "東京国立総合大学 工学部（偏差値70）"
- 早稲田大学相当（偏差値65）
  → "東京私立大学A 理工学部（偏差値65）"
- 明治大学相当（偏差値62）
  → "東京私立大学B 工学部（偏差値62）"

大阪府：
- "大阪国立大学 工学部（偏差値68）"
- "大阪私立大学 理工学部（偏差値60）"

秋田県：
- "秋田県国立大学 工学部（偏差値55）"
- "秋田県私立短期大学（偏差値40）"

【専門学校の例】
- "東京デザイナー専門学校（偏差値35）"
- "大阪自動車整備専門学校（偏差値30）"
- "秋田県農業専門学校（偏差値28）"

【高校の例】
- "東京都立進学高校（偏差値65）"
- "秋田県公立高校（偏差値48）"
```

### 2-2. 企業名の生成ルール

```
【大企業】
- "東京IT企業（大手）" 給料500万
- "大阪製造業（大手）" 給料450万
- "福岡物流企業（大手）" 給料380万

【中企業】
- "東京コンサル企業（中堅）" 給料420万
- "大阪建設業（中堅）" 給料380万

【小企業・スタートアップ】
- "東京スタートアップ（IT）" 給料350万 リスク高
- "地方町工場（機械加工）" 給料280万

【地方特有の企業】
- "北海道農業関連企業" 給料250万
- "沖縄観光企業" 給料220万
- "鳥取県公務員（地方自治体）" 給料320万

職種も地域に合わせる：
- 東京：IT、金融、広告、コンサル中心
- 大阪：製造、商社、流通中心
- 地方：農業、観光、公務員、小売中心
```

---

## 3. リアルな社会保障・経済システム

### 3-1. 家庭の裕福さ（隠しステータス）

```json
{
  "familyWealthStatus": {
    "very_rich": {
      "threshold": 80,
      "parentIncome": "1500万以上",
      "educationSupport": "私立中・高・大学へ行かせる経済余裕",
      "features": {
        "tuitionFullyFunded": true,
        "scholarshipNotNeeded": true,
        "childSupportBudget": 500000,
        "parentDeathRisk": "low",
        "inheritancePossible": true
      }
    },
    "rich": {
      "threshold": "60～79",
      "parentIncome": "1000万～1500万",
      "educationSupport": "進学可能。奨学金不要",
      "features": {
        "tuitionMostlyCovered": true,
        "scholarshipMaybe": false,
        "childSupportBudget": 200000,
        "parentDeathRisk": "low"
      }
    },
    "middle": {
      "threshold": "40～59",
      "parentIncome": "500万～1000万",
      "educationSupport": "進学は可能だが、奨学金検討の余地あり",
      "features": {
        "tuitionPartial": true,
        "scholarshipMaybe": true,
        "childSupportBudget": 50000,
        "parentDeathRisk": "medium"
      }
    },
    "poor": {
      "threshold": "20～39",
      "parentIncome": "250万～500万",
      "educationSupport": "進学困難。奨学金必須",
      "features": {
        "tuitionCovered": false,
        "scholarshipRequired": true,
        "childSupportBudget": 0,
        "parentDeathRisk": "high",
        "parentUnemploymentRisk": "medium"
      }
    },
    "very_poor": {
      "threshold": "0～19",
      "parentIncome": "250万未満",
      "educationSupport": "進学困難。高卒で就職圧力強い",
      "features": {
        "tuitionCovered": false,
        "scholarshipRequired": true,
        "livingSupportNeeded": true,
        "parentDeathRisk": "very_high",
        "parentUnemploymentRisk": "high",
        "parentDisabilityRisk": "high"
      }
    }
  }
}
```

### 3-2. 奨学金イベント（15～18歳）

```
【大学進学時のイベント】

進学先が決まりました。

親の経済状況を確認...

あなたの家庭の年収：600万
大学学費：150万/年

【選択肢】

① 親に全額出してもらう
  → 親に負担がかかる
  → 家庭ストレス +5
  → 後で親の介護を助ける圧力

② 奨学金を利用する（貸与型）
  → 卒業後、返済義務発生
  → 初給料から月2万の返済
  → 4年間で計96万の借金

③ 奨学金を利用する（給付型）
  → 返済不要
  → 成績良い必須（学力ステータス確認）
  → あなたは学力が足りない → 申請できない

④ アルバイト + 親のサポート
  → 進学は可能だが、学業に支障
  → 大学ステータス低下リスク

⑤ 進学を諦めて、高卒で就職
  → 家庭経済助ける
  → 家庭ストレス -5
```

### 3-3. 健康保険・年金システム

```javascript
function initializeInsuranceSystem(playerAge, employmentType) {
  if (playerAge < 16) {
    return {
      type: "parent_dependent",
      cost: 0,
      coverage: "parents_insurance"
    };
  } else if (playerAge < 20 && employmentType === "student") {
    return {
      type: "student_health_insurance",
      cost: 2000,  // 月額
      coverage: "basic"
    };
  } else if (employmentType === "employee") {
    return {
      type: "company_health_insurance",
      cost: 5000,  // 給料から天引き
      coverage: "full",
      parentalLeave: true,
      pensionContribution: true
    };
  } else if (employmentType === "self_employed" || employmentType === "freelancer") {
    return {
      type: "national_health_insurance",
      cost: 8000,  // 月額（自分で払う）
      coverage: "basic",
      pensionContribution: 16000  // 月額（別途必要）
    };
  }
}

// 毎月のシステム：
// - 給料から健康保険、厚生年金、所得税が天引き
// - 国保の場合、毎月納付書が届く（払い忘れイベント発生可能）
// - 老後：年金受け取り開始（65歳）
// - 退職金：企業に20年勤続で受け取り
```

---

## 4. リスクイベント：交通事故・病気・親の問題

### 4-1. 交通事故率（年代別・地域別）

```
【毎年の交通事故確率】

年代：16～20歳
- バイク所有者：5%（若年層は事故率高い）
- 自動車所有者：2%
- 歩行者：0.5%

年代：21～40歳
- バイク：2%
- 自動車：1%
- 歩行者：0.2%

地域：
- 都市部（渋滞多い）：確率 -30%（時速低い）
- 地方（スピード出る）：確率 +50%

事故イベント時：
- 軽い事故（確率60%）：医療費10万、休業1週間
- 重い事故（確率35%）：医療費100万、入院1ヶ月、給料-30%
- 死亡事故（確率5%）：ゲームオーバー
```

### 4-2. 親の離婚イベント

```
【親の離婚確率】

初期値（ゲーム開始時）：
- 自動で、親の関係ステータスが決定（0～100）
- 0～30：離婚リスク高い
- 30～70：平均的
- 70～100：安定している

毎年の離婚確率：
- 関係度0～30 の場合、毎年10%で離婚イベント発生

離婚イベント発生時：
【年齢12歳で離婚が決まりました】

親の関係が悪化していました。
両親が離婚することになりました。

【影響】
- 家庭ゲージ -30
- 親の経済状況 -15%（シングル親世帯へ）
- 進学支援 -20%
- ストレス +20
- 心理的負荷イベント発生

【選択肢】
① 母親に付く（シングルマザー世帯へ）
  → 経済支援（児童扶養手当）+100万/年
  → 母親が仕事で忙しい → 家庭ストレス続く

② 父親に付く（シングルファザー世帯へ）
  → 経済支援（児童扶養手当）+100万/年
  → 父親が家事できない → 家庭混乱
```

### 4-3. 親の介護イベント（40代～）

```
【親の高齢化・介護】

年齢：45歳で両親が70歳前後へ

【介護レベルの発生確率】

毎年、親が健康を害する確率：
- 45～55歳：5%
- 55～65歳：10%
- 65歳以上：20%

介護が必要になった場合：

【年齢52歳 親が脳卒中で倒れました】

介護レベル：要介護2（中程度）

【選択肢】

① 親と同居して介護する
  → 介護費用 月5万
  → 勤務時間制限 → 給料 -30%
  → キャリア停止
  → ただし家庭ゲージ +10

② 介護施設に入所させる
  → 介護費用 月15万
  → 経済的圧力大
  → 親への罪悪感 → 家庭ゲージ -5
  → ただし仕事継続可能

③ 兄弟姉妹と交代で介護
  → 介護費用 月8万
  → 手間かかるが親も喜ぶ
  → 兄弟姉妹とのトラブル可能性

④ 親を引き離す
  → 家庭ゲージ -20
  → 親との関係断絶
  → 後々後悔イベント
```

### 4-4. 親の失業・死亡

```
【親の失業イベント】

毎年の親失業確率：
- 年齢40～50歳：1%
- 年齢50～60歳：3%
- 年齢60～70歳：10%（定年）

失業イベント時：
- 家庭経済 -30%
- 親のストレス +30
- 家庭ゲージ -10
- 進学支援 消滅

【親の死亡イベント】

毎年の親死亡確率：
- 年齢60～70歳：2%
- 年齢70～80歳：8%

死亡イベント時：
- 葬式費用 200万
- グリーフ（喪失感） ゲーム進行が遅くなる
- 遺産 家庭経済状況で決定
  - 裕福な家庭：遺産500万
  - 中流家庭：遺産100万
  - 貧困家庭：借金相続

特に親が高齢で、あなたが大学生の場合：
- 進学継続困難に
- 中退して就職の選択肢も出現
```

---

## 5. 16歳からの「所持金」ステータス

### 5-1. 所持金の源泉

```javascript
function updatePocketMoney(playerAge, activities) {
  let monthlyIncome = 0;
  
  // 親からの小遣い（～18歳）
  if (playerAge < 18) {
    monthlyIncome += playerFamilyWealth.childSupportBudget / 12;  // 月額
  }
  
  // アルバイト収入（16～）
  if (activities.includes("part_time_job")) {
    monthlyIncome += calculatePartTimeIncome(playerAge);
  }
  
  // 給料（就職後）
  if (playerEmployment.type === "employee") {
    monthlyIncome = playerEmployment.monthlySalary;
  }
  
  // 奨学金（返済型）
  if (activities.includes("scholarship_debt")) {
    monthlyIncome -= scholarshipRepayment;
  }
  
  // 生活費（家計から）
  if (playerAge >= 18) {
    monthlyExpense = calculateLivingExpense(playerAge, playerLocation);
  }
  
  return monthlyIncome - monthlyExpense;
}
```

### 5-2. アルバイトシステム（16～22歳）

```json
{
  "partTimeJobs": [
    {
      "id": "convenience_store",
      "name": "コンビニ店員",
      "hourlyWage": 1200,
      "maxHoursPerWeek": 20,
      "stressIncrease": 2,
      "healthDecrease": 1,
      "studyImpact": -10,
      "description": "都市部で探しやすい。学業との両立困難"
    },
    {
      "id": "fast_food",
      "name": "ファストフード店員",
      "hourlyWage": 1150,
      "maxHoursPerWeek": 25,
      "stressIncrease": 3,
      "healthDecrease": 2,
      "studyImpact": -15,
      "description": "年中募集。体力勝負"
    },
    {
      "id": "tutor",
      "name": "家庭教師",
      "hourlyWage": 2500,
      "maxHoursPerWeek": 10,
      "stressIncrease": 1,
      "healthDecrease": 0,
      "studyImpact": +5,
      "description": "高学力必須。給料良い。学業助け"
    },
    {
      "id": "delivery",
      "name": "配達（ウーバーイーツなど）",
      "hourlyWage": 1400,
      "maxHoursPerWeek": 30,
      "stressIncrease": 2,
      "healthDecrease": 3,
      "studyImpact": -20,
      "description": "自由だが、天候に左右される"
    },
    {
      "id": "research_subject",
      "name": "大学の研究被験者",
      "hourlyWage": 1000,
      "maxHoursPerWeek": 5,
      "stressIncrease": 0,
      "healthDecrease": 0,
      "studyImpact": 0,
      "description": "楽。給料安い"
    }
  ]
}
```

### 5-3. アルバイト選択イベント（16歳）

```
【アルバイト選択イベント】

あなたは16歳になりました。
親からの小遣いは月1万円です。

友達はアルバイトを始めました。
あなたはどうしますか？

【選択肢】

① アルバイトしない
  → 所持金：月1万（親の小遣いのみ）
  → 友達と遊びにくい（コミュ力 -2/年）
  → 勉強に専念（学力 +5/年）

② コンビニでアルバイト
  → 所持金：月3万（時給1200×20時間/週）
  → ストレス +2/月
  → 学業に支障（学力 -10/年）

③ 家庭教師のアルバイト
  → 所持金：月2.5万（時給2500×10時間/週）
  → ストレス +1/月
  → 学力むしろ上昇（+5/年）

【毎年の判定】
アルバイト時間が増えすぎ（>30時間/週）：
- 学業成績低下
- 親から「勉強しなさい」と注意
- 進学受験に支障
```

---

## 6. 部活動システム（中学・高校）

### 6-1. 部活動の種類（リアルなラインアップ）

```json
{
  "clubs": [
    {
      "category": "sports",
      "name": "硬式野球部",
      "timeCommitment": "very_high",
      "physicalDemand": "very_high",
      "stressLevel": "high",
      "injuryRisk": "high",
      "statusImpact": {
        "athletic": +10,
        "communication": +5,
        "academic": -10
      },
      "socialStatus": "high",
      "college_sports_pathway": true,
      "burnout_risk": "high"
    },
    {
      "category": "sports",
      "name": "卓球部",
      "timeCommitment": "high",
      "physicalDemand": "medium",
      "stressLevel": "medium",
      "injuryRisk": "low",
      "statusImpact": {
        "athletic": +8,
        "communication": +3,
        "academic": -5
      },
      "socialStatus": "medium"
    },
    {
      "category": "culture",
      "name": "吹奏楽部",
      "timeCommitment": "high",
      "physicalDemand": "low",
      "stressLevel": "medium",
      "statusImpact": {
        "artistic": +10,
        "communication": +5,
        "academic": -5
      },
      "socialStatus": "medium",
      "scholarshipPathway": false
    },
    {
      "category": "culture",
      "name": "美術部",
      "timeCommitment": "medium",
      "physicalDemand": "low",
      "stressLevel": "low",
      "statusImpact": {
        "artistic": +10,
        "academic": 0
      },
      "socialStatus": "low",
      "flexibility": "high"
    },
    {
      "category": "academic",
      "name": "受験勉強（部活なし）",
      "timeCommitment": "variable",
      "statusImpact": {
        "academic": +15,
        "communication": -3
      },
      "socialStatus": "very_low",
      "collegeAdmissionBoost": true
    }
  ]
}
```

### 6-2. 部活による人間関係とステータス

```
硬式野球部：
- 時間的拘束：最大（毎日）
- 身体的負荷：最大
- 人間関係：深い絆
- 燃え尽き：高リスク（大けが、成績不振で挫折）
- 進学：体育推薦ルートあり

美術部：
- 時間的拘束：少ない
- 身体的負荷：なし
- 人間関係：浅い
- 芸術センス：+10/年
- 自由度：最高

受験勉強（部活なし）：
- 学力：+15/年（最高）
- 友達：減少
- 青春度：低い
- 大学合格率：+30%
- メンタル：受験ストレス+20
```

---

## 7. 大学サークル（18～22歳）

### 7-1. サークル種類

```json
{
  "circles": [
    {
      "name": "テニスサークル",
      "type": "sports",
      "timeCommitment": "medium",
      "costPerMonth": 3000,
      "statusImpact": {
        "athletic": +3,
        "communication": +5,
        "health": +5
      },
      "dating": "very_high",
      "description": "出会いの宝庫。恋愛確率UP"
    },
    {
      "name": "飲み会サークル",
      "type": "social",
      "timeCommitment": "high",
      "costPerMonth": 5000,
      "statusImpact": {
        "communication": +10,
        "academic": -20
      },
      "health": -5,
      "dating": "high",
      "description": "飲んだくれ。単位落とすリスク"
    },
    {
      "name": "ボランティアサークル",
      "type": "volunteer",
      "timeCommitment": "medium",
      "costPerMonth": 0,
      "statusImpact": {
        "communication": +5,
        "stress": -5,
        "reputation": +10
      },
      "description": "就職面接で好評価"
    },
    {
      "name": "研究サークル",
      "type": "academic",
      "timeCommitment": "high",
      "costPerMonth": 2000,
      "statusImpact": {
        "academic": +10,
        "communication": +3
      },
      "dating": "low",
      "description": "オタク確定。でも大学院進学に有利"
    }
  ]
}
```

---

## 8. 生活費・税金・社会保障の現実化

### 8-1. 毎月の固定支出（就職後）

```
給料：500万/年（月41万）

【毎月の支出】
- 健康保険：-5000（給料天引き）
- 厚生年金：-6000（給料天引き）
- 所得税：-3000（給料天引き）
  → 手取り：約27万

【生活費】
- 家賃（東京）：-8万
- 食費：-3万
- 交通費：-1万
- 携帯・電気・水道：-1万
- 衣類・日用品：-1万
- 保険（任意）：-2000
- 飲み会・交際費：-2万
- 娯楽：-1万
  → 支出計：約17万

【毎月の貯金】
27万 - 17万 = 10万/月 = 120万/年
```

### 8-2. 借金・ローン管理

```
【奨学金返済（貸与型）】
- 返済額：月1.5万～3万（契約による）
- 20年間返済
- 延滞すると信用情報に傷

【住宅ローン（30代）】
- 東京で家を買う場合：2000万～3000万
- 返済額：月6～7万
- 35年ローン

【車のローン】
- 新車購入：300万
- 返済額：月6000～1万
- 5年ローン

【消費者金融・クレジット**
- 一時的にお金が必要な場合
- 金利が高い（18%程度）
- 借金がふくらむリスク
```

---

## 9. 年金・退職金・老後（65歳～）

### 9-1. 年金受取シミュレーション

```
【65歳で年金受け取り開始】

40年間、厚生年金を納めた場合：
- 月額受取：約18万（平均）
- 年額受取：約216万

【生活費】
- 家賃（住宅ローン完済後）：0円
- 生活費：10万/月
- 医療費：3万/月（加齢に伴い増加）
  → 月13万必要
  → 年154万必要

年金だけでは足りない！
→ 貯金を取り崩す必要
→ 65～90歳で26年間
→ 貯金が底をつくリスク
```

### 9-2. 退職金

```
企業に20年以上勤続の場合：
- 退職金：300～500万
- これがセーフティネット

ただし：
- フリーランス・自営業は退職金なし
- 転職が多いと退職金大幅減少
```

---

## 10. リアルなDB構築のタスクリスト

```
【必要なデータ】

都道府県別（47×カテゴリ）：
- [ ] 交通事故率（警察庁データ）
- [ ] 平均給与（厚労省調査）
- [ ] 進学率・就職率（文部科学省）
- [ ] 介護施設数・費用（厚労省）

アルバイト（全国×職種×時給）：
- [ ] コンビニ店員（全国平均時給）
- [ ] 飲食店（地域別時給）
- [ ] 家庭教師（学歴別）
- [ ] その他

部活動（全国の代表的な部活×50種）：
- [ ] 時間的拘束
- [ ] 身体的負荷
- [ ] 進学への影響

企業（全国×業種×規模）：
- [ ] 給料（DODA参考）
- [ ] 残業時間（OpenWork参考）
- [ ] 離職率（業界別）
- [ ] 昇進難易度
```

