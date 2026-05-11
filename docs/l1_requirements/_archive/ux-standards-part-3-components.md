# UX 標準 Part 3 — §6 コンポーネント別「あるべき姿」

[ux-standards.md](./ux-standards.md) (Widget / Palette / Dialog / Button)。

## 6. コンポーネント別「あるべき姿」

### 6-1. Widget

**必須要素**:

- ヘッダ: ウィジェットタイプ名（アイコン + テキスト）
- 設定ボタン（⚙）: 各 widget 内 menu (kebab / WidgetShell `menuItems`) からアクセス
- コンテンツ: スクロール可能（overflow-auto）、高さ fill-available

**ヘッダ layout 仕様** (PH-issue-015、widget が狭くなっても title が icon に被らない):

- 親 `flex` container に `min-w-0 flex-1`
- icon wrapper に `shrink-0` (アイコン領域は固定幅)
- title `<div>` に `min-w-0 flex-1 truncate` (狭くなったら truncate)
- 右側 menu / settings button は `shrink-0`

**list-row layout 仕様** (Widget 内のリスト行 — ExeFolderWatch / FileSearch / Snippet 等):

- `<li>` / row container に `min-w-0`
- icon: `shrink-0` (固定 16px)
- name: `min-w-0 flex-1 truncate` (狭くなったら truncate、icon に被らない)
- suffix (count chip 等): `shrink-0`
- ネストする `<button>` (flex-1 の row 内クリック可能エリア) にも `min-w-0` を継承

**編集モード時の grid-level 操作 UI** (PH-issue-001 で確定、§13 に詳細):

- 編集モード ON で **selection** state を導入
- 非選択 widget: 通常表示、handle / ring 一切なし
- 選択 widget のみ:
  - selection ring: `ring-2 ring-[var(--ag-accent)]`
  - 上端 drag bar (Notion 風 floating chip)
  - 右上 × button (shadcn ghost-icon、hover で `bg-destructive`)
  - 8 方向 resize handles (corner chip + edge strip)
- Delete / Backspace キー: 選択 widget で削除確認 dialog (入力欄 focus 中は無効)

**状態**:

- 通常: `border-[var(--ag-border)]`
- 編集モード選択: `ring-2 ring-[var(--ag-accent)]`
- D&D ドラッグ中: `opacity-50 cursor-grabbing`

**禁止**:

- コンテンツ無しの白紙 Widget は空状態テキストを表示すること
- ヘッダなし（何の Widget か分からない状態）

**fluid sizing 仕様** (PH-issue-021、ClockWidget 等の単一表示 widget):

- 親 div に `@container` + `overflow-hidden` (scrollbar 抑止)
- font-size を container query で段階的に拡大: `text-xl @xs:text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl`
- 副次情報 (日付 / 曜日 等) は `hidden @xs:inline` で 1×1 では非表示にし、widget が広くなったら表示
- 1×1 (320×180px 想定) で scrollbar が出ないことが受け入れ条件

**config 変更時の派生 state 取り扱い** (PH-issue-017):

- `$effect` で config 派生の async 取得を行う場合、`effect` 開始時に派生 state (entries / results 等) を**即時 clear** する → 旧 path の結果が残らない
- 同時に `requestId` (単純なカウンタ or UUID) を発行し、async 結果を反映する前に「自分が最新 requestId か」を check (stale response 破棄)
- 検索 / scan widget は全てこのパターンに従う (ExeFolderWatch / FileSearch / 他)

**Item 参照 widget の cascade 仕様** (PH-issue-006):

- Item を参照する widget (Item / Favorites / Recent / Projects 等) は `widget.config` JSON に `item_id: string` または `item_ids: string[]` を保存
- Library で item 削除時、Rust 側 (`workspace_repository::cascade_remove_item_from_widgets`) が**全 widget config を scan して該当 ID を除去**
  - `item_id == X` なら field 削除
  - `item_ids` 配列なら filter で該当 ID 除去 (空配列も維持、UI 側で「item 無し」表示)
- 削除確認 dialog は `cmd_count_item_references(id)` で参照 widget 数を取得して表示 (P2 失敗前提、影響範囲を user に明示)
- orphan ID は DB に残さない (engineering-principles §3 データ整合性)

**グリッドセル base size 仕様** (PH-issue-004):

- BASE_W = 240px / BASE_H = 135px (16:9、zoom 100%)
- zoom 範囲 25〜200%: 25% で 60×34 / 50% で 120×68 / 200% で 480×270
- 1280×800 viewport で 5×5=25 セル表示可能 (旧 320×180 base では 4×4=16 セル)
- 実装: `src/lib/state/widget-zoom.svelte.ts` BASE_W / BASE_H 定数 + `src/lib/utils/zoom-math.ts` の純粋関数群
- ClockWidget 等の fluid sizing は container query で base 縮小に追従 (PH-issue-021)

**Zoom anchor 仕様** (post-redo3 #7、業界標準 Excalidraw / tldraw / Figma / Miro / Obsidian 準拠):

- **Wheel zoom** (Ctrl + wheel): mouse cursor を anchor (cursor 下の世界点が cursor 下に居続ける)
- **Reset zoom** (Ctrl+0 / toolbar button): viewport center を anchor、zoom のみ 100% に戻す
- **Fit to content** (Ctrl+Shift+1 / toolbar button): BB 重心 = origin を viewport visual center に置く
- **Button zoom** (将来): viewport center を anchor (Reset と同じ pattern)
- 計算式 (canonical formula): `T1 = Sm − (Sm − T0) × (z1 / z0)` (T = scroll、Sm = anchor、z = zoom)
- 実装: `src/lib/utils/zoom-math.ts` の `computeZoomAnchorScroll` / `computeFitZoom` / `computeFitScroll` 純粋関数 + `src/lib/utils/zoom-math.test.ts` + `src/lib/utils/zoom-math-anchor.test.ts` で 32 件 unit test
- clamp は `clampZoom()` 一箇所のみ (二重 clamp / 5 単位 round 撤廃で drift 解消、Q2 確定)
- scroll は `behavior: 'instant'` (smooth 撤廃で timing race 排除、Q4 確定)
- 初期 scroll (workspace 切替) も `computeFitScroll` で統一 (Q3 確定、旧 `computeInitialScroll` 独自計算撤廃)
- Settings 表示は raw integer (Math.round 済値、5 単位丸め撤廃で 73% 等を表示、Q5 確定)

**Watched folder unset 時の cascade 仕様** (PH-issue-023 Phase A + B):

- 監視フォルダ (`watched_paths`) を unset すると、その path 配下に登録された **tracked items** (auto_register 由来) を Library から自動削除
- 削除対象判定: `is_tracked = 1 AND (target = path OR target LIKE 'path/%' OR target LIKE 'path\\%')`
- 各 item 削除時に PH-issue-006 cascade が走り、widget config からも自動除去 (二段 cascade)
- 実装: `item_repository::find_tracked_ids_under_path` + `watched_path_service::remove_watched_path`

**per-item settings 永続化 + resurrect** (PH-issue-023 Phase B):

- 削除前に user 個別設定を `widget_item_settings` テーブルに snapshot 保存
- key = `item.target` (path) で stable、value = `settings_json` (default_app / is_enabled / label の JSON)
- 再 watch で同 path の item が auto_register された時、snapshot から自動復元 (resurrect)
- `last_seen_at` で古い設定の prune (将来別 plan で auto-prune cron)
- 実装: `widget_item_settings_repository` (get / upsert / touch_seen / prune_older_than) + 関連 service hook
- migration 019: `widget_item_settings (item_key TEXT PK, settings_json TEXT, last_seen_at TEXT)` + `idx_widget_item_settings_seen` index

### 6-2. Palette

**必須要素**:

- 検索バー: オートフォーカス、`/` キーでフォーカス
- 結果リスト: キーボードナビゲーション（↑↓ + Enter）
- クイックコンテキスト: 現在のタグ・モードを表示
- フッタ: ヒントバー（`Enter` 実行・`Esc` 閉じる）

**アニメーション**:

- 出現: `scale 0.98→1 + fade`, `--ag-duration-normal`
- 消去: `scale 1→0.97 + fade`, `--ag-duration-fast`

**禁止**:

- 結果が 0 件でも空白だけ表示（「結果なし」テキスト必須）
- キーボードで操作できない状態

### 6-3. Dialog

**必須要素**:

- タイトル（何のダイアログか）
- 閉じるボタン（× アイコン）+ `Esc` キー対応
- アクションボタン: 最低限 1 つ（primary action）+ キャンセル

**アニメーション**:

- 出現: `scale 0.96→1 + fade`, `--ag-duration-normal`
- Backdrop: `bg-black/50 backdrop-blur-sm`

**禁止**:

- Esc で閉じられないダイアログ
- 閉じる手段が 1 つしかないダイアログ

### 6-4. Button

**バリアント仕様**:

| バリアント  | 背景             | テキスト              | ボーダー            | 用途             |
| ----------- | ---------------- | --------------------- | ------------------- | ---------------- |
| primary     | `--ag-accent`    | `#090b10`（ダーク時） | なし                | 主要アクション   |
| secondary   | `--ag-surface-1` | `--ag-text-primary`   | `--ag-border`       | 補助アクション   |
| ghost       | transparent      | `--ag-text-secondary` | なし                | 低優先アクション |
| destructive | `--ag-error-bg`  | `--ag-error-text`     | `--ag-error-border` | 削除・破壊       |

---
