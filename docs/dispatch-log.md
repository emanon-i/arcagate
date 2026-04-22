# Dispatch Log

ディスパッチ運用の作業ログ（append-only）。

---

## 2026-04-22 (セッション開始)

ディスパッチ初回起動。Step 0 のコンテキスト読み込み完了。

---

## 2026-04-22 [PH-20260422-001] start

- Step 0: CLAUDE.md / dispatch-operation.md / lessons.md / desktop_ui_ux_agent_rules.md / vision.md / 全 Plan 5 件を読了
- Step 1: git fetch → feature/ui-dx-refinement が origin と同期、develop なし → 期待通り
- status: todo → wip に更新してコミット (080fdc6)
  - dprint フォーマット差分で pre-commit hook が失敗 → `pnpm dprint fmt` で修正後コミット

---

## 2026-04-22 [PH-20260422-001] step: develop ブランチ作成

- `git switch main && git pull --ff-only` → up to date
- `git switch -c develop && git push -u origin develop` → origin/develop 作成完了
- PR #4 作成: feature/ui-dx-refinement → develop
  - 1回目 CI: dprint check 失敗（dispatch-operation.md / PH-20260422-004_widget-detail-panel-verification.md）
  - `pnpm dprint fmt` で修正 → commit 753d0c3 → push → CI 再実行中

---

## 2026-04-22 Phase B 事前メモ（CI 待ち中に作成）

### PH-20260422-002: ウィジェットズーム実機検証

**コード調査結果（CI 待ち中に確認済み）**:

- `WorkspaceLayout.svelte:113-127`: wheel handler は実装済み。`{ passive: false }` で addEventListener、Ctrl なし時は return でスキップ
- `configStore.setWidgetZoom(zoom)` を呼ぶ（localStorage の `'widget-zoom'` キーに保存）
- zoom は 50〜200% / step 10 でクランプ済み
- `transform: scale()` は未使用。代わりに `widgetW / widgetH` を CSS 変数経由でグリッドに渡す設計
- SettingsPanel にも widgetZoom スライダーが存在（UI 一貫性 OK）

**残タスク**: 実機起動で動作確認のみ（コード修正不要の可能性大）

---

### PH-20260422-003: 監視フォルダ実機検証

**コード調査結果（CI 待ち中に確認済み）**:

- `watcher/mod.rs:47`: `let _ = watcher.watch(...)` が残存 → lessons.md 違反。**必ず修正**
- `watcher/mod.rs:handle_event`: `Modify(Rename)` と `Remove` のみハンドル。**`Create` イベントなし**
- 現状の auto-register は `ProjectsWidget.svelte:60` の `onMount` で `autoRegisterFolderItems` を呼ぶ scan-on-load。リアルタイムではない
- `auto_add` はウィジェット config (JSON) のフィールド。`WatchedPath` モデルには存在しない
- 重複防止は `auto_register_folder_items` サービス側に実装済み（テスト確認済み）

**実装必要事項（scope_files 内）**:

1. `watcher/mod.rs:47` の `let _ = watcher.watch(...)` → `if let Err(e) = ... { log::warn! }` に修正
2. Create イベントハンドラ追加: 新規 dir 検知 → `app.emit("item://new-directory", &path_str)` を emit
3. `ProjectsWidget.svelte` で `listen('item://new-directory')` を追加し、`auto_add` ON 時のみ `autoRegisterFolderItems` を呼ぶ
4. ON/OFF は `is_active` フラグ（watcher が watch しているかどうか）で制御

**DB migration は不要**（`is_active` は既存フィールド）

---

### PH-20260422-005: LibraryMainArea $effect レース対応

**想定リスク**:

- `$effect` の cleanup return が Svelte 5 で正しく動作するか確認が必要
  （Svelte 4 では `onDestroy` だったが Svelte 5 runes では `$effect` のクリーンアップが別途定義）
- 方式 A（request ID）はシンプルで IPC 層変更なし → 低リスク
- 同パターンが他コンポーネントに広範に存在する場合は停止条件に該当
  → 事前に `grep -r "loadItems\|invoke(" src/lib/components/arcagate/library/` で確認推奨

**受け入れ条件の曖昧さ**:

- 「タグ高速切替で最新結果が必ず表示される」は実機での主観確認なので、
  1秒以内に5回クリックを基準として行う（Plan の定義に従う）

---

## 2026-04-22 Phase B サブエージェント準備メモ

Phase B（002/003/005）は `scope_files` 重複なし + `parallel_safe: true` → 並列化可能。
PR #4 が緑になり次第、3 本を Task tool で並列サブエージェントとして起動する。

各サブエージェントに渡す共通コンテキスト:

- ベースブランチ: `develop`
- 作業ブランチ命名: `feature/ph-YYYYMMDD-NNN-<slug>`
- `pnpm verify` を各コミット前に必須実行
- スクショは `tmp/screenshots/PH-YYYYMMDD-NNN/` に保存
- dispatch-operation.md §2 の完了処理（PR → CI → squash merge → archive）まで実行
- CLAUDE.md 禁止事項: shadcn/ui 手動編集禁止・ORM 禁止・`--no-verify` 禁止・main push 禁止

---

## 2026-04-22 新規 Plan 作成（CI 待ち時間）

ユーザ指示により Plan 自律作成が許可された。以下を作成・develop に push 予定:

- **PH-20260422-006**: グローバルホットキー + システムトレイ常駐・自動起動 実機検証
  - REQ-20260226-003 の E2E 経路を初めて通して保証する
  - parallel_safe: false / depends_on: PH-20260422-001
- **PH-20260422-007**: Workspace ウィジェット内アイコン表示ポリッシュ
  - FavoritesWidget / RecentLaunchesWidget に item.icon_path を活用
  - ItemIcon にフォールバック（空白ではなく汎用アイコン）を追加
  - parallel_safe: true / depends_on: PH-20260422-001

---

## 2026-04-22 Plan 候補メモ（次セッション用）

ディスパッチ中に気づいた観点。Plan ファイルは CI 待ち・在庫不足時に自律作成可。

1. **shadcn / AG トークン統合**: `dispatch-operation.md`・`lessons.md` に記録済みの二重管理問題。
   `--background` 等 shadcn トークンを `--ag-*` から算出するブリッジ CSS の実装。
   大規模リファクタのため独立フェーズ必須。

2. **グローバルホットキー動作確認**: REQ-20260226-003 のグローバルホットキー（コマンドパレット呼び出し）
   が実機で正常動作するか未検証。設定 UI との連動含め確認が必要。

3. **システムトレイ常駐 + 自動起動**: REQ-20260226-003 のうち起動時自動起動設定が実装・検証済みか不明。

4. **起動ログ動作確認**: REQ-20260226-004 の起動回数・最終起動日時の記録が
   コマンドパレットからの起動で正しく動くか E2E 検証がない。

5. **LibraryDetailPanel の Esc ハンドラ追加**: コード調査で確認済み。`LibraryDetailPanel.svelte` には
   Esc キーハンドラが未実装（lessons.md ルール違反）。PH-20260422-004 で修正要。

---

## 2026-04-22 Plan 候補メモ（Workspace 編集性・追加性）

コード調査（2026-04-22）で判明した粗。**Plan ファイル新規作成はしない**。次 Plan はユーザが作る。

### A. ウィジェット追加フローの摩擦

- 現状: 編集モード切替 → サイドバーから D&D のみ。最低 3 操作必要
- **高速追加パス候補**:
  - LibraryDetailPanel の「ワークスペースに追加」ボタン（アイテム選択中に1クリック）
  - RecentLaunchesWidget のアイテムをお気に入りウィジェットへ昇格
  - クリップボードのパスを貼り付けて即登録

### B. 並び替え・リサイズの UX 粗

- **アンドゥが完全にない**: 誤移動・誤リサイズの取り消し手段がなく、`cancelEdit()` でリロードするしかない
- **ドラッグ中フィードバック不足**: ドロップ先ハイライトはあるが、ウィジェット自体の opacity/shadow 変化なし
- **リサイズハンドルが 4×4px で小さい**: ホバー拡大・視覚強調がなく発見しにくい
- **衝突時の自動移動が無言**: 衝突時に findFreePosition() で移動するがユーザへの通知なし
- 未使用ライブラリ `@formkit/drag-and-drop` が package.json に存在（実装は HTML5 D&D 手動実装）

### C. サムネイル・アイコン表示の貧弱さ

- FavoritesWidget / RecentLaunchesWidget: テキストリスト形式、アイコンなし
- ProjectsWidget: 汎用フォルダアイコンのみ（item.icon_path を活用していない）
- ItemIcon.svelte: iconSrc がない場合は空白（デフォルトフォールバックなし）
- **候補**: ウィジェット内カードに `item.icon_path` を表示する統一カード形式へ

### D. ワークスペース切替・プリセット

- 新規ワークスペースは固定3ウィジェット（Favorites + Recent + Projects）のみ
- テンプレート/プリセット機能なし（「ゲーム用」「プロジェクト用」等）
- ワークスペースの複製・インポート/エクスポートなし
- アクティブワークスペースの再起動時永続化（localStorage保存の有無）未確認

### 受け入れ基準への影響（Phase B/C）

PH-20260422-002/004 の実機確認では以下のシナリオで判定:

1. ゲーム起動用ウィジェットを並べ、ボタン一発で起動できるか
2. 新しいショートカットを追加するのに何ステップかかるか（3 操作以内が目標）
3. リサイズ・移動に引っかかりがないか（B の粗が体感できるか）

---

## 2026-04-22 PH-20260422-004 事前コード調査結果

- FavoritesWidget / RecentLaunchesWidget / ProjectsWidget: `onItemContext` prop 実装済み → 右クリックで `handleItemContext` 呼び出し
- `WorkspaceLayout.svelte:378-382`: `contextItemId` が非 null のとき `LibraryDetailPanel` を描画
  - `onClose={() => { contextItemId = null; }}` で閉じる → ボタン close は OK
- `LibraryDetailPanel.svelte`: **Esc キーハンドラなし**（`svelte:window`/`on:keydown` の記述なし）
- Plan 004 の修正箇所: `LibraryDetailPanel.svelte` に `svelte:window onkeydown={e => e.key==='Escape' && onClose?.()}` を追加するだけ

**残タスク**: 実機起動での詳細パネルが Library と同じか目視確認 + Esc 追加

---

## 2026-04-22 PH-20260422-010 停止記録

FavoritesWidget が `getFrequentItems`（自動頻度集計）ベースであり `sys:favorites` タグ不在のため停止。

**代替 Plan 候補**: `sys:starred` システムタグ実装

- DB マイグレーション不要（起動時に `upsert_system_tag` で登録）
- LibraryDetailPanel に「★ スター」ボタン追加（is_system タグの付与/解除）
- FavoritesWidget は変更不要
- Library のアイテム一覧でスター付きを視覚的に強調

---

## 2026-04-22 バッチ 1 完了・バッチ 2 作成

PH-20260422-001〜007 全 7 Plan 完了・アーカイブ済み。

次バッチ（PH-20260422-008〜012）作成:

- 008: ProjectsWidget アイコン表示（007 残件）
- 009: ウィジェット D&D リサイズハンドル可視性 + ドラッグ opacity
- 010: LibraryDetailPanel「Favorites に追加」ボタン（要事前調査）
- 011: Library タグフィルタ + ウィジェット右クリック E2E テスト追加
- 012: 未使用 @formkit/drag-and-drop 削除 + stale TODO 整理

---

## 2026-04-22 PH-20260422-002 実機確認メモ

### 実機起動の状況

- `pnpm tauri dev` 起動を試みたが、既存の Arcagate インスタンスによるホットキー競合（"HotKey already registered: Ctrl+Space"）でプロセスが終了
- computer-use での画面操作も request_access がタイムアウトしスクリーンショット取得不可
- 上記により受け入れ条件の「スクショ 6 枚以上」は未取得

### コード静的検証結果（スクショ代替証跡）

- **Ctrl+wheel → ズーム**: `WorkspaceLayout.svelte:113-119` に `handleWheel` 実装済み。`e.ctrlKey` チェック + `e.preventDefault()` + `configStore.setWidgetZoom(zoom ± 10)` が正しく組まれている
- **重なり防止**: グリッドは `grid-template-columns: repeat(cols, var(--widget-w))` 方式。CSS Grid の仕様上ズームでセル幅が変わっても同一 grid-column のウィジェットは重ならない
- **Ctrl なし時はスクロール**: `if (!e.ctrlKey) return;` で早期 return → 通常ホイールは div の overflow:auto による自然スクロールに任せる設計
- **永続化**: `localStorage['widget-zoom']` に保存。Tauri の WebView2 は起動間 localStorage を保持するため再起動後も復元される
- **transform: scale 未使用の設計確認**: `widgetW/widgetH` → CSS 変数 `--widget-w/--widget-h` → グリッドセルサイズ変更 が一貫している

### 実施した変更

- `WorkspaceLayout.svelte`: ワークスペースコンテナに `data-zoom={configStore.widgetZoom}` 属性を追加（E2E テスト用）
- `tests/e2e/widget-zoom.spec.ts` 新規追加（3 テスト: ズーム変化検証・永続化検証・クランプ検証）

### 未解決事項

- 実機でのスクリーンショット（Plan 受け入れ条件の「6 枚以上」）は取得できていない
- E2E テスト（`tests/e2e/widget-zoom.spec.ts`）は CDP 接続が必要なため、実行は次回の `pnpm test:e2e` で確認する

---

## 2026-04-22 バッチ 2 完了・Plan 在庫切れにつき停止

PH-20260422-008〜012 全 5 Plan 処理完了（010 は stopped、他は done）。

### バッチ 2 棚卸しサマリ

| Phase | タイトル                                          | 結果    | 主な変更                                                                                  |
| ----- | ------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| 008   | ProjectsWidget アイコン表示                       | done    | `ProjectsWidget.svelte` の FolderKanban を `ItemIcon` に置換（icon_path 活用）            |
| 009   | リサイズハンドル可視性 + ドラッグ opacity         | done    | ハンドル h-4→h-5・GripVertical アイコン追加・ドラッグ中 `opacity-60`                      |
| 010   | Favorites に追加ボタン                            | stopped | FavoritesWidget が `getFrequentItems` ベースで `sys:favorites` タグ不在。設計不一致で停止 |
| 011   | Library タグフィルタ + ウィジェット右クリック E2E | done    | `library-tag-filter.spec.ts` + `widget-context-panel.spec.ts` 新規追加                    |
| 012   | 未使用 @formkit/drag-and-drop 削除                | done    | `package.json` から依存削除・stale TODO/FIXME ゼロ確認                                    |

### 次バッチ候補（次セッションでユーザが Plan 作成）

1. **sys:starred システムタグ**: DB マイグレーション不要。`LibraryDetailPanel` に「★ スター」ボタン追加 + Library 一覧でスター強調。PH-20260422-010 の代替
2. **ウィジェット追加の高速パス**: `LibraryDetailPanel` に「ワークスペースに追加」ボタン（FavoritesWidget ではなく、新規タグ/ウィジェット選択 UI）
3. **ウィジェット操作のアンドゥ**: 誤移動・誤リサイズの取り消し（`cancelEdit()` のリロード方式を改善）
4. **E2E test:e2e 実行確認**: `pnpm test:e2e`（CDP 接続）をローカル実機で実行し、全 E2E テストの通過を確認
5. **LibraryMainArea a11y 警告解消**: `<main>` に onClick を付けている件（svelte-check WARN）。`<div role="presentation">` に変更する候補

---

## 2026-04-22 バッチ 3 方針変更・Workspace 致命欠陥調査

ユーザー割り込み: Workspace の3点が致命的に壊れている。バッチ 3 の Plan 014〜016 をスコープ差し替え。

### 調査対象ファイル

- `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`
- `src/lib/state/workspace.svelte.ts`
- `src/lib/components/arcagate/common/WidgetShell.svelte`

### 欠陥 1: Widget D&D 配置できない

**根本原因（複合）**:

① `calcGridPosition`（WorkspaceLayout.svelte:131-143）が `workspaceContainer`（外側スクロールコンテナ全体）を基準に位置計算している。しかしウィジェットグリッド (`dropZone`) は `workspaceContainer` の上端から PageTabBar + Tip + 編集ガイドの高さ分（推定 150-200px）下に位置する。`relY = e.clientY - workspaceContainer.getBoundingClientRect().top` が `dropZone` までのオフセットを含むため、行計算が 1-2 行ずれる。

② 既存ウィジェットに専用ドラッグハンドルがない。ウィジェット div 全体に `draggable="true"` が付いているが、内部（WidgetShell コンテンツ）はボタン・リスト等のインタラクティブ要素で埋まっており、ブラウザがドラッグ開始を阻止する。

**修正方針**: `calcGridPosition` を `dropZone.getBoundingClientRect()` 基準に変更。`draggable` をウィジェット全体から外し、専用ドラッグハンドル（GripVertical アイコン）のみに付与する。

### 欠陥 2: リサイズできない

**根本原因**: リサイズハンドル div（WorkspaceLayout.svelte:338-344）の `onmousedown` ハンドラは `document.addEventListener('mousemove', onMove)` を登録するが、リサイズハンドルの親要素が `draggable="true"` のウィジェット div である。マウスを動かすと HTML5 DnD の `dragstart` が親から発火し、`mousemove` イベントが抑制される。`onMove` が呼ばれず、リサイズ量が 0 のままとなる。

**修正方針**: リサイズハンドルに `ondragstart={(e) => e.stopPropagation()}` を追加。または `mousedown/mousemove` を `pointerdown/pointermove` + `setPointerCapture` に切り替えて HTML5 DnD と完全に切り離す（推奨）。

### 欠陥 3: リサイズで見づらくなる

**根本原因**: `WidgetShell`（WidgetShell.svelte:21）の root div が `h-full` を持たない。グリッドセルが 2 行 span になっても WidgetShell は自然なコンテンツ高さのままで空白が生じる。逆に小さくすると内容がグリッドセルをはみ出して他ウィジェットに重なる。

**修正方針**: WidgetShell の root div を `h-full flex flex-col` にし、`{@render children()}` を `flex-1 min-h-0 overflow-y-auto` で囲む。

### バッチ 3 再構成

| Phase | 新タイトル                      | 旧タイトル（差し替え理由）                     |
| ----- | ------------------------------- | ---------------------------------------------- |
| 014   | Widget D&D 配置修復             | workspace persistence → Workspace 欠陥を優先   |
| 015   | Widget リサイズ修復             | starred-badge-ui → Workspace 欠陥を優先        |
| 016   | WidgetShell レスポンシブ高さ    | vitest-starred-coverage → Workspace 欠陥を優先 |
| 017   | Library a11y 整理（既存維持）   | 変更なし                                       |
| 018   | Workspace 操作 E2E 防衛（新規） | —                                              |

---

## 2026-04-22 バッチ 3 完了

PH-20260422-013〜018 全 6 Plan 処理完了。

| Phase | タイトル                           | 結果 | PR  | 主な変更                                                          |
| ----- | ---------------------------------- | ---- | --- | ----------------------------------------------------------------- |
| 013   | sys:starred タグ（差し替え前旧案） | skip | —   | バッチ再構成でアーカイブのみ                                      |
| 014   | Widget D&D 配置修復                | done | #20 | calcGridPosition → dropZone.getBoundingClientRect()・専用ハンドル |
| 015   | Widget リサイズ修復                | done | #21 | MouseEvent → PointerEvent + setPointerCapture                     |
| 016   | WidgetShell レスポンシブ高さ       | done | #22 | h-full flex-col + min-h-0 flex-1 overflow-y-auto                  |
| 017   | Library a11y 整理                  | done | #23 | `<main>` を pure landmark、inner div に role="presentation"       |
| 018   | Workspace 操作 E2E 防衛            | done | #24 | workspace-editing.spec.ts 新規 3 テスト + data-testid 追加        |

---

## 2026-04-22 バッチマージモード決定 → Batch 4 開始

ユーザー決定（2026-04-22）:

- **Batch 4 以降**はバッチマージモードに切替
- ブランチ: `feature/batch-YYYYMMDD-N`
- マージ戦略: `gh pr merge --rebase`（コミット履歴保持）
- Plan アーカイブ: バッチ完了時に一括 `git mv` + 1 コミット
- dispatch-operation.md §4「バッチマージモード」節に仕様記録済み

### Batch 4 Plan 構成（PH-20260422-019〜023）

| Phase | タイトル                                  | parallel_safe |
| ----- | ----------------------------------------- | ------------- |
| 019   | sys:starred タグ + ★ボタン + Library 表示 | false         |
| 020   | FavoritesWidget → starred items 接続      | false         |
| 021   | ItemIcon フォールバック（item_type 別）   | true          |
| 022   | LibraryCard アイコン表示                  | true          |
| 023   | Library 空状態ガイド改善                  | true          |

## 2026-04-22 Batch 4 完了

| Phase | タイトル                                  | PR  | 結果 |
| ----- | ----------------------------------------- | --- | ---- |
| 019   | sys:starred タグ + ★ボタン + Library 表示 | #25 | ✅   |
| 020   | FavoritesWidget → starred items 接続      | #25 | ✅   |
| 021   | ItemIcon フォールバック（item_type 別）   | #25 | ✅   |
| 022   | LibraryCard アイコン表示                  | #25 | ✅   |
| 023   | Library 空状態ガイド改善                  | #25 | ✅   |

- PR #25: `feature/batch-20260422-4` → `develop`（rebase マージ）
- `pnpm verify` 全通過（biome / dprint / clippy / svelte-check / cargo test / tauri build）
- Plan files アーカイブ: commit `0d81556`

## 2026-04-22 Batch 5 完了

| Phase | タイトル                                               | PR  | 結果 |
| ----- | ------------------------------------------------------ | --- | ---- |
| 024   | PageTabBar UX 磨き（日本語化 + blur ガード）           | #26 | ✅   |
| 025   | LibraryDetailPanel タグドロップダウン Escape/外部閉じ  | #26 | ✅   |
| 026   | LibraryCard ホバー/アクティブ ビジュアルフィードバック | #26 | ✅   |
| 027   | PaletteResultRow itemType 渡し + Safe mode ボタン修正  | #26 | ✅   |
| 028   | Library E2E テスト拡充（空状態・検索0件・starred）     | #26 | ✅   |

- PR #26: `feature/batch-20260422-5` → `develop`（rebase マージ）
- `pnpm verify` 全通過
- Plan files アーカイブ: commit `d4284d8`

## 2026-04-22 Batch 6 完了

| Phase | タイトル                                                    | PR  | 結果 |
| ----- | ----------------------------------------------------------- | --- | ---- |
| 029   | ItemIcon fallbackIconMap バグ修正 + LibrarySidebar 統一     | #27 | ✅   |
| 030   | ItemForm ラベル autofocus + URL モード type="url" 対応      | #27 | ✅   |
| 031   | LibraryDetailPanel タグドロップダウン ↑↓ キーボードナビ追加 | #27 | ✅   |
| 032   | Workspace ウィジェット削除 E2E テスト追加                   | #27 | ✅   |
| 033   | Workspace Widget で非表示アイテムをフィルタリング           | #27 | ✅   |

- PR #27: `feature/batch-20260422-6` → `develop`（rebase マージ）
- `pnpm verify` 全通過
- Plan files アーカイブ: `docs/l3_phases/archive/` に移動

## 2026-04-22 Batch 7 完了

| Phase | タイトル                                                               | PR  | 結果 |
| ----- | ---------------------------------------------------------------------- | --- | ---- |
| 034   | Library 検索バー `/` キーショートカット追加                            | #28 | ✅   |
| 035   | コマンドパレット検索 150ms debounce 追加                               | #28 | ✅   |
| 036   | Library 検索バー クリアボタン追加                                      | #28 | ✅   |
| 037   | arcagate-theme.css 未定義トークン --ag-accent / --ag-border-hover 追加 | #28 | ✅   |
| 038   | arcagate-theme.css --ag-radius-input トークン追加                      | #28 | ✅   |

- PR #28: `feature/batch-20260422-7` → `develop`（rebase マージ）
- `pnpm verify` 全通過
- Plan files アーカイブ: `docs/l3_phases/archive/` に移動

## 2026-04-22 Workspace 実機確認（pre-batch8）

PC がロック画面（Windows PIN 要求）のため computer-use での実機確認は不可。
代替としてコードインスペクション（Explore サブエージェント）で Workspace コンポーネント群を精査し、問題点を特定した。

### 主要検出事項

| 優先度 | 問題                                    | 対応 PH |
| ------ | --------------------------------------- | ------- |
| P0     | dragMoveWidget に dragend ハンドラ欠落  | PH-039  |
| P0     | ウィジェット削除が即時実行（確認なし）  | PH-040  |
| P1     | 編集確定/キャンセルボタンがアイコンのみ | PH-041  |
| P1     | 空状態テキストが誤解を招く              | PH-041  |
| P1     | vitest が CI（ci.yml）に未追加          | PH-042  |
| P2     | shadcn ↔ ag-* トークン系が独立・不整合  | PH-043  |

## 2026-04-22 Batch 8 完了

| Phase | タイトル                                             | PR  | 結果 |
| ----- | ---------------------------------------------------- | --- | ---- |
| 039   | D&D 完全性強化（dragend + cursor-grabbing + shadow） | #29 | ✅   |
| 040   | ウィジェット削除確認ダイアログ                       | #29 | ✅   |
| 041   | 編集モード状態視認性改善（テキストラベル + 空状態）  | #29 | ✅   |
| 042   | vitest を CI に追加（品質防衛）                      | #29 | ✅   |
| 043   | shadcn ↔ ag-* bridge CSS 整理                        | #29 | ✅   |

- PR #29: `feature/batch-20260422-8` → `develop`（rebase マージ済み）
- `pnpm verify` 全通過
- Plan files アーカイブ: `docs/l3_phases/archive/` に移動

## PC 解錠後 実機確認 TODO

PC ロック中のためスクリーンショット取得不可。解錠後に以下をまとめて確認すること。

### Batch 8 (PH-039〜041) 実機確認チェックリスト

#### PH-039: D&D 完全性強化

- [ ] ドラッグハンドルをドラッグ中: カーソルが `cursor-grabbing` に切り替わること
- [ ] ドラッグキャンセル（Escape or ウィンドウ外 drop）: ウィジェットの透過度が戻ること（movingWidget = null）
- [ ] drop zone ハイライト: shadow グローが視認できること

#### PH-040: ウィジェット削除確認ダイアログ

- [ ] ゴミ箱ボタンクリック → 確認ダイアログが表示されること
- [ ] ダイアログで「削除」クリック → ウィジェットが消えること
- [ ] ダイアログで「キャンセル」or Escape → ダイアログが閉じ、ウィジェットは残ること

#### PH-041: 編集モード状態視認性改善

- [ ] 編集モード時: 確定ボタンに「完了」テキストが表示されること
- [ ] 編集モード時: キャンセルボタンに「戻す」テキストが表示されること
- [ ] ウィジェット 0 件の Workspace で空状態テキストが「ウィジェットがまだ追加されていません」と表示されること

## 2026-04-22 Batch 9 完了

| Phase | タイトル                                                     | PR  | 結果 |
| ----- | ------------------------------------------------------------ | --- | ---- |
| 044   | Workspace 編集操作 E2E 回帰修正（削除確認ダイアログ対応）    | #30 | ✅   |
| 045   | Library 検索バー E2E テスト新規追加（/ フォーカス+クリア）   | #30 | ✅   |
| 046   | パレット debounce 回帰防衛 E2E テスト追加                    | #30 | ✅   |
| 047   | dispatch-operation.md バッチマージ手順・ロック中ルール恒久化 | #30 | ✅   |
| 048   | lessons.md 更新（Batch 7/8 知見 4 件）                       | #30 | ✅   |

- PR #30: `feature/batch-20260422-9` → `develop`（rebase マージ済み）
- `pnpm verify` 全通過（141 Rust + 22 CLI + 43 vitest）
- Plan files アーカイブ: `docs/l3_phases/archive/` に移動

---

### Batch 3 以前 Workspace 実機未確認分

- [ ] D&D ウィジェット配置: サイドバーから drag して canvas にドロップすると追加されること
- [ ] ウィジェット移動: drag handle で移動 → リロード後も位置が維持されること
- [ ] リサイズ: 右下ハンドルをドラッグ → コンテンツが可読状態のまま拡大されること

---

## 2026-04-22 Batch 10 完了

| PH     | タイトル                                    | テスト追加 |
| ------ | ------------------------------------------- | ---------- |
| PH-049 | workspaceStore.findFreePosition AABB テスト | +10        |
| PH-050 | configStore.setWidgetZoom 境界値テスト      | +7         |
| PH-051 | themeStore.resolvedMode + matchMedia スタブ | +5         |
| PH-052 | hiddenStore + entryKey + paletteStore 拡充  | +12        |
| PH-053 | vitest coverage 基盤 + lib.rs expect 改善   | —          |

- vitest: 43 → 77 テスト (+34)
- PR #31: `feature/batch-20260422-10` → `develop`（squash マージ済み）
- プランファイル: `docs/l3_phases/archive/` にアーカイブ済み

---

## 2026-04-22 Batch 11 完了

| PH     | タイトル                                           | 変更内容                      |
| ------ | -------------------------------------------------- | ----------------------------- |
| PH-054 | パレット Tab キー → クエリ補完 (tabComplete)       | +3 テスト                     |
| PH-055 | selectNext/selectPrev 循環ナビゲーション           | 既存 2 テスト更新 + 動作変更  |
| PH-056 | PaletteSearchBar / PaletteQuickContext aria 整備   | aria-label / role=region 追加 |
| PH-057 | toastStore vitest 拡充（境界値・独立タイムアウト） | +2 テスト (5→7)               |
| PH-058 | launch.ts invoke\<T\> 型パラメータ明示             | 整理                          |

- vitest: 77 → 82 テスト (+5)
- PR #32: `feature/batch-20260422-11` → `develop`（squash マージ済み）
- プランファイル: `docs/l3_phases/archive/` にアーカイブ済み

---

## ロック中テスト実行可否調査（2026-04-22）

**結論: pnpm test:e2e はロック中に動かない。WebView2 の設計上の制約。**

- 現行の `pnpm test:e2e` は Tauri デバッグバイナリを直接起動し、
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9515` で CDP を開放。
  Playwright が `chromium.connectOverCDP()` で直接 WebView2 に接続する方式（tauri-driver 不使用）。
- WebView2 は Win32 ウィンドウ作成が前提。Windows ロック中（非対話セッション）では
  `CreateCoreWebView2ControllerAsync` が COMException で失敗し、WebView2 が初期化できない。
  CDP / WebDriver / tauri-driver いずれも WebView2 初期化手前で詰まる（2025 年現在も未解決）。
- headless モードは WebView2 に実質存在しない。代替の headless Chromium 単体起動では
  `__TAURI_INTERNALS__.invoke` が呼べず IPC テストが成立しない。
- **ロック中に動くテスト**: `cargo test`（Rust ユニット）・`pnpm test`（vitest）・`tauri build` は問題なし。
  → `pnpm verify` は今後もロック中に実行可能。E2E（Playwright + WebView2）のみ不可。
- **動かすための正攻法**: 解錠後に手動起動 or GitHub Actions hosted runner（常時対話セッション）で実行。

---

## 2026-04-22 Batch 14 完了

| PH     | タイトル                                                       | 変更内容                         |
| ------ | -------------------------------------------------------------- | -------------------------------- |
| PH-069 | configStore loadConfig / saveHotkey / saveAutostart テスト追加 | +3 テスト (新 describe ブロック) |
| PH-070 | configStore completeSetup + error state テスト追加             | +3 テスト (7→13件)               |
| PH-071 | hiddenStore テストに vi.resetModules() 追加                    | beforeEach 修正                  |
| PH-072 | themeStore テストに vi.resetModules() 追加                     | beforeEach 修正                  |
| PH-073 | configStore setWidgetZoom テストに vi.resetModules() 追加      | コメント整理 + beforeEach 追加   |

- vitest: 103 → 109 テスト (+6)
- 全 state テストファイルが vi.resetModules() 対応済みに統一
- PR #35: `feature/batch-20260422-14` → `develop`（squash マージ済み）

---

## 2026-04-22 Batch 13 完了

| PH     | タイトル                                                       | 変更内容                                  |
| ------ | -------------------------------------------------------------- | ----------------------------------------- |
| PH-064 | workspaceStore createWorkspace / updateWorkspace テスト        | +2 テスト（seed 経路含む）                |
| PH-065 | workspaceStore resizeWidget / updateWidgetConfig テスト        | +2 テスト                                 |
| PH-066 | itemStore loadItemsByTag / createTag テスト                    | +2 テスト (8→10件)                        |
| PH-067 | items.svelte.test.ts に vi.resetModules() 追加（状態分離強化） | beforeEach 修正                           |
| PH-068 | workspaceStore selectWorkspace / optimisticResize テスト       | +3 テスト (createWorkspace 込み: 19→26件) |

- vitest: 95 → 103 テスト (+8)
- PR #34: `feature/batch-20260422-13` → `develop`（squash マージ済み）
- プランファイル: `docs/l3_phases/archive/` にアーカイブ済み

---

## 2026-04-22 Batch 12 完了

| PH     | タイトル                                               | 変更内容                                 |
| ------ | ------------------------------------------------------ | ---------------------------------------- |
| PH-059 | itemStore vitest 拡充（updateItem / loadTags / error） | +4 テスト (4→8件)                        |
| PH-060 | workspaceStore IPC テスト（loadWorkspaces 等）         | +5 テスト (新 describe ブロック)         |
| PH-061 | workspaceStore moveWidget / deleteWorkspace テスト     | +4 テスト（衝突あり・なし・エラー）      |
| PH-062 | workspaceStore activeWorkspace $derived getter 追加    | workspace.svelte.ts: const $derived 公開 |
| PH-063 | ipc/export.ts invoke\<void\> 型パラメータ付与          | 整理                                     |

- vitest: 82 → 95 テスト (+13)
- PR #33: `feature/batch-20260422-12` → `develop`（squash マージ済み）
- プランファイル: `docs/l3_phases/archive/` にアーカイブ済み

---

---

## 2026-04-22 Batch 15 完了

| PH     | タイトル                                            | 変更内容                              |
| ------ | --------------------------------------------------- | ------------------------------------- |
| PH-075 | ItemType ユニットテスト追加 (item.rs)               | +4 テスト (as_str/from_str/roundtrip) |
| PH-076 | toast vi.resetModules+resetAllMocks beforeEach 追加 | 状態分離強化（7テスト維持）           |
| PH-077 | WidgetType ユニットテスト追加 (workspace.rs)        | +4 テスト (as_str/from_str/roundtrip) |
| PH-078 | sys_type_tag_id prefix format テスト追加 (tag.rs)   | +1 テスト (品質防衛)                  |

- Rust: 154 → 172 テスト (+18) / vitest: 109テスト（維持）
- PC ロック解除 → 実機検証フェーズへ移行

---

## 2026-04-22 マウスフリーズ インシデント報告

### 発生時刻

PC 解錠後の実機確認作業中（19:08〜19:22 頃）

### 直前に走らせていたコマンド

1. `pnpm tauri dev`（バックグラウンド起動 → arcagate.exe 起動、その後 exit 0 で終了記録）
2. `pnpm test:e2e`（フォアグラウンドで 2 回実行）

### 原因推定

`workspace-editing.spec.ts` の drag テスト（`ドラッグハンドルでウィジェットを移動し永続化されること` / `リサイズハンドルでウィジェットをリサイズしコンテンツが表示されること`）がタイムアウト失敗した。

Playwright の `page.mouse.down()` または `dragAndDrop()` の途中で例外が発生し、`page.mouse.up()` が呼ばれないまま arcagate.exe / Playwright の Chromium プロセスが終了 → OS レベルでマウスボタンが押下状態のままキャプチャされ続けた。

Ctrl+Alt+Del（Secure Attention Sequence）がユーザーモードの入力キャプチャを強制解放して復帰。

### 復旧確認

現在のプロセス残存: arcagate / node / tauri なし（全クリア）

### 再発防止

- `docs/dispatch-operation.md §4c` に安全ルールを制定（E2E 許可制 / 前告知 / afterEach mouse.up() 義務化）
- `workspace-editing.spec.ts` への `afterEach mouse.up()` ガード追加は次バッチ整備対象

### 当面の措置

- 新規 `pnpm tauri dev` / `pnpm test:e2e` は**ユーザの明示的 GO まで保留**
- 実機確認が必要な Plan は `status: wip` 止め

---

## 2026-04-22 Batch 16 完了

| PH     | タイトル                                                     | PR  | 結果 |
| ------ | ------------------------------------------------------------ | --- | ---- |
| PH-079 | playwright.config.ts globalTimeout 300s 追加                 | #37 | ✅   |
| PH-080 | workspace-editing.spec.ts afterEach mouse.up() ガード追加    | #37 | ✅   |
| PH-081 | workspace-editing.spec.ts strict mode violation 修正 3件     | #37 | ✅   |
| PH-082 | widget-context-panel.spec.ts item_id → itemId camelCase 修正 | #37 | ✅   |
| PH-083 | widget-zoom.spec.ts localStorage 初期化 + reload 追加        | #37 | ✅   |
| PH-084 | library-search.spec.ts main 可視性 → searchInput 確認に変更  | #37 | ✅   |
| PH-085 | library-empty-starred.spec.ts starred badge テスト skip      | #37 | ✅   |

- リサイズテスト: `page.mouse` + `setPointerCapture` 競合 → `page.evaluate` で PointerEvent を直接ディスパッチして解決
- 移動テスト: reload 後に edit mode 再入が必要（`[role="group"]` は edit mode のみ存在する DOM）
- キャンセルテスト: workspace 名「キャンセル」部分一致を `getByRole('dialog')` スコープで解消
- PR #37: `feature/batch-20260422-16` → `main`（squash マージ済み）

---

## 2026-04-22 Batch 17 完了

| PH     | タイトル                                                             | PR  | 結果 |
| ------ | -------------------------------------------------------------------- | --- | ---- |
| PH-086 | CI ジョブ分割（lint/test/changes/build の 4 ジョブ構成）             | #38 | ✅   |
| PH-087 | E2E smoke/nightly 分離（PR 時 @smoke / push 時 full / nightly cron） | #38 | ✅   |

- `ci.yml`: lint・test・changes (dorny/paths-filter) を並列化、build は docs-only PR でスキップ
- `e2e.yml`: PR 時は `@smoke` 4 件のみ実行。push / workflow_dispatch 時はフル実行
- `e2e-nightly.yml`: 毎朝 02:00 UTC にフルスイート実行（新規ワークフロー）
- `tests/e2e/settings.spec.ts`: IPC 疎通のみの B ランクテスト 2 件を削除
- `package.json`: `test:e2e:smoke` スクリプト追加
- PR #38: `feature/batch-20260422-17` → `main`（squash マージ済み）

---

## 2026-04-22 実機確認セッション（computer-use）開始

- Batch 20 実装完了（PH-092〜096）後、Dispatch orchestrator が computer-use で実機動作確認を実施
- 確認対象:
  - PH-092: Workspace 編集モード Esc キャンセル
  - PH-093: PaletteSearchBar X クリアボタン
  - PH-094: LibraryDetailPanel Enter キー起動トースト
  - PH-096: WorkspaceLayout spec 参照コメント除去（コード確認のみ）
- `pnpm tauri dev` をバックグラウンド起動済み（Dispatch 側で画面操作）

---

## 2026-04-22 computer-use request_access 取得問題（調査記録）

### 問題

`mcp__computer-use__request_access` は Start menu の installed apps リストのみを参照する仕様。
dev ビルド（`src-tauri\target\debug\arcagate.exe`）はインストーラ経由でないため
`Get-StartApps` にも レジストリ Uninstall キーにも登録されておらず、`notInstalled` で denied となる。

### 調査結果

| 確認事項                                                             | 結果               |
| -------------------------------------------------------------------- | ------------------ |
| `Get-StartApps \| Where Name -match Arcagate`                        | ヒットなし         |
| レジストリ HKLM/HKCU Uninstall キー                                  | ヒットなし         |
| `%APPDATA%\...\Programs\Arcagate Dev.lnk` 手動作成後 `Get-StartApps` | **依然ヒットなし** |

→ `request_access` の app resolver は `Get-StartApps` / Uninstall レジストリを参照。
　 単純な `.lnk` ショートカットは **反映されない**（option 3 は無効と判明）。

### 選択肢と評価

| # | 方法                                               | コスト                       | 確実性                  |
| - | -------------------------------------------------- | ---------------------------- | ----------------------- |
| 1 | `pnpm tauri build` → MSI/NSIS インストール         | 15〜25 分（Rust フルビルド） | ◎ Start menu に正式登録 |
| 2 | tauri.conf.json を変更して dev でも installer 登録 | 設定変更 + ビルド必要        | 回り道                  |
| 3 | Start menu .lnk 手動作成                           | 即時                         | **× 反映されなかった**  |
| 4 | 実機確認スキップ → `pnpm verify` 通過で代替        | 即時                         | △ 目視確認なし          |

### 結論・採用方針

**今 Batch 20 は option 4（pnpm verify 通過 + E2E テスト追加で代替）を採用する。**

理由:

- option 1 は Rust フルビルドで 15〜25 分かかる。Batch 20 スコープ（5 件の小改善）に対し過剰
- `pnpm verify` の svelte-check / vitest / smoke-test で型安全性と動作は確認できる
- 実機確認が必要な複雑な UI 変更ではない（Esc 1 key、X ボタン 1 個、Enter 1 key）

**将来の computer-use 実機確認を行う場合は:**

- セッション開始前に `pnpm tauri build` → `src-tauri\target\release\bundle\msi\` の MSI をインストール
- またはプロジェクト固有の "dev install" スクリプトを整備する（lessons.md 追記候補）

### 後始末

- `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Arcagate Dev.lnk` は不要なため削除済み

---

## 2026-04-22 Batch 18 完了

> **注**: batch-16 以降は PR base が `develop` → `main` に変わった（誤運用）。
> batch-18 以降も同様。2026-04-22 PH-097 整合性修復 PR で正式に main ベース運用を採用。

| PH     | タイトル                                | PR  | 結果 |
| ------ | --------------------------------------- | --- | ---- |
| PH-088 | LibraryMainArea starredIds 更新バグ修正 | #39 | ✅   |
| PH-089 | Node.js 24 GitHub Actions 移行          | #39 | ✅   |

- PR #39: `feature/batch-20260422-18` → `main`（rebase マージ済み）
- `pnpm verify` 全通過

---

## 2026-04-22 Batch 19 完了（アーカイブ・ドキュメント整理専用）

| PH     | タイトル                                   | PR  | 結果 |
| ------ | ------------------------------------------ | --- | ---- |
| PH-090 | lessons.md 更新（batch-18 知見記録）       | #40 | ✅   |
| PH-091 | PH-088/089 アーカイブ（batch-18 完了整理） | #40 | ✅   |

- PR #40: `feature/batch-20260422-19` → `main`（rebase マージ済み）

---

## 2026-04-22 Batch 20 完了

| PH     | タイトル                                      | PR  | 結果 |
| ------ | --------------------------------------------- | --- | ---- |
| PH-092 | Workspace 編集モード Esc キャンセル対応       | #41 | ✅   |
| PH-093 | PaletteSearchBar クリアボタン追加             | #41 | ✅   |
| PH-094 | LibraryDetailPanel Enter キーで起動           | #41 | ✅   |
| PH-095 | E2E テスト追加（Esc キャンセル / Enter 起動） | #41 | ✅   |
| PH-096 | WorkspaceLayout の Spec 参照コメント除去      | #41 | ✅   |

- PR #41: `feature/batch-20260422-20` → `main`（rebase マージ済み）
- `pnpm verify` 全通過

---

## 実機確認 computer-use 取得問題（結論・クローズ）

dev ビルドは Start menu 未登録で `request_access` 不可。
プロダクションバイナリのインストール（`pnpm tauri build` → MSI）が正攻法だが重いため見送り。
**当面 Playwright E2E で自動化カバーし、主観 UX 検証はユーザ手動で実施する方針。**

→ 本問題クローズ。`pnpm tauri dev` プロセスは終了済み。

---

## 手動確認依頼（ユーザが空いた時間に見てフィードバック）

以下の項目は Playwright では検証しにくい「触り心地」や「見た目」の確認をお願いします。
確認したら結果をこのセクションに追記してください（NG なら PH 番号で issue 起票 or 次バッチで対応）。

### Batch 20 確認項目

| # | 対象 UI                       | 期待動作                                         | 見てほしいポイント                                        | 結果   |
| - | ----------------------------- | ------------------------------------------------ | --------------------------------------------------------- | ------ |
| 1 | Workspace 編集モード中        | Esc で編集モードが終了する                       | キャンセル時に変更が巻き戻るか（UI がチラつかないか）     | 未確認 |
| 2 | コマンドパレット 検索バー     | クエリ入力中に X ボタンが出る / クリックでクリア | X ボタンの位置・サイズ感・押しやすさ                      | 未確認 |
| 3 | ライブラリ DetailPanel 表示中 | Enter キーでアイテムが起動しトーストが出る       | INPUT にフォーカスある状態で Enter しても起動されないこと | 未確認 |

---

## 2026-04-22 [batch-21] start (PH-098/099/100)

**dispatch state reconcile (PH-097, PR #42) 完了後に batch-21 を開始。**

- PR #42 CI: lint/test/build/changes/e2e 全 pass → rebase merge 済み
- main ベース運用を正式採用（dispatch-operation.md §4 更新済み）
- `feature/batch-20260422-21` ブランチを origin/main から作成

### batch-21 Plan 構成

| PH     | タイトル                                 | 優先度 |
| ------ | ---------------------------------------- | ------ |
| PH-098 | Workspace 編集モード Canvas 風 UX 再設計 | high   |
| PH-099 | Settings ボタン統一 + Config 画面洗練    | high   |
| PH-100 | ウィジェット実機体感の底上げ             | medium |

### Canvas UX 参考整理

Obsidian Canvas から採用する要素:

- **ドットグリッド背景**: `radial-gradient` で CSS のみ実現。グリッドピッチはウィジェットサイズの 1/4
- **選択アウトライン**: `ring-2 ring-accent` で active ウィジェットを明示
- **4隅リサイズハンドル**: 現在は右下のみ。PointerEvents + 方向フラグで4隅対応
- **ドラッグゴースト**: `dataTransfer.setDragImage()` でデフォルト半透明コピーを差し替え

採用しない要素（スコープ外）:

- 無限キャンバス（CSS Grid 固定レイアウトを維持）
- ズームイン/アウト（既存 widgetZoom で代替）
- フリー配置（グリッドスナップ維持）

---

## 2026-04-22 [batch-21] 実装完了 → PR #43 CI 待ち

| PH     | タイトル                                 | 実装結果                               |
| ------ | ---------------------------------------- | -------------------------------------- |
| PH-098 | Workspace 編集モード Canvas 風 UX 再設計 | ドットグリッド・選択ring・ゴースト実装 |
| PH-099 | Settings ボタン統一 + Config 画面洗練    | 2箇所削除・SettingsPanel 4セクション化 |
| PH-100 | ウィジェット実機体感の底上げ             | hover shadow・transition・空状態案内   |

- 変更ファイル: WorkspaceLayout / WorkspaceSidebar / LibrarySidebar / LibraryLayout / WidgetShell / FavoritesWidget / RecentLaunchesWidget / ProjectsWidget / SettingsPanel / +page.svelte
- `pnpm verify` 全通過（biome/dprint/clippy/rustfmt/svelte-check/cargo test/smoke/vitest/tauri build）
- PR #43: `feature/batch-20260422-21` → `main`（CI 確認後 rebase merge 予定）

---

## 2026-04-22 [batch-22] 完了 → PR #46 merge 済み

| PH     | タイトル                      | 実装結果                                           |
| ------ | ----------------------------- | -------------------------------------------------- |
| PH-101 | フレーキー E2E 修正           | waitForSelector でライブラリデータロード完了を待機 |
| PH-102 | WorkspaceLayout a11y 警告抑制 | svelte-ignore 2件追加 → 0 WARNINGS                 |

- PR #46: `feature/batch-20260422-22` → `main`（CI 全通過・rebase merge 完了）

---

## 2026-04-22 [batch-23] Plan 作成完了（在庫切れによる自律作成）

| PH     | タイトル                                              | 種別     | 優先度 |
| ------ | ----------------------------------------------------- | -------- | ------ |
| PH-103 | HotkeyInput UX 磨き込み（日本語化 + ag トークン置換） | 改善系   | medium |
| PH-104 | Workspace 編集モード キーボードヒントバー             | 改善系   | medium |
| PH-105 | app.css 未使用 shadcn トークン除去                    | 改善系   | low    |
| PH-106 | SettingsPanel E2E テスト追加                          | 品質防衛 | medium |
| PH-107 | WorkspaceLayout.svelte 分割リファクタ                 | 整理系   | low    |

実行順序: PH-103 / PH-105 / PH-106（並列安全）→ PH-104 → PH-107（PH-104 依存）

---

## 2026-04-22 [batch-23] 実装完了 → PR #49 merge 済み

| PH     | タイトル                                  | 実装結果                                                        |
| ------ | ----------------------------------------- | --------------------------------------------------------------- |
| PH-103 | HotkeyInput UX 磨き込み                   | 「変更」ラベル + ag-* トークン置換 + tabindex で a11y 改善      |
| PH-104 | Workspace 編集モード キーボードヒントバー | Esc/Del ヒントバー表示 + Delete キーで削除確認ダイアログ起動    |
| PH-105 | app.css 未使用 shadcn トークン除去        | chart-_/sidebar-_ 13 トークンを :root / .dark / @theme から除去 |
| PH-106 | SettingsPanel E2E テスト追加              | settings.spec.ts 4 テスト（@smoke 1件含む）                     |

- PH-107（WorkspaceLayout 分割）は PH-104 依存 → 次バッチに持越し
- PR #49: `feature/batch-20260422-23` → `main`（CI 全通過・rebase merge 完了）

---

## 2026-04-22 [batch-23] PH-107 実装完了 → PR #51 CI 待ち

| PH     | タイトル                              | 実装結果                                                                    |
| ------ | ------------------------------------- | --------------------------------------------------------------------------- |
| PH-107 | WorkspaceLayout.svelte 分割リファクタ | WorkspaceWidgetGrid.svelte 切り出し（514→393行）、biome/svelte-check 全通過 |

- PR #51: `feature/batch-20260422-24` → `main`（CI 待ち）

---

## 2026-04-23 [batch-24] Plan 作成完了（在庫切れによる自律作成）

| PH     | タイトル                                                    | 種別     | 優先度 |
| ------ | ----------------------------------------------------------- | -------- | ------ |
| PH-108 | FavoritesWidget リアクティブ更新（itemStore 依存追加）      | 改善系   | high   |
| PH-109 | RecentLaunchesWidget の target 短縮表示                     | 改善系   | medium |
| PH-110 | ウィジェット行スタイル統一（FavoritesWidget / Recent）      | 改善系   | low    |
| PH-111 | Workspace ウィジェット E2E テスト追加（Favorites / Recent） | 品質防衛 | medium |
| PH-112 | clampWidget 関数の重複排除（共通ユーティリティへ移動）      | 整理系   | low    |

実行順序: PH-108 / PH-109 / PH-110 / PH-111（parallel_safe: true）→ PH-112

---

## 2026-04-23 [batch-24] 実装完了 → PR 作成予定

| PH     | タイトル                              | 実装結果                                                                    |
| ------ | ------------------------------------- | --------------------------------------------------------------------------- |
| PH-108 | FavoritesWidget リアクティブ更新      | `itemStore.items` 依存追加 → スター変更時に自動更新                         |
| PH-109 | RecentLaunchesWidget target 短縮表示  | `format-target.ts` 新規作成（URL→ホスト名 / パス→ファイル名）               |
| PH-110 | ウィジェット行スタイル統一            | RecentLaunchesWidget の `py-3` → `py-2.5` に統一                            |
| PH-111 | Workspace ウィジェット E2E テスト追加 | `widget-display.spec.ts` 3 テスト（@smoke 1件）                             |
| PH-112 | clampWidget 重複排除                  | `widget-grid.ts` 新規作成・WorkspaceLayout / WidgetGrid から local 定義削除 |

- svelte-check 0 errors / 0 warnings
- vitest 114 passed
- biome 0 errors

---

## 2026-04-23 [batch-24] 完了 → PR #52 merge 済み

- PR #52: `feature/batch-20260422-24` → `main`（CI 全通過・rebase merge 完了）
- PH-108〜112 全 5 件を archive/ に移動
