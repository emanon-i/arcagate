---
status: draft
phase_id: PH-20260311-002
title: 実機フィードバック UI 全面改修
depends_on:
  - PH-20260311-001
---

# PH-20260311-002: 実機フィードバック UI 全面改修

## 目的

PH-20260311-001 完了後の実機操作テストで発見された35件の UI/UX 指摘を
8ステップに整理して修正する。ヘッダー再構成、Library/Workspace 両画面の
サイドバー改修、詳細パネル強化、ウィジェット基盤刷新を行い、
操作性と視覚的一貫性を大幅に向上させる。

## 参照ドキュメント

- UI/UX 原則: docs/desktop_ui_ux_agent_rules.md
- L1: docs/l1_requirements/vision.md
- L2: docs/l2_foundation/foundation.md
- 前フェーズ: docs/l3_phases/PH-20260311-001_ui-ux-refinement.md

## ステップ構成

| 実装順 | #   | 内容                                | 件数 | 状態    |
| ------ | --- | ----------------------------------- | ---- | ------- |
| 1      | S-1 | ヘッダー・ナビゲーション再構成      | 4件  | pending |
| 2      | S-2 | Library サイドバー・カード改修      | 4件  | pending |
| 3      | S-3 | Library 詳細パネル改修              | 7件  | pending |
| 4      | S-4 | モーダル・ダイアログ修正            | 1件  | pending |
| 5      | S-5 | 全体設定統合 + Workspace サイドバー | 6件  | pending |
| 6      | S-6 | ウィジェット基盤改修                | 6件  | pending |
| 7      | S-7 | Workspace 編集機能修復              | 3件  | pending |
| 8      | S-8 | ウォッチフォルダーウィジェット改修  | 3件  | pending |

---

## S-1: ヘッダー・ナビゲーション再構成（T-1〜T-4）

### S-1-1: TitleBar から "Arcagate" テキスト削除 (T-1)

**変更対象**:

- `src/lib/components/arcagate/common/TitleBar.svelte` — "Arcagate" テキスト要素を削除

**受け入れ条件**:

- [ ] TitleBar に "Arcagate" テキストが表示されない
- [ ] TitleBar のドラッグ領域・ウィンドウ操作ボタンは維持
- [ ] E2E: TitleBar が存在し、ウィンドウ操作ボタン（最小化・最大化・閉じる）が動作する

### S-1-2: サイドパネル開閉ボタン削除 (T-2)

**変更対象**:

- `src/routes/+page.svelte` — AppHeader leftSlot から PanelLeft TitleAction を削除

**受け入れ条件**:

- [ ] AppHeader の左側に PanelLeft アイコンボタンが存在しない
- [ ] E2E: `[aria-label="Sidebar"]` ボタンが存在しない

### S-1-3: Library/Workspace タブの上下スペース均等化 (T-3)

**変更対象**:

- `src/lib/components/arcagate/common/AppHeader.svelte` — center slot の上下 padding 調整
- `src/lib/components/arcagate/common/TitleTab.svelte` — py の見直し

**受け入れ条件**:

- [ ] タブの上下スペースが視覚的に均等（下側を現在の3倍に拡大）
- [ ] vitest snapshot: TitleTab の padding が上下均等

### S-1-4: アクションボタンの左寄せ・順序変更 (T-4)

**変更対象**:

- `src/routes/+page.svelte` — rightSlot の内容を leftSlot に移動
  - 順序: 設定 → 可視化/不可視化 → パレット起動（左から右）
- `src/lib/components/arcagate/common/AppHeader.svelte` — leftSlot/rightSlot のレイアウト調整

**受け入れ条件**:

- [ ] AppHeader 右側にはアクションボタンが存在しない
- [ ] AppHeader 左側に設定・可視化・パレットの3ボタンがこの順序で表示
- [ ] E2E: 左側に `[aria-label="Settings"]`, `[aria-label*="非表示"]`, `[aria-label="Palette"]` がこの順で存在

---

## S-2: Library サイドバー・カード改修（L-1, L-2, L-3, L-11）

### S-2-1: サイドバー開閉ロジック変更 (L-1)

**変更対象**:

- `src/lib/components/arcagate/library/LibrarySidebar.svelte` — タグクリックハンドラの変更
- `src/lib/components/arcagate/library/LibraryLayout.svelte` — `sidebarExpanded` を内部状態に変更（タグクリック駆動）
- `src/routes/+page.svelte` — `sidebarExpanded` prop の削除

**挙動仕様**:

- アイコン列（48px）は常時表示
- 折りたたみ状態でタグアイコンクリック → 200px に展開 + そのタグでフィルタ
- 展開状態で同じタグアイコンクリック → 48px に折りたたみ
- 展開状態で別のタグアイコンクリック → 展開維持 + フィルタ切り替え
- 「すべて」選択中に「すべて」クリック → 折りたたみ

**受け入れ条件**:

- [ ] アイコン列（48px）が常時表示されている
- [ ] 折りたたみ時にタグアイコンクリックでパネルが 200px に展開する
- [ ] 展開時に選択中タグの再クリックで 48px に折りたたまれる
- [ ] 展開時に別タグクリックでフィルタが切り替わりパネルは開いたまま
- [ ] 「すべて」が選択中のとき「すべて」クリックで折りたたまれる
- [ ] E2E: サイドバーのタグアイコンクリックで展開/折りたたみをテスト

### S-2-2: LibraryCard の "…" メニュー削除 (L-11)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryCard.svelte` — DropdownMenu.Root 全体を削除

**受け入れ条件**:

- [ ] カード右上に "…" (MoreHorizontal) ボタンが存在しない
- [ ] カードクリックで詳細パネルが開き、そこから操作可能
- [ ] E2E: LibraryCard に DropdownMenu トリガーが存在しない

### S-2-3: アイテムカードのアスペクト比 16:9 固定 (L-2)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryCard.svelte` — アート部分の高さを `aspect-video`（16:9）に変更
- `src/lib/components/arcagate/library/LibraryMainArea.svelte` — StatCard のアスペクト比も統一

**受け入れ条件**:

- [ ] LibraryCard のアート領域のアスペクト比が 16:9
- [ ] 総アイテム数等の情報カードも同じ 16:9 アスペクト比
- [ ] vitest: カードコンポーネントに `aspect-video` クラスが適用されている

### S-2-4: ワイド時のカード左右余白 (L-3)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryMainArea.svelte` — グリッドの max-width と auto-fill 調整

**受け入れ条件**:

- [ ] ウィンドウ幅が広い場合、カードが横並びできるまで左右に余白が保たれる
- [ ] カード幅が `max-w-sm` を超えない
- [ ] E2E: ワイド幅（1200px以上）でカード間に適切な余白がある

---

## S-3: Library 詳細パネル改修（L-5〜L-10, W-11）

### S-3-1: "不可視化" → "プライベート ON/OFF" に文言変更 (L-5)

**変更対象**:

- `src/lib/components/arcagate/library/SensitiveControl.svelte` — テキストを「プライベート ON」/「プライベート OFF」に変更

**受け入れ条件**:

- [ ] 非表示状態のとき「プライベート ON」と表示
- [ ] 表示状態のとき「プライベート OFF」と表示
- [ ] "不可視化" / "可視化" のテキストがどこにも存在しない
- [ ] E2E: SensitiveControl のテキストが「プライベート ON」または「プライベート OFF」

### S-3-2: アイコン表示の改善 (L-6)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — アイコン表示部の修正
  - `object-contain` → `object-cover` に変更（表示域いっぱい、比率維持、空白なし）
  - 画像品質の低減（Tauri asset protocol のリサイズオプション or CSS filter）

**受け入れ条件**:

- [ ] アイコンが表示域いっぱいに表示される（空白なし）
- [ ] アイコンのアスペクト比が維持されている
- [ ] vitest: `object-cover` クラスが適用されている

### S-3-3: ターゲット URL の省略表示 (L-7)

**変更対象**:

- `src/lib/components/arcagate/common/DetailRow.svelte` — value のテキストに `truncate` + `title` 属性追加
- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — ターゲット行の max-width 調整

**受け入れ条件**:

- [ ] 長い URL が "…" で省略表示される
- [ ] マウスオーバーでツールチップに全文が表示される
- [ ] E2E: 長い URL を持つアイテムで `title` 属性に全 URL が設定されている

### S-3-4: タイトルの省略表示 (L-8)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — タイトルと種別バッジの配置調整

**受け入れ条件**:

- [ ] 長いタイトルが省略表示され、システムタグバッジと重ならない
- [ ] タイトルにマウスオーバーで全文ツールチップが表示される
- [ ] E2E: タイトル要素に `truncate` クラスと `title` 属性が存在

### S-3-5: タグ項目の追加表示 (L-9)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — 種別・ターゲット・別名・引数の下に「タグ」セクション追加

**受け入れ条件**:

- [ ] 詳細パネルにアイテムに紐づくタグがチップ形式で表示される
- [ ] タグがない場合は「タグなし」等のプレースホルダーが表示される
- [ ] E2E: 詳細パネルにタグセクションが存在する

### S-3-6: タグ編集機能の追加 (W-11)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — タグセクションに編集 UI を追加
  - 既存タグのチップクリックでタグ解除
  - 未割当タグの追加ボタン or セレクタ

**受け入れ条件**:

- [ ] 詳細パネルからアイテムにタグを追加できる
- [ ] 詳細パネルからアイテムのタグを解除できる
- [ ] タグ変更が即座に DB に反映される
- [ ] E2E: タグの追加・解除操作後にタグ表示が更新される

### S-3-7: デフォルトアプリの UI 統一 + exe ファイルピッカー (L-10)

**変更対象**:

- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — `<select>` を DetailRow スタイル + ファイル選択ボタンに変更
- Rust 側: `@tauri-apps/plugin-dialog` の `open()` を使用して exe ファイル選択

**受け入れ条件**:

- [ ] デフォルトアプリの表示が他の DetailRow と同じスタイル
- [ ] ファイル選択ボタンが表示される（フォルダ型アイテムのみ）
- [ ] ボタンクリックで OS のファイル選択ダイアログが開き、exe を選択できる
- [ ] 選択した exe パスが保存される
- [ ] E2E: フォルダ型アイテムの詳細パネルにファイル選択ボタンが存在する

---

## S-4: モーダル・ダイアログ修正（L-4）

### S-4-1: ItemFormDialog の透過修正 (L-4)

**変更対象**:

- `src/lib/components/item/ItemFormDialog.svelte` — ダイアログ本体の `bg-[var(--ag-surface-3)]` を不透明な色に変更

**受け入れ条件**:

- [ ] アイテム追加/編集モーダルの背景が透けない
- [ ] モーダルの背後のコンテンツが見えない
- [ ] E2E: ItemFormDialog を開いた状態で背後の要素が視認不可能（スクリーンショット比較 or opacity チェック）

---

## S-5: 全体設定統合 + Workspace サイドバー（W-1〜W-6）

### S-5-1: Workspace 専用サイドバー追加 (W-1, W-2)

**変更対象**:

- 新規: `src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte`
  - 48px アイコン列（常時表示）
  - 上部: ワークスペース編集アイコンボタン（Pencil）
  - 下部: アプリ全体設定アイコンボタン（歯車）→ S-5-3 と連携
- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — サイドバーを組み込むグリッドレイアウトに変更

**編集モードの挙動**:

- 編集アイコンクリック → パネルが展開(200px) → ウィジェット一覧表示 + 編集モード開始
- 編集モード中: ×ボタンでキャンセル（変更を破棄し編集前に戻る）
- 編集モード中: ✓ボタンで確定（変更を保存）

**受け入れ条件**:

- [ ] Workspace 画面にサイドバー（48px アイコン列）が表示される
- [ ] 編集アイコンクリックでパネルが展開しウィジェット一覧が表示される
- [ ] 展開時にワークスペースが編集モードに入る
- [ ] ×ボタンで編集がキャンセルされ編集前に戻る
- [ ] ✓ボタンで編集が確定し保存される
- [ ] E2E: 編集アイコンクリック → パネル展開 → ウィジェット一覧表示 → ×/✓で閉じる

### S-5-2: Workspace タブを大きくする (W-4)

**変更対象**:

- `src/lib/components/arcagate/common/Chip.svelte` or `src/lib/components/arcagate/workspace/PageTabBar.svelte`
  — Workspace タブの Chip サイズを拡大（padding, font-size）

**受け入れ条件**:

- [ ] Workspace 切り替えタブが現状より視認しやすい大きさ
- [ ] vitest: Chip の padding/font-size が拡大されている

### S-5-3: 全体設定の歯車アイコンをサイドバー下部に追加 (W-3)

**変更対象**:

- `src/routes/+page.svelte` — Library/Workspace 共通でサイドバー下部に歯車アイコンを配置
  - Library: `LibrarySidebar.svelte` の下部に追加
  - Workspace: 新規 `WorkspaceSidebar.svelte` の下部に追加
- クリックで既存の Settings モーダルを開く

**受け入れ条件**:

- [ ] Library 画面のサイドバー下部に歯車アイコンが表示される
- [ ] Workspace 画面のサイドバー下部に歯車アイコンが表示される
- [ ] 歯車アイコンクリックで全体設定モーダルが開く
- [ ] E2E: サイドバー下部の歯車ボタンクリックで設定モーダルが表示される

### S-5-4: テーマ切り替えを全体設定に移動 (W-5)

**変更対象**:

- `src/lib/components/arcagate/workspace/PageTabBar.svelte` — Dark/Light の Chip セクションを削除
- `src/lib/components/settings/SettingsPanel.svelte` — テーマ切り替え UI を追加

**受け入れ条件**:

- [ ] PageTabBar に Dark/Light のテーマ切り替えチップが存在しない
- [ ] 全体設定モーダル内にテーマ切り替え UI がある
- [ ] テーマ切り替えが全体設定から正常に動作する
- [ ] E2E: 設定モーダルでテーマ切り替えを実行し、テーマが変更される

### S-5-5: Workspace の MoreMenu 廃止 (W-6)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — MoreMenu コンポーネントを削除
  - ウィジェット追加機能は S-5-1 のサイドバーパネル内に移動済み
  - 名前変更機能もサイドバーパネル内に移動

**受け入れ条件**:

- [ ] Workspace ヘッダーに "…" (MoreMenu) ボタンが存在しない
- [ ] ウィジェット追加はサイドバーパネルから行える
- [ ] E2E: MoreMenu ボタンが存在しない

---

## S-6: ウィジェット基盤改修（WG-1〜WG-6）

### S-6-1: ウィジェット設定アイコンの常時表示 (WG-1)

**変更対象**:

- `src/lib/components/arcagate/common/WidgetShell.svelte` — `menuItems.length > 0` の条件を削除し、常に "…" アイコンを右上に表示
- 全ウィジェット: `menuItems` が空でも設定モーダルを開くデフォルト項目を追加

**受け入れ条件**:

- [ ] 全ウィジェットの右上に "…" 設定アイコンが常時表示される
- [ ] アイコンクリックで設定モーダルが開く
- [ ] E2E: 各ウィジェットに設定アイコンが存在し、クリックでモーダルが表示される

### S-6-2: ウィジェットのピクセル固定サイズ + 自動列数 + ズーム (WG-2)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — グリッドレイアウトを変更
  - CSS Grid の `repeat(auto-fill, ...)` で横幅に収まるだけ自動で列を増やす
  - ウィジェットサイズ: 固定ピクセル（16:9 比率）
  - Ctrl+マウススクロールで拡大/縮小
- `src/lib/components/settings/SettingsPanel.svelte` — ウィジェットの拡大率設定を追加
- `src/lib/state/workspace.svelte.ts` or `src/lib/state/config.svelte.ts` — ズームレベルの永続化

**受け入れ条件**:

- [ ] ウィジェットが固定ピクセルサイズ（16:9 比率）で表示される
- [ ] ウィンドウ幅が広がると自動で列数が増える
- [ ] Ctrl+マウススクロールでウィジェットの拡大/縮小が動作する
- [ ] 拡大率が全体設定で調整可能
- [ ] 拡大率がアプリ再起動後も永続化される
- [ ] E2E: ウィジェットのアスペクト比が 16:9

### S-6-3: ウィジェット背景色の不透明化 (WG-3)

**変更対象**:

- `src/lib/components/arcagate/common/WidgetShell.svelte` — `bg-[var(--ag-surface-3)]` を不透明な色に変更

**受け入れ条件**:

- [ ] ウィジェットの背後のコンテンツが透けて見えない
- [ ] E2E: WidgetShell の背景色が不透明（alpha = 1.0）

### S-6-4: ウィジェット表示の重なり防止 (WG-4)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — ウィジェット配置ロジックに重なり検出を追加
- `src/lib/state/workspace.svelte.ts` — `addWidget` / `moveWidget` で重なりチェック

**受け入れ条件**:

- [ ] ウィジェット同士が重なって表示されない
- [ ] ウィジェット追加/移動時に重なりが検出された場合、自動で空きスペースに配置される
- [ ] E2E: 複数ウィジェットが重ならず表示されること

### S-6-5: Workspace スクロールバーの追加 (WG-5)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — コンテナに `overflow: auto` を設定（上下左右スクロール可能）

**受け入れ条件**:

- [ ] ウィンドウ外のウィジェットにスクロールでアクセスできる
- [ ] 水平スクロールが可能
- [ ] 垂直スクロールが可能
- [ ] E2E: ウィンドウサイズより大きなコンテンツ配置時にスクロールバーが表示される

### S-6-6: ウィジェット内アイテムの右クリック詳細パネル (WG-6)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — 右側に詳細パネル表示スロット追加
- `src/lib/components/arcagate/workspace/FavoritesWidget.svelte` — 各アイテムに `oncontextmenu` 追加
- `src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte` — 同上
- `src/lib/components/arcagate/workspace/ProjectsWidget.svelte` — 同上
- `src/lib/components/arcagate/library/LibraryDetailPanel.svelte` — Workspace 側でも再利用

**受け入れ条件**:

- [ ] ウィジェット内のアイテムを右クリックで右側に詳細パネルが表示される
- [ ] 詳細パネルは Library の DetailPanel と同じ内容（起動・編集・削除・タグ等）
- [ ] パネル外クリック or × で閉じる
- [ ] E2E: ウィジェットアイテム右クリック → 詳細パネル表示 → 閉じる

---

## S-7: Workspace 編集機能修復（W-7, W-9, W-10）

### S-7-1: Workspace 編集の動作修復 (W-7)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — 編集モードの状態管理修正
- `src/lib/state/workspace.svelte.ts` — ウィジェット CRUD の IPC 呼び出し修正

**受け入れ条件**:

- [ ] 編集モードに入れる
- [ ] 編集モードでウィジェットの追加・削除が動作する
- [ ] 編集モードを終了できる
- [ ] E2E: 編集モード → ウィジェット追加 → 確定 → ウィジェットが表示される

### S-7-2: ウィジェット D&D の修復 (W-9)

**変更対象**:

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — D&D イベントハンドラの修正
- `src/lib/state/workspace.svelte.ts` — `moveWidget` の座標更新修正

**受け入れ条件**:

- [ ] 編集モードでウィジェットをドラッグ＆ドロップで移動できる
- [ ] 移動後のウィジェット位置が正しく保存される
- [ ] E2E: ウィジェットを D&D で移動 → 位置が保持される

### S-7-3: 配置済みウィジェットの表示修復 (W-10)

**変更対象**:

- `src/lib/state/workspace.svelte.ts` — ウィジェット読み込みロジックの修正
- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte` — 表示条件の修正

**受け入れ条件**:

- [ ] 配置済みウィジェットがワークスペース表示時に正しく表示される
- [ ] ページリロード後もウィジェットが消えない
- [ ] E2E: ウィジェットを配置 → ページ遷移して戻る → ウィジェットが表示されている

---

## S-8: ウォッチフォルダーウィジェット改修（WF-1〜WF-3）

### S-8-1: ウィジェットタイトルの可変化 (WF-1)

**変更対象**:

- `src/lib/components/arcagate/workspace/ProjectsWidget.svelte` — ハードコードの "Projects & Git status" を `widget.config` のタイトルに変更
- `src/lib/utils/widget-config.ts` — デフォルト設定にタイトルフィールドを追加

**受け入れ条件**:

- [ ] ウィジェットタイトルが設定モーダルで変更可能
- [ ] デフォルトは「Projects & Git status」以外の適切な名前（例: "ウォッチフォルダー"）
- [ ] 変更したタイトルがウィジェットヘッダーに反映される
- [ ] E2E: タイトル変更 → ウィジェットヘッダーに反映される

### S-8-2: 設定モーダルの拡張 (WF-2)

**変更対象**:

- `src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte` — Projects ウィジェット用の設定項目を拡張
  - タイトル（テキスト入力）
  - 説明（テキスト入力、タイトル下に表示）
  - 監視対象フォルダ（フォルダ選択ダイアログ）

**受け入れ条件**:

- [ ] 設定モーダルにタイトル入力フィールドがある
- [ ] 設定モーダルに説明入力フィールドがある
- [ ] 設定モーダルに監視対象フォルダの選択ボタンがある
- [ ] 説明がウィジェットタイトルの下に表示される
- [ ] E2E: 設定モーダルで3フィールドが入力可能

### S-8-3: 監視フォルダの Library 自動追加 (WF-3)

**変更対象**:

- `src/lib/components/arcagate/workspace/ProjectsWidget.svelte` — 自動追加ロジック追加
- `src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte` — 自動追加 ON/OFF トグル追加
- Rust 側: 監視で見つかったフォルダを自動でアイテム登録する IPC コマンド追加
  - `src-tauri/src/commands/` — 自動登録コマンド
  - `src-tauri/src/services/` — 重複チェック付き登録ロジック

**受け入れ条件**:

- [ ] 設定モーダルに「自動追加」ON/OFF トグルがある
- [ ] ON の場合、監視で見つかったフォルダが Library にアイテムとして自動追加される
- [ ] 既に登録済みのフォルダは重複追加されない
- [ ] OFF の場合、自動追加は行われない
- [ ] E2E: 自動追加 ON → 新しいフォルダが監視ディレクトリに追加 → Library にアイテムが自動登録される

---

## 対象ファイル一覧

| ファイル                                                              | 変更ステップ                   |
| --------------------------------------------------------------------- | ------------------------------ |
| `src/lib/components/arcagate/common/TitleBar.svelte`                  | S-1-1                          |
| `src/lib/components/arcagate/common/AppHeader.svelte`                 | S-1-3, S-1-4                   |
| `src/lib/components/arcagate/common/TitleTab.svelte`                  | S-1-3                          |
| `src/lib/components/arcagate/common/TitleAction.svelte`               | —（変更なし）                  |
| `src/lib/components/arcagate/common/DetailRow.svelte`                 | S-3-3                          |
| `src/lib/components/arcagate/common/WidgetShell.svelte`               | S-6-1, S-6-3                   |
| `src/lib/components/arcagate/common/Chip.svelte`                      | S-5-2                          |
| `src/lib/components/arcagate/common/SidebarRow.svelte`                | —（変更なし）                  |
| `src/lib/components/arcagate/library/LibrarySidebar.svelte`           | S-2-1, S-5-3                   |
| `src/lib/components/arcagate/library/LibraryLayout.svelte`            | S-2-1                          |
| `src/lib/components/arcagate/library/LibraryCard.svelte`              | S-2-2, S-2-3                   |
| `src/lib/components/arcagate/library/LibraryMainArea.svelte`          | S-2-3, S-2-4                   |
| `src/lib/components/arcagate/library/LibraryDetailPanel.svelte`       | S-3-1〜S-3-7, S-6-6            |
| `src/lib/components/arcagate/library/SensitiveControl.svelte`         | S-3-1                          |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`        | S-5-1, S-5-5, S-6-2,4,5,6, S-7 |
| `src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte`       | S-5-1（新規作成）              |
| `src/lib/components/arcagate/workspace/PageTabBar.svelte`             | S-5-2, S-5-4                   |
| `src/lib/components/arcagate/workspace/ProjectsWidget.svelte`         | S-8-1, S-8-3                   |
| `src/lib/components/arcagate/workspace/FavoritesWidget.svelte`        | S-6-6                          |
| `src/lib/components/arcagate/workspace/RecentLaunchesWidget.svelte`   | S-6-6                          |
| `src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte`   | S-8-2, S-8-3                   |
| `src/lib/components/arcagate/workspace/WorkspaceEditorSidebar.svelte` | S-5-1（統合 or 廃止）          |
| `src/lib/components/item/ItemFormDialog.svelte`                       | S-4-1                          |
| `src/lib/components/settings/SettingsPanel.svelte`                    | S-5-3, S-5-4, S-6-2            |
| `src/routes/+page.svelte`                                             | S-1-2, S-1-4, S-2-1, S-5-3     |
| `src/lib/state/workspace.svelte.ts`                                   | S-6-4, S-7                     |
| `src/lib/state/config.svelte.ts`                                      | S-6-2                          |
| `src/lib/utils/widget-config.ts`                                      | S-8-1                          |

## 検証方法

1. `pnpm verify` が全通過
2. 既存 E2E テスト（28件）が全通過
3. 新規 E2E テスト追加（各ステップの受け入れ条件をカバー）:
   - S-1: ヘッダーレイアウト検証（ボタン配置・順序・テキスト不在）
   - S-2: サイドバー開閉操作・カードアスペクト比
   - S-3: 詳細パネルの各要素（テキスト・truncation・タグ・ファイルピッカー）
   - S-4: モーダル不透過チェック
   - S-5: Workspace サイドバー操作・設定モーダル・テーマ切替
   - S-6: ウィジェットサイズ・スクロール・右クリック詳細パネル
   - S-7: 編集モード・D&D・ウィジェット永続化
   - S-8: タイトル変更・設定項目・自動追加
4. 手動確認:
   - 全画面の目視チェック（透過・重なり・余白）
   - Ctrl+スクロールでのウィジェットズーム動作
   - exe ファイルピッカーの OS ダイアログ動作

## Exit Criteria

- [ ] S-1〜S-8 の全受け入れ条件がパス
- [ ] `pnpm verify` 通過
- [ ] 既存 E2E テスト通過
- [ ] 新規 E2E テストで各ステップの受け入れ条件をカバー
- [ ] 手動確認で UI の透過・重なり・余白に問題なし
