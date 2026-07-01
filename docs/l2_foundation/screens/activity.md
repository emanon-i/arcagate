# Activity (活動インサイト)

活動ログを一目で読み、 後から path 経由で振り返る画面。 Library / Workspace と並ぶ **第 3 の主要画面** (V2)。 「今日どこに時間が行ったか / どのファイルを触ったか」 を 3 秒で答え、 データを CSV / JSON / 期間サマリ Markdown で外部へ抜き出す。

route: `src/routes/+page.svelte` の `activeView === 'activity'` 分岐 (新設)
画面本体: `src/lib/components/arcagate/activity/` (新設)

---

## IA (情報設計) — 視覚より先に確定する

写経・見た目先行を避け、 目的 → 主役 → 優先度を先に固めてから視覚を導出する:

- **目的**: (1) 毎日眺めて「今日の使い方」 を掴む (2) 後から「あの日/先月 何をしていたか」 を path 経由で調べる
- **主役**: 固定トップサマリ帯 (スクロール前に即答する 1 帯)
- **優先度・レイアウト順**: 上から **即答 → 探索 → 行動** の層順を固定する (3 秒到達を構造で担保)

---

## 何があるか

上から下へ 即答 → 探索 → 行動 の順:

| 要素                             | 層   | 内容                                                                                           |
| -------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| (1) 固定トップサマリ帯           | 即答 | 総アクティブ時間 / 最大カテゴリ / 最長アプリ / **ファイル操作件数** / 昨日比 / 現在状態        |
| (2) タイムライン (セッション帯)  | 探索 | 1 日をセッション帯で描画 (点列でなく連続帯)。 主カテゴリ色 + 主アプリ                          |
| (3) 日次/週次内訳 + インサイト文 | 探索 | カテゴリ別 (tag 由来) / アプリ別ランキング。 各グラフ脇に短文インサイト (比較=昨日/先週同曜日) |
| (4) **ファイル活動パネル**       | 探索 | V2 差別化。 よく触った path / フォルダ別件数 / 拡張子分布 / 直近の作成・編集・削除・リネーム   |
| (5) 週次レビューカード           | 行動 | 未登録アプリの推薦「今週の候補 3 件」 (利用時間 / 想定 tag / ワンクリック登録)                 |
| (6) リソース原因候補ビュー       | 探索 | 「重かった時間帯」 の逆引き (第 2 段 / optional)                                               |
| (7) データ品質メーター + export  | 行動 | 右上に品質 (High / Partial) 常設。 export ボタン (Markdown サマリ / CSV / JSON)                |

実装場所 (新設):

- `src/routes/+page.svelte` — `activeView` 分岐に `'activity'` を追加
- `src/lib/components/arcagate/activity/ActivityLayout.svelte` — 画面本体
- `src/lib/components/arcagate/activity/` 配下に サマリ帯 / タイムライン / ファイル活動 / レビューカード の各 component

---

## 機能

### (1) 固定トップサマリ帯

- スクロール不要・画面最上部に固定。 グラフ探索の前に「今日どこに時間が行ったか」 を 1 帯で即答
- 表示: 総アクティブ時間 (AFK 除外) / 最大カテゴリ / 最長アプリ / **ファイル操作件数** / 昨日比 (+/-) / いまの状態 (Active / AFK / Media)
- この帯が「主要インサイトに 3 秒以内到達」 を UI 構造として保証する

### (2) タイムライン

- `sessionized_activity` ([Activity Store](../features/backend/activity-store.md)) のセッション帯で 1 日を描く。 点データより帯データの方が再構成が速い
- 5〜30 分単位の連続帯、 各帯は主カテゴリ色 + 主アプリ名

### (3) 日次/週次内訳 + 自動インサイト文

- カテゴリ別 (tag 由来) チャート、 アプリ別ランキング
- 各グラフ脇に **短文インサイトを常設** (user がグラフ解釈を自力でしなくて済む)。 比較基準は「昨日」 と「先週同曜日」 に標準化。 例: 「開発カテゴリが先週同曜日比 +1h20m」
- カテゴリ (tag) の分類ルールは [Activity CLI](../features/backend/activity-cli.md) の `activity tag` コマンドで管理する。 画面はその結果を可視化するだけで、 分類 UI や AI をアプリ内に持たない (分類はコマンドベース・冪等・外部 AI 駆動)

### (4) ファイル活動パネル (V2 の差別化)

- よく触った path / フォルダ別件数 / 拡張子分布 / 直近の作成・編集・削除・リネームを path 単位で表示
- **AI 生成物・Git 外変更も見える** — 「Git を補完する活動記録」 (REQ-20260702-002)。 「このフォルダで画像が増えた」「この path をこの日書き換えた」 を後から引ける
- source (usn / rdcw) を併記し、 取得経路を透明化

### (5) 週次レビューカード

- 未登録アプリのレコメンドを即時ポップアップでなく、 画面上部に「今週の候補 3 件」 カードで常設
- 各候補: 利用時間 / 想定 tag (周辺 match の tag から推定) / ワンクリック登録 → Library が実利用に追従して育つ

### (6) データ品質メーター + 低信頼マッチ修正

- 右上に `データ品質: High / Partial` を常設。 UIA/SMTC 取得失敗で「不明」 が増えた時、 理由 + 修正アクション (再権限確認 / 除外設定) を開示 (静かな劣化をさせない)
- item 照合の `confidence: low` の活動は「未分類 / 低信頼」 として可視化し、 その場で正しい item / tag に直す導線

### (7) export

- 画面から期間 + filter を選び、 **CSV / JSON / 期間サマリ Markdown / 生** で書き出す ([Activity CLI](../features/backend/activity-cli.md) と同じ経路・format)
- Markdown サマリは **デフォルトテンプレート**で出し、 カスタムテンプレートを選んでいればそれで出す。 出力先は user の任意 (Obsidian vault はその一例)
- 期間サマリ Markdown は月次振り返りにそのまま貼れる形にする

---

## ウィンドウバー中央の 3 択トグル (2 択 → 3 択への変更仕様)

### 現状 (実装確認済み)

`src/routes/+page.svelte` の `centerSlot` (≈L609-626) に **TitleTab が 2 個**:

| 現状の選択肢 | icon (lucide)     | activeView 値 |
| ------------ | ----------------- | ------------- |
| Library      | `Archive`         | `'library'`   |
| Workspace    | `LayoutDashboard` | `'workspace'` |

`activeView` は `$state`、 localStorage `arcagate.app.activeView` に永続 (既定 `'library'`)。 切替は各 TitleTab の `onclick` で `activeView` を直接更新し、 対応 Layout を条件 render。

### 変更仕様

中央を **Library / Workspace / Activity の 3 択**にする。 V2 の Activity 画面が Library・Workspace と同格の主要画面になるため、 画面切替の 1 級市民に昇格する:

| セグメント   | icon (lucide)     | activeView 値 | 内容                      |
| ------------ | ----------------- | ------------- | ------------------------- |
| Library      | `Archive`         | `'library'`   | アイテム管理 (現行)       |
| WorkSpace    | `LayoutDashboard` | `'workspace'` | widget canvas (現行)      |
| **Activity** | `Activity`        | `'activity'`  | **活動インサイト (新規)** |

- `ActiveView` type を `'library' | 'workspace' | 'activity'` に拡張し、 `ActivityLayout` を条件 render に足す
- localStorage 既定は `'library'` 維持 (起動時に活動画面を主役にしない)

### 連結セグメントコントロールで実装する

中央 3 択は **1 つの枠に連結したセグメントコントロール `[Library | WorkSpace | Activity]`** で表す。 現行の独立 TitleTab 2 個 (`+page.svelte` の `centerSlot`) はこのセグメントに置き換える。 今開いている画面が active セグメントとしてハイライトされる、 一般的な排他トグルの見た目にする。

- 新規 component `src/lib/components/arcagate/common/ViewSegmentedControl.svelte` を追加する。 3 セグメントを 1 枠に連結し、 セグメント間に境界線・余白の隙間を作らない (独立ボタンの並びに見せない)
- `active` セグメントは `--ag-accent` 系の塗り + `--ag-accent-text`、 非 active は `--ag-text-secondary`。 枠は `--ag-surface-1` + `--ag-border`、 角丸は `--ag-radius-button`。 色は token 経由 (hardcode 禁止)
- 各セグメントは `role="tab"` 相当の a11y を持ち、 keyboard (Tab 到達 + 左右矢印で移動 + Enter/Space で選択) で操作できる。 現行 TitleTab が持っていた `data-tour` (`library` / `workspace` / `activity`) を各セグメントへ引き継ぐ
- クリックで `activeView` を直接更新し、 対応 Layout を条件 render する (状態の持ち方は現行踏襲、 見た目のみ連結セグメント化)

### スペーシング / 質感

- 中央 3 択の間隔は現行の `gap-2` (Tailwind) を踏襲。 独自 px を足さない (design-system は Tailwind `space-*` + `--ag-card-*` に委譲、 8pt grid の独自定義は無い)
- 画面本体のカード/パネル間は `--ag-card-gap` (1rem) を基準に、 パネルは `.ag-glass` (glass 既定質感) を使う

---

## こうあってほしい (L0 / product direction 抜粋)

- **毎日眺めたくなる** (daily-use-test)。 「今日どこに時間が行ったか」 に 3 秒で到達
- **見やすさが北極星** — 追跡項目の数でなく可視化の質で ActivityWatch を超える (「データは持っているのに読めない」 を潰す)
- **後から調べられる** が優先 — リアルタイムで見れなくても、 後から path 経由で遡れる
- glass 質感の中で表現、 色は theme accent 追従 (color hardcode 禁止)

---

## 関連 IPC

| command / event                | 用途                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `get_activity_summary`         | 期間指定でサマリ帯 / 内訳を取得                                                      |
| `get_activity_timeline`        | セッション帯 (`sessionized_activity`) を取得                                         |
| `get_file_activity`            | ファイル活動パネル (path / フォルダ別 / 拡張子分布)                                  |
| `get_activity_recommendations` | 週次レビューカードの未登録候補                                                       |
| `export_activity`              | Markdown サマリ / CSV / JSON / raw で書き出し (テンプレート指定可)                   |
| `set_activity_optin`           | opt-in ON/OFF、 収集開始/停止 ([Recorder](../features/backend/activity-recorder.md)) |
| event `activity://updated`     | 新規データ到着で画面をライブ更新 (二次)                                              |

---

## 制約 / Non-goals

- **リアルタイム更新は二次** — ライブ tick より「後から調べられる」 蓄積を優先
- **エンタープライズ observability をやらない** — アラート / 閾値通知 / 異常検知 / 分散トレーシングは載せない (Datadog 沼回避)
- **収集の opt-in が OFF の時は空状態** — 「まだ記録していない」 EmptyState を出し、 opt-in と「30 秒テスト記録」 へ誘導
- **画面から任意実行しない** — 活動ログの path は記録であって起動指示ではない ([権限分離](../features/cross-cutting/activity-privilege-separation.md))
- i18n ja / en 同時実装 (PQ-700 parity)、 craft/a11y 基準 (PQ-300) 準拠
