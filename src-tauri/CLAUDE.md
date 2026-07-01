# src-tauri (Rust backend) — 局所地図

Rust backend を触る前の道しるべ。中身はコピーせず正本 doc へ導く (SSOT)。

- **設計の固定枠・禁止事項** (レイヤー `commands → services → repositories → DB` / DB は `Mutex<Connection>`+WAL /
  UUID v7 / `include_str!` migration / `AppError {code,message}` / ORM 不使用): [`../.claude/rules/backend.md`](../.claude/rules/backend.md)
- **アーキ全体 / IPC 境界 / state / error 伝播 / schema 設計**: [`../docs/l2_foundation/foundation.md`](../docs/l2_foundation/foundation.md)
- **各 service の機能契約** (やること / やらないこと / 性能予算 / 副作用): [`../docs/l2_foundation/features/backend/`](../docs/l2_foundation/features/backend/)
- **横断契約** (persistence / security / 権限分離 / IPC bridge / startup-perf): [`../docs/l2_foundation/features/cross-cutting/`](../docs/l2_foundation/features/cross-cutting/)
- schema の正本はコード (`migrations/*.sql`)。doc には設計判断のみ
- 全体の地図: [`../AGENTS.md`](../AGENTS.md)
