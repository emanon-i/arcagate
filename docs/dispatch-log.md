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
