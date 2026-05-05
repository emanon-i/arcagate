# 依存品質レポート

計測日: 2026-04-25 / batch-63 (PH-273)

## セキュリティ脆弱性（pnpm audit）

### 本番依存（--prod）

```
No known vulnerabilities found
```

**本番コードへの脆弱性ゼロ。** 唯一の runtime dep (`@tauri-apps/plugin-fs`) に問題なし。

### 全依存（devDependencies 含む）

17 件の脆弱性（2 low / 8 moderate / 7 high）

主要パッケージ:

| パッケージ | 深刻度   | 件数 | 依存経路             | 対応方針      |
| ---------- | -------- | ---- | -------------------- | ------------- |
| undici     | high     | 5    | jsdom（vitest 依存） | devOnly, 監視 |
| picomatch  | high     | 1    | vitest 依存          | devOnly, 監視 |
| devalue    | moderate | 1    | @sveltejs/kit        | devOnly, 監視 |

**判断**: すべて devDependency 経由。本番バイナリ・フロントバンドルには含まれない。
CI / ビルド環境でのみ影響を受けるため、即対応不要。`pnpm update` で解消できるものは次回メンテ時に対応。

### Rust（cargo audit）

`cargo-audit` 未インストール（batch-64 以降で cargo-deny の導入を検討）。
`cargo tree --duplicates` で重複クレート確認:

- **bitflags v1.3.2 + v2.x**: Tauri エコシステムが旧版を transitively 要求。正常。
- セキュリティ既知脆弱性: 未確認（cargo-deny 導入後に体系的チェック）

## 未使用 Export（knip v6.6.3）

### 未使用ファイル（15件）

| カテゴリ                                | ファイル                                                       | 対応方針                 |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| shadcn scaffold（未使用コンポーネント） | `ui/input/`, `ui/scroll-area/`, `ui/separator/`, `ui/tooltip/` | 将来利用予定 → 保留      |
| ドキュメント                            | `docs/l0_ideas/arcagate_mockup_board.jsx`                      | 削除候補（次整理バッチ） |
| バレルエクスポート                      | `src/lib/types/index.ts`                                       | 削除候補                 |

### 未使用依存（knip 判定）

| パッケージ                | 実際の用途             | 判定     |
| ------------------------- | ---------------------- | -------- |
| `@tauri-apps/plugin-fs`   | Rust 側 plugin 使用    | 誤検知   |
| `@testing-library/svelte` | vitest 設定で参照      | 再確認要 |
| `lefthook`                | pre-commit hook ツール | 誤検知   |

### 未使用 export（削除候補）

| ファイル / export                                         | 判定     |
| --------------------------------------------------------- | -------- |
| `ipc/export.ts`: exportJson, importJson                   | 削除候補 |
| `ipc/items.ts`: updateTagPrefix                           | 削除候補 |
| `ipc/theme.ts`: getTheme                                  | 削除候補 |
| `ipc/watched_paths.ts`: addWatchedPath, removeWatchedPath | 削除候補 |
| `types/workspace.ts`: WIDGET_LABELS                       | 削除候補 |

shadcn scaffold の `ui/dropdown-menu/index.ts` 多数 export は誤検知（Svelte ファイルから import）。

### 未使用 export type（削除候補）

| 型                                 | 判定                                |
| ---------------------------------- | ----------------------------------- |
| `types/widget-configs.ts` の全型   | 外部 import なし → 削除または内部化 |
| `state/config.svelte.ts`: ItemSize | 削除候補                            |
| `types/item.ts`: DefaultApp        | 削除候補                            |

## 重複パッケージ（npm）

```
pnpm ls --depth=0
```

重複バージョン: なし（pnpm による厳密な dedupe が機能）

## Rust 重複クレート

`bitflags v1.3.2` と `bitflags v2.x` が共存。
→ Tauri + 旧クレート（png, ico, tauri-codegen 経由）。解消はアップストリーム依存。

## 要対応事項（優先度付き）

| 優先度 | 内容                                       | バッチ    |
| ------ | ------------------------------------------ | --------- |
| 低     | 未使用 IPC export 6件の削除                | batch-64  |
| 低     | `types/index.ts` バレル削除                | batch-64  |
| 低     | `arcagate_mockup_board.jsx` 削除           | batch-64  |
| 低     | `@testing-library/svelte` 誤検知を確認     | batch-64  |
| 中     | cargo-deny 導入（Rust セキュリティ体系化） | batch-65+ |
| 中     | pnpm update で devDep 脆弱性解消           | batch-65+ |
