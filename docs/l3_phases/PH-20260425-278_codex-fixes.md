---
id: PH-20260425-278
status: done
batch: 64
type: バグ修正
---

# PH-278: Codex レビュー採用指摘修正（Critical/High 6件）

## 参照した規約

- `docs/l2_architecture/codex-review-2026-04-25.md`: Rust-1/2/3/4/5/6 採用分

## 背景・目的

batch-63 の Codex レビューで採用した Critical/High 指摘を修正する。データ損失・Windows パス破壊・DB 状態不整合が含まれる。

## 作業内容

### Rust-1: export_service.rs — import_json の rollback 追加（Critical）

```rust
// 現状: BEGIN/COMMIT を手動管理、? 伝搬で rollback なし
// 修正: rusqlite::Transaction を使う
let tx = conn.transaction()?;
// ... insert 処理 ...
tx.commit()?;
```

`src-tauri/src/services/export_service.rs` の `import_json` 関数全体をトランザクション化。

### Rust-2: export_service.rs — import SQL に is_tracked / default_app 追加（High）

L96 付近の INSERT/REPLACE SQL に 2 カラムを追加する。export 時の `SELECT` と対称にする。

### Rust-3/4: launcher + launch_service — スペース入りパス対応（High）

`src-tauri/src/launcher/mod.rs`:

- `split_whitespace()` を削除し、args を構造化された `Vec<String>` で受け取るように変更
- `Command::new(program).args(args)` に統一

`src-tauri/src/services/launch_service.rs`:

- `format!("-d {path}")` → `vec!["-d".to_string(), path.to_string()]` に変更
- 対応する IPC 型も `args: Vec<String>` に変更

影響範囲: `commands/` の対応 IPC コマンド + フロント側の呼び出し（型更新）

### Rust-5/6: watched_path_service.rs — DB/watcher 状態不整合修正（Medium）

L30-L33: watch 登録を DB 書き込み前に行い、失敗時は DB を書かない（または rollback）

L53-L57: `unwatch()` の Result を適切に処理し、失敗時はログ + 補償

## 成果物

- `src-tauri/src/services/export_service.rs` 修正（transaction + カラム追加）
- `src-tauri/src/launcher/mod.rs` 修正（args 構造化）
- `src-tauri/src/services/launch_service.rs` 修正（args 構造化）
- `src-tauri/src/services/watched_path_service.rs` 修正（DB/watcher 順序）
- 対応する cargo test 更新

## 受け入れ条件

- [ ] 既存の import/export cargo test が全通過
- [ ] スペース入りパスのアイテムを launch しても壊れない（実機確認）
- [ ] watched_path の add/remove で watcher 状態が DB と一致する
- [ ] `pnpm verify` 全通過（cargo test + tauri build 含む）
