# IPC Bridge

> cross-cutting / 詳細は [`../../foundation.md`](../../foundation.md) §4

## 目的

frontend (SvelteKit) と backend (Rust) を繋ぐ Tauri IPC 境界。全 IPC が `commands → services → repositories` のレイヤーを経由する単一経路。

## やること (必要処理)

- 要求/応答は `invoke` (Tauri command)、push/stream は `event`
- frontend は `invoke` を直接呼ばず `src/lib/ipc/<area>.ts` の typed wrapper を経由
- IPC 型は `ts-rs` で Rust struct → TS 型を自動生成 (`src/lib/bindings/`)
- error は `AppError` を `{ code, message }` で serialize して frontend へ
- backend → frontend の event: `tauri://drag-drop` / `hotkey-triggered` / `folder://new-directory` / `item://path-not-found` 等

## やらないこと (禁止 / scope 外)

- `src/lib/bindings/` を手書きしない (ts-rs 自動生成)
- command 層にビジネスロジックを書かない (thin。引数 parse + service 呼出のみ)
- command が repository を直呼びしない (必ず service 経由)
- repository 同士を相互参照しない
- IPC payload を 10KB 超で渡さない (超えるなら分割 or file-based)
- main thread の IPC handler で `unwrap()` / `expect()` をしない
- error を `let _ = result;` で握り潰さない
- toast に英語 stack trace を出さない (日本語の error message)

## 性能予算

- 入力 → 視覚反応 < 100ms
- backend 処理が > 50ms 見込みなら frontend は非同期 + loading UI
- 1 invoke が > 1s 見込みなら progress event に分割
- 重い OS 呼び出し (PowerShell / Shell API / 大画像 decode) は `spawn_blocking` で逃がす
- list 表示で per-row $effect から IPC を呼ばない (store で 1 回 batch fetch + cache)

## 副作用 (state 変化 / persistence)

- IPC 自体は副作用を持たない。実体は各 service の責務

## 依存

- Tauri v2 custom protocol、`ts-rs`
- 依存される: 全 frontend feature / 全 backend service

## 既知の判断

- frontend state は Svelte 5 runes の class-based singleton (`.svelte.ts`)
- DB lock 失敗は自動 3 回 retry + exponential backoff、最終失敗で toast
