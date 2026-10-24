# 進学先・就職先データベース仕様

## 概要
進学先（学校）と就職先（企業・職種）を多様にリアルに用意し、プレイヤーが「自分に合った選択肢」から選ぶ仕組み。進路指導者（保護者・先生）から5択で候補を提示。合格率はプレイヤーに表示され、落ちた場合は留年か就職を選択。

---

## 1. 学校データベース構造

### 1-1. schools.json（全国学校マスター）

```json
{
  "schools": [
    {
      "id": "sch_001",
      "type": "kindergarten",      // kindergarten, daycare, elementary_public, elementary_private, junior_high_public, junior_high_private, high_school_public, high_school_private, university_national, university_private, junior_college, technical_school, international_school, correspondence_school, night_school, free_school
      "name": "◇◇幼稚園",
      "prefecture": "tokyo",
      "city": "shibuya",
      "schoolYear": [
        {
          "year": 3,
          "acceptanceRate": 100,   // 実際の受け入れ率
          "features": "公開保育、英語教育"
        }
      ],
      "tuitionAnnual": 180000,     // 年間学費（万円）
      "location": "tokyo",         // 通学可能範囲
      "commuteTime": 10,           // 平均通学時間（分）
      "reputation": "high"         // low, medium, high
    },
    {
      "id": "sch_tokyo_001",
      "type": "elementary_public",
      "name": "渋谷区立◇◇小学校",
      "prefecture": "tokyo",
      "city": "shibuya",
      "schoolYear": [
        {
          "year": 6,
          "acceptanceRate": 99,
          "features": "公立。安定した教育"
        }
      ],
      "tuitionAnnual": 0,
      "location": "tokyo",
      "commuteTime": 15,
      "reputation": "medium",
      "isPublic": true
    },
    {
      "id": "sch_univ_todai",
      "type": "university_national",
      "name": "東京大学",
      "prefecture": "tokyo",
      "departments": [
        {
          "id": "dept_todai_eng",
          "name": "工学部",
          "difficulty": "high",
          "requiredSubjects": {
            "math": 5,
            "science": 5
          },
          "hensachi": 70,          // 偏差値
          "acceptanceRate": 15,    // 実際の合格率（難関は低い）
          "placement": "high",     // 就職先の質
          "salary": 450            // 初任給（万円）
        },
        {
          "id": "dept_todai_lit",
          "name": "文学部",
          "difficulty": "high",
          "requiredSubjects": {
            "japanese": 4,
            "english": 4
          },
          "hensachi": 68,
          "acceptanceRate": 18,
          "placement": "medium",
          "salary": 330
        }
      ],
      "tuitionAnnual": 540,        // 国立大学共通（年間）
      "location": "tokyo",
      "reputation": "very_high",
      "isNational": true
    },
    {
      "id": "sch_univ_waseda",
      "type": "university_private",
      "name": "早稲田大学",
      "prefecture": "tokyo",
      "departments": [
        {
          "id": "dept_waseda_sci",
          "name": "理工学部",
          "difficulty": "high",
          "requiredSubjects": {
            "math": 4,
            "science": 4
          },
          "hensachi": 65,
          "acceptanceRate": 25,    // 私立は合格率がやや高い
          "placement": "high",
          "salary": 400
        },
        {
          "id": "dept_waseda_biz",
          "name": "商学部",
          "difficulty": "medium",
          "requiredSubjects": {
            "math": 3,
            "society": 3
          },
          "hensachi": 62,
          "acceptanceRate": 35,
          "placement": "high",
          "salary": 380
        }
      ],
      "tuitionAnnual": 1200,       // 私立大学は学費が高い
      "location": "tokyo",
      "reputation": "very_high"
    },
    {
      "id": "sch_tech_auto",
      "type": "technical_school",
      "name": "◇◇自動車整備専門学校",
      "prefecture": "tokyo",
      "programs": [
        {
          "id": "prog_auto_2yr",
          "name": "自動車整備科（2年）",
          "difficulty": "low",
          "requiredSubjects": {},  // 偏差値不要
          "acceptanceRate": 90,    // 専門学校は入学しやすい
          "placement": "medium",
          "salary": 280,
          "jobType": "technical"
        }
      ],
      "tuitionAnnual": 650,
      "location": "tokyo",
      "reputation": "medium"
    },
    {
      "id": "sch_intl_tokyo",
      "type": "international_school",
      "name": "◇◇インターナショナルスクール",
      "prefecture": "tokyo",
      "programs": [
        {
          "id": "prog_intl_ib",
          "name": "IB Diploma（国際バカロレア）",
          "difficulty": "high",
          "requiredSubjects": {
            "english": 5
          },
          "acceptanceRate": 60,
          "placement": "very_high",
          "salary": 500,
          "globalNetworking": true
        }
      ],
      "tuitionAnnual": 2000,       // インターはかなり高い
      "location": "tokyo",
      "reputation": "very_high"
    }
  ]
}
```

### 1-2. school_categories.json（学校タイプの分類）

```json
{
  "schoolTypes": {
    "kindergarten": {
      "name": "幼稚園",
      "ageRange": [3, 5],
      "duration": 3,
      "counselor": "parents"
    },
    "daycare": {
      "name": "保育園",
      "ageRange": [0, 5],
      "duration": 6,
      "counselor": "parents"
    },
    "elementary_public": {
      "name": "公立小学校",
      "ageRange": [6, 11],
      "duration": 6,
      "counselor": "parents"
    },
    "elementary_private": {
      "name": "私立小学校",
      "ageRange": [6, 11],
      "duration": 6,
      "counselor": "parents",
      "tuitionRequired": true
    },
    "junior_high_public": {
      "name": "公立中学校",
      "ageRange": [12, 14],
      "duration": 3,
      "counselor": ["parents", "teacher"]
    },
    "junior_high_private": {
      "name": "私立中学校",
      "ageRange": [12, 14],
      "duration": 3,
      "counselor": ["parents", "teacher"],
      "tuitionRequired": true
    },
    "high_school_public": {
      "name": "公立高校",
      "ageRange": [15, 17],
      "duration": 3,
      "counselor": ["parents", "teacher"]
    },
    "high_school_private": {
      "name": "私立高校",
      "ageRange": [15, 17],
      "duration": 3,
      "counselor": ["parents", "teacher"],
      "tuitionRequired": true
    },
    "correspondence_school": {
      "name": "通信制高校",
      "ageRange": [15, 25],
      "duration": 3,
      "counselor": ["parents", "teacher"],
      "flexible": true,
      "partTimeWork": true
    },
    "night_school": {
      "name": "定時制高校",
      "ageRange": [15, 20],
      "duration": 4,
      "counselor": ["parents", "teacher"],
      "flexible": true,
      "partTimeWork": true
    },
    "university_national": {
      "name": "国立大学",
      "ageRange": [18, 22],
      "duration": 4,
      "counselor": ["parents", "teacher"],
      "competitive": true
    },
    "university_private": {
      "name": "私立大学",
      "ageRange": [18, 22],
      "duration": 4,
      "counselor": ["parents", "teacher"],
      "competitive": true,
      "tuitionRequired": true
    },
    "junior_college": {
      "name": "短期大学",
      "ageRange": [18, 20],
      "duration": 2,
      "counselor": ["parents", "teacher"]
    },
    "technical_school": {
      "name": "専門学校",
      "ageRange": [18, 22],
      "duration": 2,
      "counselor": ["parents", "teacher"],
      "jobFocused": true
    },
    "free_school": {
      "name": "フリースクール",
      "ageRange": [6, 15],
      "duration": "variable",
      "counselor": "parents",
      "alternative": true
    },
    "international_school": {
      "name": "インターナショナルスクール",
      "ageRange": [3, 18],
      "duration": "variable",
      "counselor": "parents",
      "english": true,
      "global": true,
      "tuitionRequired": true
    }
  }
}
```

---

## 2. 進路指導メカニズム

### 2-1. 進路指導者の決定

```javascript
function getCareerCounselor(playerAge) {
  if (playerAge < 6) {
    return ["parents"];  // 幼児期：親のみ
  } else if (playerAge < 15) {
    return ["parents", "teacher"];  // 初等・中等：親と先生
  } else {
    return ["parents", "teacher"];  // 高等・大学：親と先生
  }
}
```

### 2-2. 進路選択肢の提示（5択 + More）

**ゲーム画面例**：

```
【進路指導面談】
年齢：16歳（高校1年生 秋）

担任の先生：
「◇◇さんの成績を見ると、以下の進路が
 考えられます。5つの候補から選んでください」

成績：数学4, 国語3, 英語3, 理科3, 社会2

【推奨進路候補】
① 東京大学 工学部（合格率 18%）
  → 難関ですが、数学が得意なら狙えます

② 早稲田大学 理工学部（合格率 30%）
  → より入学しやすい選択肢です

③ 東京工業大学 工学院（合格率 22%）
  → 工学系では有名です

④ 東京農工大学 工学部（合格率 35%）
  → 国立で合格しやすい選択肢

⑤ 通信制高校への転籍（合格率 95%）
  → 仕事をしながら高卒を目指す選択肢

⑥ もっと見る >> （別の候補を表示）
```

### 2-3. "もっと見る"ボタンの動作

```
【別の進路候補】
⑥ 明治大学 理工学部（合格率 45%）
  → より入学しやすい私立です

⑦ 立教大学 理学部（合格率 50%）
  → 都内の有名私立です

⑧ 日本大学 工学部（合格率 65%）
  → 入学しやすい私立です

⑨ 専門学校（ソフトウェア開発科）（合格率 85%）
  → すぐに実務スキルを身につけられます

⑩ 高卒で就職（合格率 70%）
  → 就職先の候補を見る
```

---

## 3. 合格判定メカニズム

### 3-1. 合格確率の計算

```javascript
function calculateAdmissionRate(schoolId, playerStats) {
  const school = schools[schoolId];
  const department = school.departments[0];  // 学部選択時に詳細化
  
  // 1. 基本難易度
  const baseDifficulty = school.baseAcceptanceRate || 50;
  
  // 2. 学力による修正
  let subjectBonus = 0;
  for (const [subject, requiredScore] of Object.entries(department.requiredSubjects)) {
    const playerScore = playerStats.reportCard[subject];
    const gap = playerScore - requiredScore;
    
    if (gap >= 0) {
      subjectBonus += gap * 5;  // 得意ほど上昇
    } else {
      subjectBonus += gap * 10; // 不得意ほど大きく低下
    }
  }
  
  // 3. 隠しステータス（才能）による修正
  const talentBonus = playerStats.talents.academic / 100 * 20;
  
  // 4. 都道府県による修正
  const prefBonus = playerStats.prefectureDifficulty;
  
  const finalRate = baseDifficulty + subjectBonus + talentBonus - prefBonus;
  return Math.max(5, Math.min(95, finalRate));  // 5%～95%の範囲
}

// 使用例
const admissionRate = calculateAdmissionRate("sch_univ_todai", playerStats);
// → "合格率 18%"と表示

if (Math.random() * 100 < admissionRate) {
  // 合格！
} else {
  // 不合格
  // → 留年or就職を選択させる
}
```

### 3-2. 不合格時のフロー

```
【進学試験の結果】

残念ですが、東京大学 工学部は
不合格でした。（合格率18% でしたが...）

【今後の選択肢】
① 浪人して来年再受験
  → 1年間、勉強に専念します
  → 給料：0円、ストレス増加

② 別の大学に進学する
  → 進路指導の候補を見直します

③ 専門学校に進学する
  → 実務スキルを身につけます

④ 高卒で就職する
  → 就職先の候補を見ます
```

---

## 4. 企業・職種データベース構造

### 4-1. jobs.json（職業マスター）

```json
{
  "jobs": [
    {
      "id": "job_engineer",
      "jobCategory": "technology",
      "jobTitle": "ソフトウェアエンジニア",
      "companies": [
        {
          "id": "comp_google_japan",
          "name": "Google Japan",
          "size": "large",
          "location": "tokyo",
          "industry": "technology",
          "salary": 500,
          "baseSalary": 500,
          "bonusRate": 0.2,
          "overtime": 10,           // 平均残業時間（時間/月）
          "workLifeBalance": "high",
          "stress": "medium",
          "placement": "very_high",
          "acceptanceRate": 8       // 実際の採用試験合格率（難関企業は低い）
        },
        {
          "id": "comp_rakuten",
          "name": "楽天",
          "size": "large",
          "location": "tokyo",
          "industry": "technology",
          "salary": 450,
          "baseSalary": 450,
          "bonusRate": 0.15,
          "overtime": 15,
          "workLifeBalance": "medium",
          "stress": "medium",
          "placement": "high",
          "acceptanceRate": 12
        },
        {
          "id": "comp_startup_a",
          "name": "スタートアップA",
          "size": "small",
          "location": "tokyo",
          "industry": "technology",
          "salary": 380,
          "baseSalary": 380,
          "bonusRate": 0.3,         // スタートアップはボーナスが変動
          "overtime": 30,           // 忙しい
          "workLifeBalance": "low",
          "stress": "high",
          "placement": "medium",
          "acceptanceRate": 40,     // 入りやすいが...
          "risk": "high"            // 倒産リスク
        }
      ]
    },
    {
      "id": "job_sales",
      "jobCategory": "business",
      "jobTitle": "営業職",
      "companies": [
        {
          "id": "comp_insurance",
          "name": "大手保険会社",
          "size": "large",
          "location": "nationwide",
          "salary": 400,
          "baseSalary": 280,
          "bonusRate": 0.5,         // 営業は成果報酬型
          "overtime": 20,
          "workLifeBalance": "medium",
          "stress": "medium",
          "placement": "high",
          "acceptanceRate": 35
        }
      ]
    },
    {
      "id": "job_nurse",
      "jobCategory": "healthcare",
      "jobTitle": "看護師",
      "companies": [
        {
          "id": "comp_hospital_tokyo",
          "name": "大学附属病院",
          "size": "large",
          "location": "tokyo",
          "salary": 350,
          "baseSalary": 350,
          "bonusRate": 0.1,
          "overtime": 25,
          "workLifeBalance": "low",
          "stress": "high",         // 肉体的つらさが高い
          "physicalDemand": "very_high",
          "placement": "very_high",
          "acceptanceRate": 60
        }
      ]
    },
    {
      "id": "job_freeter",
      "jobCategory": "service",
      "jobTitle": "アルバイト・非正規",
      "companies": [
        {
          "id": "comp_convenience_store",
          "name": "コンビニ",
          "size": "chain",
          "location": "nationwide",
          "salary": 200,
          "baseSalary": 160,        // 最低賃金レベル
          "bonusRate": 0,
          "overtime": 5,
          "workLifeBalance": "high",
          "stress": "low",
          "placement": "medium",
          "acceptanceRate": 90      // 入りやすい
        }
      ]
    }
  ]
}
```

---

## 5. 職業パラメーター詳細仕様

### 5-1. 職業による生活パラメーター変動

```javascript
function calculateJobParameters(jobId, companyId, yearsWorked) {
  const job = jobs[jobId];
  const company = job.companies.find(c => c.id === companyId);
  
  return {
    // 経済面
    monthlySalary: company.baseSalary + (company.bonusRate * company.baseSalary * 12 / 12),
    annualBonus: company.salary * company.bonusRate * 12,
    annualIncome: company.salary * 12,
    
    // 時間的余裕
    monthlyOvertime: company.overtime,
    workLifeBalance: company.workLifeBalance,  // low/medium/high
    
    // 肉体的・精神的つらさ
    stress: company.stress,           // low/medium/high
    physicalDemand: company.physicalDemand || "medium",  // low/medium/high
    
    // 昇給
    annualRaise: company.baseSalary * 0.03 * yearsWorked,  // 毎年3%昇給想定
    
    // 転職の容易さ
    marketValue: job.placement,  // low/medium/high/very_high
  };
}
```

### 5-2. 継続による給料・ストレス変動

```
【毎年の変動】

給料：
- 毎年 +3～5% 昇給（年次昇給）
- 3年勤続で +10% ボーナス
- 5年勤続で昇進機会（給料+20%）

ストレス：
- 初年度：入社ストレス +20%
- 2年目以降：毎年 -5%（慣れ）
- ただし年間残業240時間超なら +10%（過労）

健康値：
- ストレス高い職 毎年 -3
- 肉体的負荷高い職 毎年 -2
- ワークライフバランス良い職 毎年 +1

家庭：
- 残業多い職（月20時間以上） 毎年 -2
- 転勤あり職 毎年 -1
- 給料高い職（年500万以上） 毎年 +1（経済的余裕）
```

### 5-3. 転職イベント（5年ごと）

```
【転職イベント発生】
年齢：28歳（6年勤続）

現在の職：ソフトウェアエンジニア（給料500万）

【転職の選択肢】
① このままこの企業で続ける
  → 昇進に向けて頑張る（確率30%で昇進）

② 別の企業に転職する
  → 転職先の候補を表示
  → 給料アップ or ダウンの可能性

③ 起業する
  → リスク高い（給料不安定）
  → 成功なら給料大幅UP

④ フリーランスになる
  → 時間的自由↑、給料不安定

⑤ 非正規に変わる
  → 時間的自由↑、給料↓
```

---

## 6. 非正規・フリーランス・起業の特殊メカニズム

### 6-1. 非正規職

```
給料：200～300万（低い）
ストレス：低い（気楽）
時間的余裕：高い（副業可能）
昇進：なし（給料固定）
健康：良好（ストレス少ない）
家庭：良好（時間がある）

デメリット：
- 給料が上がらない
- ボーナスなし
- 福利厚生なし
- 結婚時に「相手の親に反対される」可能性
```

### 6-2. フリーランス

```
給料：100～1000万（不安定）
初年度：200万（低い）
成功時（3年後）：500～800万
失敗時：100万以下

ストレス：高い（収入不安定）
時間的余裕：高い（自由）
税金・保険：自分で管理（複雑）
健康：変動（ストレス or 余裕）

メリット：
- 時間的自由
- 給料無制限

デメリット：
- 不安定
- 福利厚生なし
- 結婚相手に反対される可能性
```

### 6-3. 起業

```
給料：0～無制限（超不安定）
初年度：赤字の可能性
成功時（5年後）：1000万以上
失敗時：借金背負う可能性

ストレス：非常に高い
時間的余裕：なし（超忙しい）
倒産リスク：あり（20%程度）

メリット：
- 成功時は給料無制限
- 自分のビジョン実現

デメリット：
- 高リスク
- 家族に反対される
- 健康悪化
- 結婚困難
```

---

## 7. データ量と段階的実装計画

### 7-1. 必要なデータ量（概算）

| カテゴリ | 項目数 | データ量 | 優先度 |
|---------|-------|---------|--------|
| 学校（全国） | 幼稚園200 + 小学校1000 + 中学校500 + 高校300 + 大学600 + 専門学校300 + その他100 = **3000** | 中規模 | **1** |
| 企業・職種 | 業界20 × 職種30 × 企業5 = **3000** | 大規模 | **2** |
| 都道府県補正 | 47都道府県 × 学校タイプ別難易度 | 小規模 | **1** |

### 7-2. 段階的実装（フェーズ分け）

**Phase 1（MVP）**
- 10都市 × 学校タイプ別に各5校＝50校
- 10業界 × 職種5 × 企業3＝150社
- 合格率計算ロジック確定
- フェーズ1で「遊べるレベル」を達成

**Phase 2（拡張）**
- 全47都道府県対応
- 学校データ3000件
- 企業データ500件

**Phase 3（完成）**
- 全データ充実
- 実際の平均給与（DODA参考）を反映
- UI調整

---

## 8. データソース（実装時参考）

```
【学校データの出典】
- 文部科学省 学校基本調査
- 大学偏差値ランキング（河合塾、駿台など）
- 各学校の公式ホームページ
- 都道府県教育委員会

【企業・職種データの出典】
- DODA（職種別平均給与）：https://doda.jp/guide/heikin/syokusyu/
- 厚労省 賃金構造基本統計調査
- 各企業の採用サイト・給与情報
- OpenWork（企業口コミ）
```

