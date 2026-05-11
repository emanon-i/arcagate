# コードメトリクスレポート

作成日: 2026-04-25 / batch-59 PH-252

## ファイル規模サマリー

### フロントエンド (TypeScript / Svelte)

| カテゴリ                  | ファイル数 | 備考 |
| ------------------------- | ---------- | ---- |
| .svelte コンポーネント    | 74         |      |
| .svelte.ts state          | 9          |      |
| .ts (IPC / utils / types) | 43         |      |
| テスト (.test.ts)         | 13         |      |
| **合計**                  | **139**    |      |

### バックエンド (Rust)

| カテゴリ     | ファイル数 | 備考                    |
| ------------ | ---------- | ----------------------- |
| commands     | 8          | cmd_* 58 関数           |
| services     | 7          | ビジネスロジック        |
| repositories | 8          | データアクセス          |
| models       | 8          | ドメインモデル          |
| utils        | 4          | エラー / Git / アイコン |
| watcher      | 2          | ファイル監視            |
| db           | 2          | 接続 / マイグレーション |
| **合計**     | **~45**    | テスト含む              |

## テスト数

| 種別            | テスト数        |
| --------------- | --------------- |
| Rust unit tests | 172（150 + 22） |
| vitest          | ~130            |
| Playwright E2E  | 28+             |

## Rust 未使用依存チェック（手動確認）

`Cargo.toml` の全依存は使用確認済み（`cargo tree --depth 1` 結果と実コードのマッチング）:

| クレート               | 使用箇所                     |
| ---------------------- | ---------------------------- |
| `clap`                 | `arcagate_cli.rs`            |
| `log`                  | 各 service / watcher         |
| `notify`               | `watcher/mod.rs`             |
| `rusqlite`             | `repositories/*`             |
| `rusqlite_migration`   | `db/migrations.rs`           |
| `serde` / `serde_json` | models + CSS vars パース     |
| `tauri`                | `lib.rs` + commands          |
| `thiserror`            | `utils/error.rs`             |
| `uuid`                 | `services/*` UUID v7 生成    |
| `zip`                  | `services/export_service.rs` |

**未使用クレートなし** ✅

## TS 未使用エクスポート（暫定）

`pnpm dlx knip` は未実行。手動確認で未使用と思われる関数:

- なし（全エクスポートはコンポーネントまたはテストから参照）

## 複雑度観察

大型ファイル上位（333 行 / 310 行 / 279 行）は機能的に密で正当な複雑度。
Cyclomatic Complexity の詳細計測は次フェーズで実施。
