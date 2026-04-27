# Arcagate "Industrial Yellow" デザイン言語仕様

> **出典**: ChatGPT が Arknights:Endfield UI 画像を分析・言語化、user 経由で 2026-04-28 投下。
> **採用判断**: batch-108 で Industrial Yellow theme overhaul として実装着手。
> **位置づけ**: 既存テーマ (Light / Dark / Endfield-builtin / Liquid Glass / Ubuntu Frosted) と並列の新規 builtin theme。

## キャラクター（ひとことで）

> **黒い工業空間に、白い技術資料と黄色い警告ラベルを重ねた工業端末型ランチャー UI。**

「青シアン発光端末」ではなく **「Industrial Yellow の技術資料 UI」**。

## カラー設計

主役は **蛍光イエロー（FFE600 系）**、アンバーではない。

```css
--ag-primary: #ffe600;       /* メインアクセント（蛍光イエロー） */
--ag-primary-deep: #c8b800;
--ag-bg: #050605;            /* 黒地 */
--ag-bg-2: #0B0C0A;
--ag-panel-dark: #171816;
--ag-panel-2a: #1A1A18;
--ag-panel-2b: #2A2A27;

--ag-panel-white: #f1f1eb;
--ag-paper: #F2F2ED;
--ag-paper-2: #E4E4DC;

--ag-text-on-paper: #111111;
--ag-text-on-dark: #F2F2F0;

--ag-mute-1: #7C7C78;
--ag-mute-2: #A8A8A0;

--ag-accent-cyan: #00C8FF;     /* ごく少量 */
--ag-accent-magenta: #FF2DE2;  /* ごく少量 */
--ag-accent-orange: #FF7A00;   /* オレンジマーカー（通知・注目）*/
```

## 中核モチーフ

### 1. ハーフトーン / ドットフェード（最重要）

```css
.endfield-yellow-halftone {
  background: radial-gradient(circle, rgba(0,0,0,.22) 1px, transparent 1.2px), #ffe600;
  background-size: 7px 7px;
}
.endfield-paper-dots {
  background: radial-gradient(circle, rgba(0,0,0,.10) 1px, transparent 1.2px), #efefea;
  background-size: 8px 8px;
}
.endfield-dot-fade {
  background-image: radial-gradient(circle, rgba(255,230,0,.45) 1px, transparent 1.2px);
  background-size: 9px 9px;
  -webkit-mask-image: radial-gradient(circle at bottom right, black 0%, rgba(0,0,0,.75) 32%, rgba(0,0,0,.25) 58%, transparent 78%);
  mask-image: radial-gradient(circle at bottom right, black 0%, rgba(0,0,0,.75) 32%, rgba(0,0,0,.25) 58%, transparent 78%);
}
```

### 2. 斜線ハッチ

```css
.endfield-hatch {
  background-image: repeating-linear-gradient(-45deg, rgba(0,0,0,.16) 0 1px, transparent 1px 5px);
}
```

### 3. 等高線（補助）

背景レイヤーとして薄く敷く。テーマ背景・ホーム円形ハブ背景・サイドパネル奥に限定。

### 4. ラジアル / 円形 UI

ホーム画面・テーマ選択画面で限定的に使う。

### 5. ピル型物理ボタン

```css
.endfield-pill-button {
  height: 44px; min-width: 180px; border-radius: 999px;
  border: 2px solid rgba(20,20,20,.7);
  background: linear-gradient(90deg, rgba(0,0,0,.25), transparent 35%, rgba(0,0,0,.2)), #ffe600;
  color: #111;
  box-shadow: 0 3px 0 rgba(0,0,0,.42), inset 0 0 0 2px rgba(255,255,255,.55);
}
```

中央に細いライン、右端に丸アイコン、厚めの影。フラットボタンではなく工業機械の押しボタン。

### 6. L 字ブラケット（選択枠）

四隅に L 字。選択中フォーカス表示。

### 7. オレンジ菱形マーカー

通知・注目点。更新あり・未読・ルール違反・要注意に。

## レイアウト・構図

- 直線グリッドではなく、円・斜め・浮遊カード
- メインメニュー：大きな円形ハブ + 弧を描くメニュー + 傾いたカード
- イベント一覧：左に縦リスト + 中央に横スクロールカード群（選択中以外グレーアウト）
- クエスト画面：白い書類パネル + 黒い進捗バー + 黄色進捗線
- 背景：薄いノイズ + 巨大図形 + 等高線 + ぼかし + ビネット

## 禁忌

1. シアン主役（補助だけ OK）
2. 黒パネルだらけ（白パネル併用必須）
3. 等高線を主役（背景補助のみ）
4. 完全角丸（角少し丸い工業カードまで）
5. 全部綺麗な矩形グリッド（少し斜め・浮遊感が欲しい）
6. 単色フラット背景（薄いノイズ・図形・ビネット）
7. アンバー（金色っぽい黄）にしない

## UI 要素別

| 要素           | 役割                         | Arcagate 用途                  |
| -------------- | ---------------------------- | ------------------------------ |
| 蛍光イエロー   | 工業サイン・選択・警告・導線 | 実行ボタン・選択中・重要通知   |
| 白パネル       | 技術資料・管理票・カード     | 設定・詳細ペイン・一覧カード   |
| 黒背景         | 深い作業空間・機械室         | AppShell 背景                  |
| ドットフェード | 印刷網点・情報密度           | パネル角・ヘッダー・テーマ背景 |
| 斜線ハッチ     | 工業ラベル・警戒帯           | ヘッダー・フッター・カード背景 |
| 等高線         | 地形・探索・測量             | 背景補助・ワークスペース背景   |
| ラジアル円     | レーダー・ハブ               | ホーム・ワークスペース選択     |
| オレンジ菱形   | 通知・注目                   | 通知バッジ                     |
| L 字ブラケット | ターゲット・選択枠           | 選択中カード・フォーカス       |
| モノクロ背景   | 世界観・奥行き               | ダッシュボード背景             |

## テーマ名候補

**Industrial Yellow**（最有力） / AIC Terminal / Endfield Industrial / Anchor Yellow / Surveyor / Topo Signal / Blacksite Yellow / Operator Board

## 画面別翻訳

### メインメニュー

大きな円形レーダーを中心に、左右へ傾いた操作カードが配置される。黒い空間に白いカード群が浮き、選択や主要導線だけが蛍光イエローで強調される。地図・測量・工場管理を連想させる等高線と細罫線が背景に敷かれている。

### イベント一覧

左側に縦型のカードリスト。選択中は白枠と黄色ラインで強調。中央は横スクロールの報酬カード群で、選択中カードだけが明瞭、他は灰色のベールで沈む。上部に太い黄色帯。

### クエスト画面

白い書類パネルに黒い進捗バーと黄色い進捗線。背景はモノクロの巨大空間。黄色は進行中・選択中・注目に限定。

### プロフィール

暗い背景にモノクロの風景画像。左にプロフィール情報・数値・進捗。黄色の短いラインと数値が視線誘導。UI は画面全体を覆わず、空間と情報が重なる。

### テーマ変更

左にテーマサムネイル、中央に大きなプレビューカード。背景は薄い等高線とドット。選択中テーマは黄色縦ラインと白枠。下部にカプセル型確定/キャンセルボタン。

## 適用優先順位

1. トークン定義（`--ag-*` CSS 変数追加、Tailwind config）
2. ハーフトーン・ハッチ utility
3. ピル型ボタン（既存 Button variant に "industrial" 追加）
4. L 字ブラケット選択 + オレンジ菱形マーカー
5. 白い技術資料パネル（既存 Card 系拡張）
6. 背景レイヤー（等高線 + ドットフェード）
7. ホーム画面リデザイン（ラジアル + 傾いたカード）
8. テーマ切替で既存と Industrial Yellow を選択可能に

## batch-108 plan マッピング

| Plan ID | スコープ                                                                                           | 仕様セクション               |
| ------- | -------------------------------------------------------------------------------------------------- | ---------------------------- |
| PH-486  | Token 定義 (`--ag-primary` 蛍光イエロー / 黒地 / 白パネル / accent orange、既存 token system 拡張) | カラー設計                   |
| PH-487  | Halftone / dot-fade / hatch utility (CSS layer or Tailwind plugin)                                 | 中核モチーフ §1, §2          |
| PH-488  | Pill button + L-bracket + orange diamond marker components                                         | 中核モチーフ §5, §6, §7      |
| PH-489  | White industrial paper panel components (既存 Card 系拡張)                                         | UI 要素別「白パネル」        |
| PH-490  | 背景レイヤー (薄い等高線 + dot fade、AppShell 適用)                                                | 中核モチーフ §3 + レイアウト |
| PH-491  | ホーム画面リデザイン (ラジアル + 傾いた card)                                                      | 画面別翻訳「メインメニュー」 |
| PH-492  | 既存 theme と切替可能に (Settings の「テーマ」section 拡張)                                        | 適用優先順位 §8              |
| PH-493  | 既存全 widget / panel に Industrial Yellow 適用 (横展開)                                           | 全画面・横展開               |
