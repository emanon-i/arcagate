---
id: PH-20260425-258
status: todo
batch: 60
type: 整理
---

# PH-258: watcher/mod.rs サービス層経由化

## 背景・目的

`watcher/mod.rs` は `item_repository`, `watched_path_repository` を直接参照している
（module-graph.md C-1）。アーキテクチャ上は `services/` を経由すべきだが、
`watcher` が `services` を呼ぶと循環依存の懸念がある。
本 Plan で循環依存が発生しないか検証し、安全なら移行する。

## 実装ステップ

### Step 1: 依存関係調査

`src-tauri/src/watcher/mod.rs` の repository 参照箇所を全列挙。
現状の呼び出し内容（何を読み書きするか）を確認。

### Step 2: 循環依存チェック

`services/` が `watcher/` を参照しているか確認。
循環依存が発生する場合は「サービス層経由化は不可」として本 Plan を
docs 更新のみに切り替える（C-1 凍結扱い）。

### Step 3a: 循環なしの場合 — サービス層経由化

- `watched_path_service` または既存 service に watcher 向けメソッドを追加
- `watcher/mod.rs` の repository 直接呼び出しを service 経由に変更
- `cargo test` 全通過確認

### Step 3b: 循環ありの場合 — docs 更新

- `refactoring-opportunities.md` の C-1 を「循環依存のため凍結」に更新
- `module-graph.md` の watcher セクションにコメント追加

### Step 4: pnpm verify

## 受け入れ条件

- [ ] 循環依存の有無が明確になる
- [ ] 循環なし: `watcher/mod.rs` が repository を直接参照しなくなる
- [ ] 循環あり: `refactoring-opportunities.md` が更新される
- [ ] `pnpm verify` 全通過（Rust 172テスト以上）
