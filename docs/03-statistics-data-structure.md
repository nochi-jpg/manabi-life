# 統計データ反映システム仕様

## 概要
日本の現実的な教育統計・就職統計をゲームに組み込み、プレイヤーの進学・就職難易度が**誕生都道府県に依存する**メカニズムを構築する。

データソース：文部科学省「学校基本調査」、労働統計など公開統計

---

## 1. 統計データの種類

### 1-1. 進学率統計

#### 高校進学率（都道府県別）
進学希望者のうち、高校に実際に進学できる確率。

```
高校進学難易度 = 1 - (都道府県別高校進学率 / 全国平均高校進学率)
範囲：0.8～1.2（0.8 = 進学しやすい、1.2 = 進学しにくい）

例：
全国平均進学率：99.0%
東京進学率：99.5% → 難易度 = 1 - (99.5/99.0) = 0.995（ほぼ変わらず）
進学困難県：95.0% → 難易度 = 1 - (95.0/99.0) = 1.040（やや難しい）
```

#### 大学進学率（都道府県別）
高校卒業後、大学に進学できる確率。

```
大学進学難易度 = 1 - (都道府県別大学進学率 / 全国平均大学進学率)
範囲：0.7～1.3

例：
全国平均進学率：63.0%
東京進学率：72.0% → 難易度 = 1 - (72.0/63.0) = 0.857（進学しやすい）
進学困難県：50.0% → 難易度 = 1 - (50.0/63.0) = 1.206（進学難しい）
```

---

### 1-2. 就職統計

#### 高卒就職率（都道府県別）
高校卒業後、就職できる難易度。

```
高卒就職難易度 = 1 - (都道府県別高卒就職率 / 全国平均)
範囲：0.8～1.5

例：
全国平均就職率：75.0%
大都市：80.0% → 難易度 = 0.933（就職しやすい）
地方過疎：60.0% → 難易度 = 1.20（就職難しい）
```

#### 大卒就職率（都道府県別）
大学卒業後の就職難易度。同様に計算。

```
大卒就職難易度 = 1 - (都道府県別大卒就職率 / 全国平均)
```

---

### 1-3. 移動統計

#### 上京率（地方→東京への人口流出）
地方に生まれた場合、東京への上京イベントが発生する確率。

```
上京イベント発生率 = 都道府県別上京率 / 100
範囲：0% ～ 15%（高い県は若者が東京へ流出）

例：
秋田県：8% → 上京イベント発生率 8%
東京都：0% → 上京イベント発生率 0%（そもそも上京不要）
```

---

## 2. データファイル構造

### 2-1. prefectures.json（都道府県マスターデータ）

```json
{
  "prefectures": [
    {
      "id": 1,
      "name": "北海道",
      "region": "北海道",
      "highSchoolGraduationRate": 100,
      "highSchoolAdvancementRate": 99.2,
      "universityAdvancementRate": 57.3,
      "highSchoolEmploymentRate": 65.5,
      "universityEmploymentRate": 82.1,
      "migrationRateToTokyo": 6.2,
      "economicLevel": "medium",
      "populationDensity": "low",
      "descriptions": {
        "poor_advancement": "地方では進学機会が限られている",
        "good_employment": "大企業が少ないため、中小企業への就職が多い"
      }
    },
    {
      "id": 13,
      "name": "東京都",
      "region": "関東",
      "highSchoolGraduationRate": 100,
      "highSchoolAdvancementRate": 99.8,
      "universityAdvancementRate": 72.5,
      "highSchoolEmploymentRate": 85.0,
      "universityEmploymentRate": 90.2,
      "migrationRateToTokyo": 0,
      "economicLevel": "high",
      "populationDensity": "very_high",
      "descriptions": {
        "excellent_advancement": "進学機会が豊富。全国から進学実績が集中",
        "excellent_employment": "企業が多く、大企業への就職機会が豊富"
      }
    },
    // ... 他47都道府県
  ]
}
```

**説明**：
- `highSchoolAdvancementRate`：高校進学率（%）
- `universityAdvancementRate`：大学進学率（%）
- `highSchoolEmploymentRate`：高卒就職率（%）
- `universityEmploymentRate`：大卒就職率（%）
- `migrationRateToTokyo`：上京率（%）
- `economicLevel`：経済水準（low/medium/high）→ 給料に影響
- `descriptions`：ゲーム中のメッセージテキスト

---

### 2-2. 数値化ロジック

```javascript
// 進学難易度の計算
function calculateUniversityAdvancementDifficulty(prefId) {
  const prefecture = prefectures[prefId];
  const nationalAverage = 63.0; // 全国平均大学進学率
  
  const difficulty = 1 - (prefecture.universityAdvancementRate / nationalAverage);
  return Math.max(0.5, Math.min(1.5, difficulty)); // クリップ
}

// 就職難易度の計算
function calculateUniversityEmploymentDifficulty(prefId) {
  const prefecture = prefectures[prefId];
  const nationalAverage = 85.0; // 全国平均大卒就職率
  
  const difficulty = 1 - (prefecture.universityEmploymentRate / nationalAverage);
  return Math.max(0.5, Math.min(1.5, difficulty));
}

// イベント発生確率（上京）
function getMigrationEventProbability(prefId) {
  const prefecture = prefectures[prefId];
  return prefecture.migrationRateToTokyo / 100;
}
```

---

## 3. ゲーム内イベントへの反映

### 3-1. 進学試験イベント時

```
【進学試験難易度の調整】

基本難度 = 100（全国共通）
都道府県補正係数 = calculateUniversityAdvancementDifficulty(playerPrefId)

最終難度 = 基本難度 × 都道府県補正係数

例：
東京都生まれ（難易度0.857）：最終難度 = 85.7（進学しやすい）
進学困難県（難易度1.206）：最終難度 = 120.6（進学難しい）

⇒ この難度と学力ステータスで合格判定
```

### 3-2. 就職イベント時

```
【就職イベント難易度の調整】

基本難度 = 100
都道府県補正係数 = calculateUniversityEmploymentDifficulty(playerPrefId)

最終難度 = 基本難度 × 都道府県補正係数 × 職業難易度

例：
大企業への就職
東京都（難易度0.88）：最終難度 = 88（就職しやすい）
地方過疎県（難易度1.35）：最終難度 = 135（就職難しい）
```

### 3-3. 上京イベント

```
【20～35歳での上京イベント発生確率】

地方生まれ（東京以外）の場合、毎年以下の確率で上京イベントが発生：

上京イベント発生確率 = getMigrationEventProbability(playerPrefId)

例：
秋田県生まれ：毎年 8% の確率で「東京への就職機会」イベント
東京生まれ：上京イベント発生せず

【上京イベント時の効果】
- 給料 +20～30%（東京の高い給与水準）
- コミュ力 +5（大都市での人間関係構築）
- 生活費 +10%（東京の高い生活費）
- 結婚イベント確率 +3%（人口が多いため出会いが増える）
```

---

## 4. ゲーム起動時の初期化フロー

```
ゲーム開始
  ↓
誕生都道府県をランダム決定
  ↓
prefectures.json から該当都道府県のデータを読み込み
  ↓
playerState.prefectureData = {
  進学難易度係数,
  就職難易度係数,
  上京イベント確率,
  経済水準,
  説明テキスト
}
  ↓
以後のイベント判定時に、playerState.prefectureData を参照
```

---

## 5. メッセージ例（都道府県別）

### 北海道生まれの場合
- 「地方の学校では、進学を目指す友達が少ない」（進学イベント減少）
- 「就職先の選択肢が限られている」（就職イベント難化）
- 「東京への就職が話題になる」（上京イベント増加）

### 東京都生まれの場合
- 「進学校が多く、周囲も進学志向」（進学イベント容易化）
- 「大企業が多く、就職機会が豊富」（就職イベント容易化）
- 「そもそも地方への転勤を考える必要がない」（上京イベント発生しない）

### 沖縄県生まれの場合
- 「island life。本島と離島で情報格差がある」
- 「観光業が中心なため、サービス業職が多い」
- 「本土への移住を考える人が多い」

---

## 6. 実装上の注意

### 6-1. データの信頼性
- 文部科学省「学校基本調査」の公開データを使用
- 各年度で更新される可能性があるため、モジュール化しておく
- ゲームのバージョン表記に「統計年度：20XX年度」を記載

### 6-2. 過度な現実反映を避ける
- 統計が100%ゲーム難易度に反映されるわけではない
- ランダム要素＆才能ステータスも大きく影響
- 「統計傾向を参考にしているが、個人差がある」というバランス

### 6-3. 時間経過による統計の変動
- 現在のゲーム内年号に応じて、統計データを補正する案
- 例：2030年ゲーム内なら、2030年度統計を参照（予測値）
- ただし複雑化するため、初版では最新統計で固定

---

## 7. 今後のデータ取得タスク

以下の統計を e-Stat または文部科学省から抽出し、JSON形式に変換：

- [ ] 都道府県別高校進学率（過去3年）
- [ ] 都道府県別大学進学率（過去3年）
- [ ] 都道府県別高卒就職率（過去3年）
- [ ] 都道府県別大卒就職率（過去3年）
- [ ] 都道府県別人口移動（東京への流入数）
- [ ] 各都道府県の平均給与（高卒 vs 大卒）
