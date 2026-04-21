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

## 2026-04-22 Plan 候補メモ（次セッション用）

ディスパッチ中に気づいた観点。**新規 Plan ファイルは作成しない**（ユーザが作る）。

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

## 2026-04-22 PH-20260422-004 事前コード調査結果

- FavoritesWidget / RecentLaunchesWidget / ProjectsWidget: `onItemContext` prop 実装済み → 右クリックで `handleItemContext` 呼び出し
- `WorkspaceLayout.svelte:378-382`: `contextItemId` が非 null のとき `LibraryDetailPanel` を描画
  - `onClose={() => { contextItemId = null; }}` で閉じる → ボタン close は OK
- `LibraryDetailPanel.svelte`: **Esc キーハンドラなし**（`svelte:window`/`on:keydown` の記述なし）
- Plan 004 の修正箇所: `LibraryDetailPanel.svelte` に `svelte:window onkeydown={e => e.key==='Escape' && onClose?.()}` を追加するだけ

**残タスク**: 実機起動での詳細パネルが Library と同じか目視確認 + Esc 追加
