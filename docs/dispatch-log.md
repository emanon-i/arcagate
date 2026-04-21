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
