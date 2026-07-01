---
id: PH-V2-600
status: planning
batch: v2-activity
type: 新機能
era: Post-v1 (v2)
parent: README.md
---

# PH-V2-600: Activity 画面 + ViewSegmentedControl

## 目的

収集・照合したデータを「毎日眺めたくなる」glanceable UI に載せる。Library / Workspace と並ぶ第 3 の
主要画面「Activity」を新設し、ウィンドウバー中央の画面切替を 2 択 → **3 択連結セグメント**に拡張する
(REQ-20260702-005)。北極星は追跡項目の数でなく **可視化の質** — 「今日どこに時間が行ったか」に 3 秒で
到達する。IA (目的 → 主役 → 優先度) を視覚より先に固める。

## スコープ

### やること

- **route / screen 追加** (既存画面システムに乗せる、新パラダイム不要)。実装場所・IA・要素構成の正本は
  [`screens/activity.md`](../../l2_foundation/screens/activity.md):
  `+page.svelte` の `activeView === 'activity'` 分岐 / `src/lib/components/arcagate/activity/`
- **上から 即答 → 探索 → 行動 の層順を固定** (3 秒到達を構造で担保):
  - (1) 固定トップサマリ帯 (最上部固定・スクロール不要): 総アクティブ時間 / 最大カテゴリ / 最長アプリ /
    **ファイル操作件数** / 昨日比 / 現在状態
  - (2) タイムライン: `sessionized_activity` のセッション帯で 1 日を描く (点列でなく連続帯)
  - (3) 日次/週次内訳 + **自動インサイト文** (各グラフ脇に常設、比較基準 = 昨日 / 先週同曜日)
  - (4) **ファイル活動パネル (V2 差別化)**: よく触った path / フォルダ別件数 / 拡張子分布 / 直近の
    作成・編集・削除・リネーム。source (usn/rdcw) 併記で取得経路を透明化
  - (5) 週次レビューカード: 未登録アプリ推薦「今週の候補 3 件」(利用時間 / 想定 tag / ワンクリック登録)
  - (6) データ品質メーター (右上常設・High/Partial) + **低信頼マッチ修正導線** (`confidence: low` を
    「未分類 / 低信頼」として可視化。修正は**その活動の item 紐付け訂正 / 既存 item への tag 付与**に限る。
    `activity_category_rule` の CRUD は画面に置かず CLI (500) に集約する — 画面から分類ルールを編集させない)
  - (7) export (期間 + filter → CSV/JSON/Markdown サマリ/**raw**、500 と同じ経路・format・テンプレート。
    raw は retention 窓内の生イベントで完全 backup でない旨を UI に明記)
- **ViewSegmentedControl (新規 component)**: `src/lib/components/arcagate/common/ViewSegmentedControl.svelte`。
  現行の独立 TitleTab 2 個 (`+page.svelte` centerSlot) を **1 枠に連結した `[Library | WorkSpace | Activity]`**
  に置き換える。セグメント間に境界線・余白の隙間を作らない (独立ボタンに見せない)。`ActiveView` type を
  `'library' | 'workspace' | 'activity'` に拡張、localStorage 既定は `'library'` 維持
- **色は token 経由 (hardcode 禁止)**: active = `--ag-accent` 系塗り + `--ag-accent-text`、非 active =
  `--ag-text-secondary`、枠 = `--ag-surface-1` + `--ag-border`、角丸 = `--ag-radius-button`。パネルは
  `.ag-glass`、カード間は `--ag-card-gap`
- **a11y**: 各セグメントは `role="tab"` 相当、keyboard (Tab 到達 + 左右矢印移動 + Enter/Space 選択)。
  現行 TitleTab の `data-tour` (library/workspace/activity) を各セグメントへ引き継ぐ
- **EmptyState**: opt-in OFF 時は「まだ記録していない」EmptyState を出し、opt-in と「30 秒テスト記録」
  (700) へ誘導。craft/a11y は PQ-300 基準準拠 (EmptyState / LoadingState / ErrorState / 余白 / WCAG 2.2 AA)

### やらないこと

- **分類 UI / AI をアプリ内に持たない** — 画面は分類結果を可視化するだけ。分類ルールは CLI (500) で管理
- **リアルタイム更新を主にしない** — ライブ tick より「後から調べられる」蓄積を優先 (`activity://updated` は二次)
- **エンタープライズ observability をやらない** — アラート / 閾値通知 / 異常検知 / 分散トレーシング (Datadog 沼回避)
- **画面から任意実行しない** — 活動ログの path は記録であって起動指示ではない (権限分離)
- 原因候補ビュー (リソース逆引き) は第 2 段 (800)。本フェーズでは (6) 品質メーターまで

## 依存

- 先行: PH-V2-050 (取得方式確定・ゲート) / PH-V2-100〜500 (サマリ / タイムライン / ファイル活動 / 推薦 / export のデータ経路)
- 関連 IPC (正本 screens/activity.md): `get_activity_summary` / `get_activity_timeline` / `get_file_activity` /
  `get_activity_recommendations` / `export_activity` / `set_activity_optin` / event `activity://updated`
- 後続: 700 (opt-in / 品質メーターの検証を集約) / 800 (原因候補ビューを画面に追加)

## 受け入れ条件 (機械検出)

- [ ] Activity が新トップレベル screen として追加、`ActiveView` が 3 値に拡張、`ActivityLayout` が条件 render。
      localStorage 既定 `'library'` 維持
- [ ] ViewSegmentedControl が `[Library | WorkSpace | Activity]` を 1 枠連結で描画、セグメント間に隙間なし。
      現行 TitleTab 2 個を置換しても Library / Workspace の既存遷移・hotkey が壊れない
- [ ] active/非 active/枠/角丸が全て token 経由 (`scripts/audit-design-tokens.sh` 0 violations)
- [ ] keyboard: Tab 到達 + 左右矢印移動 + Enter/Space 選択が動作、`data-tour` が各セグメントへ引き継がれる。
      `@axe-core/playwright` で Activity 画面が axe pass (PQ-300 基準)
- [ ] (1) 固定トップサマリ帯が最上部に常設、スクロールなしで 6 要素 (総アクティブ時間 / 最大カテゴリ /
      最長アプリ / ファイル操作件数 / 昨日比 / 現在状態) を表示。**above-fold を機械検証**: 既定 viewport で
      サマリ帯が初期スクロール位置内に収まる (bounding box が viewport 高さ内) を e2e assertion で確認
- [ ] (2) タイムラインが `sessionized_activity` のセッション帯で描画される
- [ ] (3) 日次/週次グラフ脇に自動インサイト文が常設 (比較基準 = 昨日 / 先週同曜日)
- [ ] (4) ファイル活動パネルが path / フォルダ別件数 / 拡張子分布 / 直近 4 種変更を表示、source を併記
- [ ] (5) 週次レビューカードが「今週の候補 3 件」を常設、各候補からワンクリックで item 登録できる
- [ ] (6) データ品質メーター (High/Partial) が右上常設、`confidence: low` が「未分類 / 低信頼」として
      可視化され、その場で item 紐付け訂正 / tag 付与ができる。画面に `activity_category_rule` CRUD が無い
      (分類ルール編集は CLI のみ) ことを確認
- [ ] (7) export が 500 と同じ経路・format で CSV/JSON/Markdown サマリ/raw を出す (raw は完全 backup でない旨を明記)
- [ ] opt-in OFF 時に EmptyState (「30 秒テスト記録」導線) を出す
- [ ] i18n ja/en 同時 (PQ-700 parity。en value が ja と別文言であることを i18n audit で確認)

### 実機目視ゲート (機械検出とは別立て・定性判定)

機械検出だけでは「見やすさ」を保証できないため、以下は実機目視で判定する (`dom-not-fixed`)。上の
above-fold assertion / axe / token audit を通過した上に載せる最終ゲート:

- [ ] 主要インサイトに 3 秒以内到達 (固定サマリ帯だけで「今日の使い方」を説明できる)
- [ ] fresh-eye『読める』判定 pass — 初見の目で「何の画面か / 何が分かるか」が説明なしで伝わる
- [ ] 判定は agent dev の実機 screenshot を Read で読み返して記録 (DOM 存在で治った判定にしない)

## 検証方針

- agent dev (CDP attach + `WEBVIEW2_USER_DATA_FOLDER` 隔離) で実 data scale の seed を入れ、実機 screenshot を
  Read で目視評価 (`dom-not-fixed` / `feedback_self_verification`)。DOM 存在で治った判定にしない
- 3 秒到達・fresh-eye 判定は初見の目で「何の画面か / 何が分かるか」が説明なしで伝わるかで判定
- axe / keyboard は e2e で自動化、token は audit script で機械検出

## リスク

- **写経・見た目先行**: IA を飛ばすと「読めるが意味が薄い」画面になる → 目的 → 主役 → 優先度を先に固定
  (screens/activity.md の IA 節)
- **セグメント置換の回帰**: TitleTab 置換で既存遷移 / data-tour / hotkey が壊れる → 横展開で既存経路を確認
- **色 hardcode 混入**: 新規 component で token を外れる → audit-design-tokens を受け入れ条件に固定
- **項目過積載**: 見やすさより項目数を優先すると ActivityWatch の轍 → 「3 秒到達に寄与するか」で取捨

## 横展開

- ViewSegmentedControl 置換で Library / Workspace の既存遷移・hotkey・`data-tour` が壊れないこと
- 新画面は既存 screen / route システムに乗せる (新パラダイム追加なし)
- craft/a11y は全画面共通の PQ-300 基準を Activity 画面に適用 (EmptyState / LoadingState / ErrorState)
- export UI は 500 の CLI export と service 経路を共有 (二重実装しない)
- i18n: 追跡カテゴリ・画面文言を ja/en 同時 release (`do-it-now-philosophy`、ja 先行 merge 禁止)

## 参照

- 正本: [`screens/activity.md`](../../l2_foundation/screens/activity.md) (IA / 要素 / セグメント仕様 / IPC / Non-goals)
- 要件: [`vision.md`](../../l1_requirements/vision.md) REQ-20260702-005 (3 択トグル / 3 秒到達)
- frontend 固定枠: [`.claude/rules/frontend.md`](../../../.claude/rules/frontend.md) (color token 必須 / scaffold)
- design token: [`design-tokens.md`](../../l2_foundation/features/cross-cutting/design-tokens.md)
- craft/a11y 基準: [`PH-PQ-300`](../paid-quality/PH-PQ-300_craft-sweep.md) / i18n parity: [`PH-PQ-700`](../paid-quality/PH-PQ-700_i18n-and-global.md)
- 現行 centerSlot: `src/routes/+page.svelte` (TitleTab 2 個 → セグメント置換)
