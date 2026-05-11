# UX 標準 Part 4 — §7-12 Do/Don't / チェックリスト / レイアウト

[ux-standards.md](./ux-standards.md) の §7-12。

## 7. Do / Don't リスト

### ✅ Do

- CSS カスタムプロパティ（`--ag-*`）を経由して色・スペーシング・モーションを指定する
- トランジションには必ず `motion-reduce:transition-none` を付与する
- focus-visible リングを全インタラクティブ要素に確保する
- hover/focus/active/disabled の 4 状態を必ず定義する
- ダイアログ・パネルに必ず `Esc` で閉じる機能を付ける
- アイコンのみのボタンに `aria-label` を付ける
- 空状態に「何もない」理由と次の操作を示すテキストを置く

### ❌ Don't

- コンポーネントに色コードをハードコードする（`#ffffff`、`rgba(...)` を直書き）
- Tailwind の `duration-100` / `duration-150` 等をそのまま使う（CSS 変数を使う）
- `opacity-0` だけで「非表示」を実装する（`display: none` または `visibility: hidden` を使う）
- `disabled` 状態の視覚差分なしで実装する
- フォーカスリングを削除する（`outline: none` + 代替なし）
- コントラスト比 4.5:1 未満のテキストを使う
- `text-faint` を 12px 以下で使う
- 常時アニメーション・常時光るエフェクトを追加する（CPU 使用率・疲労感）
- `prefers-reduced-motion` を無視する

---

## 8. バッチ受け入れチェックリスト

各バッチ PR のレビュー前に以下を確認すること。
**1 つでも ✗ なら PR マージ禁止**（品質基準として機能させる）。

### 必須チェック

| # | チェック項目                                                  | 確認方法                                   |
| - | ------------------------------------------------------------- | ------------------------------------------ |
| 1 | CSS トークン直書き禁止（新規 `#hex` / `rgba()` なし）         | `git diff` で色コードを目視確認            |
| 2 | `prefers-reduced-motion` 対応済み                             | `motion-reduce:transition-none` の存在確認 |
| 3 | focus ring 可視（`focus-visible:ring-*` or `:focus-visible`） | キーボードで Tab 移動して確認              |
| 4 | キーボード操作可（主要フローが Tab + Enter + Esc で完結）     | キーボードのみで操作してみる               |
| 5 | hover/focus/active/disabled 全状態定義済み                    | コードレビューまたは目視確認               |
| 6 | コントラスト比 ≥ 4.5:1（本文テキスト）                        | DevTools の accessibility パネルで確認     |
| 7 | `pnpm verify` 全通過                                          | CI ログ確認                                |

### 推奨チェック（違反でも merge 可だが次バッチで修正）

| #  | チェック項目                           | 確認方法               |
| -- | -------------------------------------- | ---------------------- |
| 8  | Tailwind ハードコード duration なし    | `git diff` 目視        |
| 9  | アイコンのみボタンに `aria-label` あり | コードレビュー         |
| 10 | 空状態テキストあり（コンテンツゼロ時） | 手動操作でゼロ件を確認 |
| 11 | 破壊的操作に確認ダイアログあり         | 手動操作               |

---

## 9. テキスト truncate ルール

テキストが親コンテナを超える場合は以下のルールに従う。

| パターン | Tailwind クラス | 用途                                         |
| -------- | --------------- | -------------------------------------------- |
| 1行省略  | `truncate`      | ラベル・タイトル・パス表示（一般）           |
| 2行省略  | `line-clamp-2`  | カード説明文・メタ情報など複数行が必要な場合 |
| 6行省略  | `line-clamp-6`  | クイックノート・長文プレビュー               |

**原則:**

- 省略されたテキストには `title={value}` 属性を付けてホバーで全文表示
- `line-clamp-*` と `truncate` の混在禁止（親コンテナ単位で統一）
- 必要な場合は `break-all` を追加するが、原則は `break-words`

### 9-1. flex item の truncate 必須セット (PH-issue-016)

flex 配下で truncate を実効化するには **`flex-1` + `truncate` + `min-w-0`** の 3 点セットが必須。
default の `min-width: auto` が overflow を阻害するため、`min-w-0` 不在の truncate は機能しない。

機械検証: `scripts/audit-text-overflow.sh` (lefthook pre-commit + CI 統合)。
同一 class 文字列内で `flex-1` + `truncate` を持つ要素に `min-w-0` が無ければ violation。

## 10. スクロール・レイアウトルール

スクロール可能なコンテナには `[scrollbar-gutter:stable]` を付与し、スクロールバーとコンテンツの重なりを防ぐ。

### Workspace widget の横スクロール禁止 (PH-issue-012)

**`src/lib/widgets/` 配下の widget では `overflow-x-auto` / `overflow-x-scroll` 禁止**。
text は `truncate` / `line-clamp` で吸収する (横 scrollbar は noise、§9 truncate ルール参照)。
WidgetShell content area は `overflow-x-hidden overflow-y-auto` で確定。

機械検証: `scripts/audit-no-horizontal-scrollbar.sh` (lefthook pre-commit + CI 統合)。

例外: Workspace Canvas / Library グリッド等の大枠コンテナは scope 外 (横 pan/scroll は意図的)。

| コンポーネント           | 適用箇所                                        |
| ------------------------ | ----------------------------------------------- |
| `LibraryLayout.svelte`   | sidebar-wrapper / main-wrapper / detail-wrapper |
| `WorkspaceLayout.svelte` | ワークスペースコンテナ                          |
| `WidgetShell.svelte`     | content scroll-area (PH-issue-014)              |
| `SettingsPanel.svelte`   | 右ペイン content area (PH-issue-014)            |
| ウィジェット内リスト     | `overflow-y-auto` を持つコンテナすべて          |

### scrollbar-gutter 適用 scope (PH-issue-014)

**inner scroll container のみ**。root / header / 静的 panel には適用しない (旧 PH-489 の root 全 stable は密度低下を招いた、scope 限定)。

判定基準: `overflow-y-(auto|scroll)` を持つ要素にのみ `[scrollbar-gutter:stable]` を付与。それ以外には付けない。

---

## 11. アイテムカードサイズプリセット

Library のグリッド表示で使用するサイズプリセット。Settings > Library から変更可能。
**4:3 アスペクト比固定**、カード width のみが変動、gap は 16px 固定。

| サイズ | width | height (4:3) |
| ------ | ----- | ------------ |
| S      | 144px | 108px        |
| M      | 192px | 144px        |
| L      | 256px | 192px        |

- CSS 変数 `--ag-card-w-{s,m,l}` で定義、`--ag-card-gap = 1rem` 固定
- グリッド: `repeat(auto-fill, var(--ag-card-w))` + `justify-content: center`
- DB `config` の `item_size` キーで永続化、デフォルト `M`
- ウィジェット内リストのアイコンも S/M/L に追従

## 12. Library 操作 UX 規約 (batch-67)

### お気に入りボタン

- **アイコン + テキストラベル「お気に入り」**（"星" / "★" / "☆" は禁止）
- `<Star fill={isStarred ? 'currentColor' : 'none'} />` で塗り/枠の状態切替
- aria-label: 「お気に入りに追加」/「お気に入りを解除」（機能ベース）

### タグ追加 UI

- 「+ タグを追加」ボタンで明示
- ドロップダウン候補リストで選択、未割当タグのみ表示
- 矢印キー / Esc で操作可能

### 可視/不可視切替

- LibraryDetailPanel の「ライブラリで非表示」チェックボックス
- 説明 hint:「非表示にすると検索結果から除外されます。残したまま隠せます。」
- ON で `is_enabled = false`、LibraryCard が grayscale + 検索除外

### 左パネル 4 セクション

1. ライブラリ全体（すべて + お気に入り）
2. タイプ（exe / url / folder / script / command）
3. ワークスペース（sys-ws-* タグ）
4. ユーザータグ

各セクション間に `border-t` 罫線、`expanded` 時は uppercase 見出し。

### per-card 背景・文字 override

- DB `items.card_override_json` で per-card 上書き保存
- `null` = global default（`configStore.libraryCard`）
- LibraryCard で `JSON.parse + shallow merge` 適用
- LibraryDetailPanel に「グローバル設定に戻す」ボタン

### 背景なしモード時のアイコン rendering

- fill / image モード: `drop-shadow-lg` で立体感
- none モード: `drop-shadow-sm` 弱化 + サイズ +2 段階上げ（artMap 柔らかいグラデで edge ぼやけ防止）

### ラベル原則（全画面）

- ラベルはアイコン名ではなく機能 / 状態 / アクションを書く（CLAUDE.md / desktop_ui_ux_agent_rules.md P4 補足）
- 同じ機能には同じアイコン + 同じラベル（`src/lib/nav-items.ts` 経由）
- 1 つの不整合を見つけたら横展開で全画面チェック

#### 機械化（batch-74）

- `scripts/audit-labels.sh`: aria-label / 表示テキストに Lucide アイコン名（Star / Plus / Trash / Settings 等）や記号（★ ＋ × 等）が直書きされていないか grep 検出
- lefthook pre-commit: `label-audit` step で staged ファイルに対し実行、違反で commit 阻止
- CI: `Label audit (UX 一貫性)` step で全コードベースを検証、違反で PR fail
- セルフテスト: `scripts/test-audit-labels.sh` で fixture（pass / fail）を流して exit code を検証

### 起動経路と launch_log の整合 (Library overhaul L1)

- **Library に登録済アイテムは `launchItem(id)` 経由で起動**する。`cmd_open_path` で path 直起動すると launch_log に記録されず Recent / Frequent / 統計が壊れる
- ExeFolderWatchWidget / FileSearchWidget など path-based widget は **target で itemStore lookup → 見つかれば launchItem、未登録のみ cmd_open_path に fallback** が default pattern
- 新しい起動経路を作る時は「これは launch_log に乗せるべきか?」を必ず判定し、yes なら launchItem 経路、no なら cmd_open_path

### 一覧表示の metadata 取得は store batch 経由 (Library overhaul L1)

- LibraryCard 系 list で per-card $effect から個別 IPC 呼ばない (69+ 並列で UI 固まり)
- parent (LibraryMainArea / LibraryItemPicker) で `metadataStore.loadMetadataForItems(visibleIds)` を 1 回呼んで warm up、card は `metadataStore.getMetadata(id)` で synchronous read
- TTL 60s memory cache + mutation 時 `invalidate(id)` で整合維持
- 重い OS 呼び出し (PowerShell icon 抽出等) は `tauri::async_runtime::spawn_blocking` で main thread を逃がす

### widget 設定 dialog の 2 step 排除 (Library overhaul L1 / I2)

- widget 空状態 button click → 設定 dialog → 同じ button → ようやく picker、の 2 step UX は禁止
- 「アイテム紐付け」のような **空状態の主目的が 1 つだけの場合** は、widget が picker を直接マウントして 1 step で完結させる
- 設定 dialog は **>= 1 件のとき** の 2 次操作 (sort / view mode 切替 / 紐付け追加) 用に分離
