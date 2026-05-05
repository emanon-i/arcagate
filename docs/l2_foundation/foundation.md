---
status: live
---

# Arcagate システム構成 (overview)

> Tri-SSD canonical L2。`/gen-l3` `/gen-code` が読む single source of truth (path 固定)。
> 200 行制約のため詳細を partner file に分離。本書は overview + index。

## Sections

| §       | 内容                                                        | partner file                                                               |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1       | 技術スタック (Tauri / Rust / SvelteKit / Svelte 5 / SQLite) | [foundation-stack.md](./foundation-stack.md)                               |
| 2       | アーキテクチャ overview (コンポーネント構成図)              | [foundation-architecture.md](./foundation-architecture.md)                 |
| 2.2     | ディレクトリ構成                                            | [foundation-dirs.md](./foundation-dirs.md)                                 |
| 2.3-2.5 | Service Layer / Plugin Interface / Tauri IPC                | [foundation-architecture-service.md](./foundation-architecture-service.md) |
| 2.6-2.9 | State / rusqlite / Error / Password                         | [foundation-architecture-state.md](./foundation-architecture-state.md)     |
| 3       | 非機能要求                                                  | [foundation-non-functional.md](./foundation-non-functional.md)             |
| 4       | SQLite スキーマ                                             | [foundation-schema.md](./foundation-schema.md)                             |
| 5       | CI/CD                                                       | [foundation-cicd.md](./foundation-cicd.md)                                 |
| 6       | 用語集                                                      | [foundation-glossary.md](./foundation-glossary.md)                         |

## stack 要約

- **Frontend**: SvelteKit + Svelte 5 runes ($state / $derived / $effect / $props)、TypeScript、Tailwind v4、shadcn-svelte
- **Backend**: Rust (Tauri v2)、`Arc<Mutex<Connection>>` (no pool)、`rusqlite` 直生 SQL (no ORM)、UUID v7
- **DB**: SQLite + WAL、`include_str!` で migration 埋め込み、forward-only (rollback 不採用)
- **Distribution**: GH Releases + minisign Tier 1 (updater) + cosign keyless Tier 2 (attestation)
- **Test**: vitest (FE)、cargo test (BE)、Playwright @smoke + nightly @perf

## architecture 要約

- レイヤー: `commands → services → repositories → DB` (逆禁止)
- Service Layer が **全 IPC エントリーポイントの共通経路**、Repository を直呼びしない
- `AppError { code, message }` を Serialize して frontend へ
- 1 process / 1 webview window (palette は別 webview)、Tauri IPC は msgpack 互換 JSON

## エラーハンドリング要約

- BE: `Result<T, AppError>`、IPC で `{ code, message }` serialize
- FE: `formatIpcError` / `getErrorMessage` で structured 判定 (string contains 禁止)
- panic_hook: APPDATA/last-panic.json に redact 後書込、起動時に `cmd_consume_last_panic` で toast (R10-D)
- silent fail: `installErrorMonitor` で `unhandledrejection` / `error` を `toastStore` 通知 (R4-A)

## DB 要約

- 22 migration (`src-tauri/migrations/NNN_*.sql`)、forward-only
- Tag system (sys-starred / sys-ws-{wsId} / etc.) で item を多軸分類
- launch_log + item_stats でアクセス頻度 / frecency 計測 (R9-A)
- icon_cache table で path-based dedup (R9-B、Lessons C-2 派生対処)

## CI/CD 要約

- `.github/workflows/ci.yml`: biome / dprint / clippy / rustfmt / svelte-check / cargo test / vitest / lefthook audits
- `.github/workflows/e2e-nightly.yml`: full Playwright + perf-D7/D8/D9 + memory soak + axe + startup P95
- `.github/workflows/release.yml`: tag push で Tauri build + tauri signer (Tier 1) + cosign sign-blob (Tier 2)
- branch protection: check + build + e2e + changes 必須

## 詳細

各 § の詳細は上記 partner file 参照。
