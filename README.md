# まなびライフ

小学5〜6年生向けのキャリア教育ゲーム。日本のどこかに生まれた1人の人生を、統計にもとづいて0歳から最期まで体験するテキストアドベンチャー（1プレイ等速で12〜15分）。

制作：K.nomura

## フォルダ構成

| 場所 | 中身 |
|---|---|
| `docs/00-overview.md` | 全体の仕様まとめ |
| `docs/01〜08` | 初期の仕様メモ（※09 と食い違う部分は **09 が優先**） |
| `docs/09-engine-state-flags.md` | **エンジン・ステータス・フラグ・不変条件の正式仕様** |
| `docs/10-event-catalog.md` | イベント一覧（`node tools/catalog.js` で自動生成） |
| `docs/ui/` | UI案の画像 |
| `data/flags.json` | 使ってよいフラグ・在籍段階・雇用形態・変数の辞書 |
| `data/prefectures.json` | 47都道府県（人口・大学進学率・賃金係数・地域区分） |
| `data/schools.json` | 学校テンプレート（未就学〜大学院・専門・留学） |
| `data/jobs.json` | 職業67種・雇用形態・バイト |
| `data/clubs.json` | 習い事・中高の部活・大学サークル |
| `data/events_mandatory.json` | 必須イベント |
| `data/events_random.json` | ランダム選択肢イベント＋病気などの年齢別確率＋資格一覧 |
| `data/events_flow.json` | 流れるだけイベント（才能のヒント・家族の出来事など） |
| `tools/validate.js` | データの整合性チェック |

## 動かす・ビルドする

```
node tools/build.js        # data を src/js/data.gen.js にまとめる → src/index.html をブラウザで開く
node tools/build.js dist   # 1つのHTMLに（dist/index.html と play/index.html）
node tools/sim.js 300      # 画面なしで300人分の人生を流して統計とエラーを見る
```

## データを直したら

```
node tools/validate.js   # フラグのつづり・参照切れ・不変条件（孫は子がいないと生まれない等）をチェック
node tools/catalog.js    # イベント一覧を作り直す
```

`validate.js` が「✓ エラーなし」になるまで直してからコミットしてください。

## 最終成果物

開発の最後に、`data/` をすべて埋め込んだ**単一のHTMLファイル**を出力する（学校の端末にファイルで持ち込めるように）。
