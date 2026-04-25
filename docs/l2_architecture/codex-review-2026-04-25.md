# Codex Review — 2026-04-25

計測日: 2026-04-25
ツール: Codex CLI v0.125.0 (gpt-5.3-codex, reasoning_effort=medium)
スコープ: `src-tauri/src/` + `src/lib/`
目的: アーキテクチャ棚卸しフェーズ（batch-63）に続く外部セカンドオピニオン

---

## フィルタリング方針

engineering-principles.md §7「リファクタ発動条件」と §8「新規機能ゲート」に照らして取捨選択。
個人アプリの現スコープで過剰設計になる指摘は「却下」扱い。

---

## Rust バックエンド（src-tauri/src/）

### Critical

**1. export_service.rs: import_json に rollback なし**（L83, L126）

- 手動 BEGIN/COMMIT だが中断時に rollback 経路がない。部分インポートで DB が汚染される
- 修正: `rusqlite::Transaction` を使い drop 時に自動 rollback
- **→ 採用（data integrity の根本問題）**

### High

**2. export_service.rs: import SQL が is_tracked / default_app を省略**（L96）

- export は完全な Item を使うが import SQL でカラム落としており、restore でサイレントに欠損する
- 修正: INSERT/REPLACE に `is_tracked`, `default_app` を追加
- **→ 採用（データ損失バグ）**

**3. launcher/mod.rs: split_whitespace() でスペース入りパスが壊れる**（L26, L73, L81, L89, L105）

- Windows パス（`C:\My Projects\...`）でコマンド解釈が破綻する
- 修正: 構造化された引数配列に変更、または Windows 流の引数パーサーを使う
- **→ 採用（Windows で頻発するバグ）**

**4. launch_service.rs: terminal launch が "-d {path}" を1文字列で渡す**（L55）

- downstream の split がスペース入りパスで壊れる (#3 と同根)
- 修正: `["-d", path]` のように別トークンで渡す
- **→ 採用（#3 と一緒に修正）**

### Medium

**5. watched_path_service.rs: DB 先行書き込み後に watch() 失敗でも成功を返す**（L30, L33）

- DB は active だが実際の watch が走っていない不整合状態になる
- 修正: watch 登録を先に行い、失敗時は DB rollback / is_active=0 にして error を返す
- **→ 採用（silent failure は本来の設計目的に反する）**

**6. watched_path_service.rs: remove で DB 先削除、unwatch() エラーを無視**（L53, L57）

- watcher の実行状態と DB 状態が乖離する
- 修正: unwatch() エラーをログ + 補償（or 逆操作）
- **→ 採用（#5 と同根）**

**7. item_repository.rs / workspace_repository.rs: 不明 enum をデフォルトにサイレントコーション**（L8, L20）

- DB スキーマ破損やマイグレーション漏れを隠蔽する
- 修正: 不明文字列は明示的 error を返す
- **→ 後回し（個人アプリで現時点では問題発生確率低、batch-65+ 候補）**

**8. workspace_service.rs: workspace CRUD とシステムタグ更新が非トランザクション**（L34, L47, L95, L99）

- 部分失敗でタグ孤立が起きる
- 修正: workspace + system-tag の変更を単一トランザクションで包む
- **→ 後回し（発生確率は低い、batch-65+ 候補）**

**9. launch_service.rs: 起動後の stats 更新失敗をサイレントスワロー**（L42）

- analytics の不整合は機能に影響しない。`let _ = ...` は許容範囲
- **→ 却下（個人アプリの analytics は non-critical）**

### Low

**10. watcher/traits.rs: FileEvent / FileWatcher が未使用の死コード**（L5, L11）

- 修正: 削除か実装への紐付け
- **→ 後回し（batch-65+ 候補、knip で既に検出済み）**

---

## フロントエンド（src/lib/）

### High

**1. workspace.svelte: selectWorkspace/loadWidgets に stale response ガードなし**（L112）

- 高速切替で古い IPC 応答が新しいワークスペースの state を上書きする
- 修正: monotonic request token または workspace ID snapshot でガード
- **→ 採用（UX 破損、設定即時反映問題の根本の1つ）**

**2. palette.svelte: search() に stale response ガードなし**（L92）

- デバウンスはあるが古い検索結果が新しい結果を上書きする
- 修正: request シーケンス番号 + 最新のみ commit
- **→ 採用**

**3. ProjectsWidget.svelte: 複数 IPC に try/catch なし、部分失敗で state 不整合**（L57）

- gitStatuses は更新されても folderItems が stale のまま残るケースがある
- 修正: 各 async フローを try/catch で包み、error は toast/store へ
- **→ 採用（ウィジェット UX 修正バッチと一体で対処）**

**4. items.svelte: loading フラグ競合（単一 boolean で並行操作を管理）**（L10）

- 並行ロード中の1件完了で loading=false になり他が実行中でも spinner が消える
- 修正: in-flight counter (`pending++/--`) または操作別 loading フラグ
- **→ 後回し（視覚的な minor issue、batch-65+ 候補）**

### Medium

**5. WorkspaceLayout.svelte: doRestoreSnapshot が IPC エラーを未処理**（L113）

- 修正: try/catch + rollback
- **→ 後回し（restore 操作は低頻度）**

**6. LibraryDetailPanel.svelte: タグ fetch に stale response ガードなし**（L29）

- 高速選択切替で前アイテムのタグが表示される
- 修正: request sequence/cancel guard
- **→ 採用（ユーザーが直接触る UX）**

**7. FavoritesWidget / RecentLaunchesWidget / StatsWidget: .then() に .catch() なし**（L27 等）

- IPC エラーが unhandled promise rejection になる
- 修正: try/catch + error path の標準化
- **→ 採用（ウィジェット UX 修正バッチと一体で対処）**

**8. widget-config.ts: persisted JSON のランタイム型検証なし**（L11）

- 不正な型が計算に使われる可能性（git_poll_interval_sec が string になる等）
- 修正: zod 等でスキーマ検証 or 手動 guard
- **→ 後回し（現状は問題発生確率低）**

### Low

**9. workspace.ts: WidgetType に 'watched_folders' があるが render コンポーネントなし**（L5）

- contract 不整合
- 修正: type から削除 or コンポーネント実装
- **→ 採用（batch-64 ウィジェット UX 整理の中で対処）**

---

## 採用サマリー（batch-64 対象）

| #        | スコープ                  | 問題                        | 優先度   |
| -------- | ------------------------- | --------------------------- | -------- |
| Rust-1   | export_service            | import rollback なし        | Critical |
| Rust-2   | export_service            | is_tracked/default_app 欠落 | High     |
| Rust-3,4 | launcher + launch_service | スペース入りパス破壊        | High     |
| Rust-5,6 | watched_path_service      | DB/watcher 状態不整合       | Medium   |
| FE-1     | workspace.svelte          | stale response (workspace)  | High     |
| FE-2     | palette.svelte            | stale response (search)     | High     |
| FE-3,7   | Widget群                  | IPC エラー未処理            | High     |
| FE-6     | LibraryDetailPanel        | stale response (タグ)       | Medium   |
| FE-9     | workspace.ts              | WidgetType 不整合           | Low      |

## 却下サマリー（記録）

| #                              | 却下理由                               |
| ------------------------------ | -------------------------------------- |
| Rust-9（launch stats swallow） | 個人アプリの analytics は non-critical |
| Rust-7（enum コーション）      | 現時点で問題発生確率低、batch-65+ 送り |
| Rust-8（workspace TX）         | 発生確率低、batch-65+ 送り             |
| Rust-10（dead code traits）    | knip 検出済み、batch-65+ 送り          |
| FE-4（loading boolean）        | minor visual issue、batch-65+ 送り     |
| FE-5（restore snapshot）       | 操作低頻度、batch-65+ 送り             |
| FE-8（widget config 型検証）   | 現状問題発生確率低                     |
