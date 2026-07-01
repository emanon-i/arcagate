---
paths:
  - "src-tauri/**"
---

# Backend (Rust) rules

全体構造は [foundation.md](../../docs/l2_foundation/foundation.md) を参照。

## アーキテクチャ (変えない固定枠)

- レイヤーは一方向 `commands → services → repositories → DB` にする。逆方向の参照を書かない
- IPC のエントリーポイントは Service 層の 1 経路にする。Command から Repository を直呼びしない
- Repository 間で相互参照しない。複数 Repository の組み合わせは Service 層で行う
- DB 接続は `Mutex<Connection>` + WAL を使う (Connection Pool を導入しない)
- ID は UUID v7 を使う
- migration は `include_str!` でバイナリ埋込・forward-only にする。rollback を書かず fix forward で直す
- error は `thiserror` + `AppError` で表す。`anyhow` を使わない
- `AppError` は `{ code, message }` で serialize する。フロントは `code` で分岐する (`message` の文字列一致で判定しない)

## 禁止

- ORM (diesel / sqlx / sea-orm) を導入しない。rusqlite + 生 SQL を使う

## schema / 実装値の正本

- DB schema・関数シグネチャ・PRAGMA tuning 値の正本は **コード** (`src-tauri/migrations/*.sql` / 各 service) にする
- doc には設計判断 (FK / CASCADE / index 戦略 / 派生方式 / 非機能予算) を書き、生値を再掲しない
