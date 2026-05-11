# 複雑度ベースライン

計測日: 2026-04-25 / batch-63 (PH-272)
ツール: tokei v14.0.0 / madge (batch-59 実績)

## 言語別 LoC（tokei）

対象: `src/` + `src-tauri/src/`

| 言語       | ファイル数 | 総行数     | コード行   | コメント | 空白行    |
| ---------- | ---------- | ---------- | ---------- | -------- | --------- |
| Rust       | 49         | 7,366      | 6,385      | 99       | 882       |
| TypeScript | 56         | 3,740      | 3,103      | 99       | 538       |
| Svelte     | 84         | 3,309      | 3,069      | 80       | 160       |
| CSS        | 2          | 388        | 290        | 52       | 46        |
| **合計**   | **193**    | **17,931** | **15,469** | **458**  | **2,004** |

## ファイル別 LoC top 20（§7 閾値: 500 warning / 1000 refactor）

### Rust（src-tauri/src/）

| ファイル                               | コード行 | 閾値判定   |
| -------------------------------------- | -------- | ---------- |
| `repositories/workspace_repository.rs` | 466      | ⚠️ 500 接近 |
| `services/workspace_service.rs`        | 400      | 監視       |
| `services/theme_service.rs`            | 325      | OK         |
| `lib.rs`                               | 237      | OK         |
| `repositories/theme_repository.rs`     | 194      | OK         |
| `models/workspace.rs`                  | 141      | OK         |

### Svelte コンポーネント（src/lib/components/）

| ファイル                                | 行数 | 閾値判定 |
| --------------------------------------- | ---- | -------- |
| `settings/SettingsPanel.svelte`         | 345  | 監視     |
| `library/LibraryMainArea.svelte`        | 199  | OK       |
| `item/ItemForm.svelte`                  | 183  | OK       |
| `workspace/WorkspaceLayout.svelte`      | 156  | OK       |
| `workspace/WidgetSettingsDialog.svelte` | ~150 | OK       |
| `settings/ThemeEditor.svelte`           | ~140 | OK       |

### TypeScript（src/lib/state/）

| ファイル              | コード行 | 閾値判定 |
| --------------------- | -------- | -------- |
| `workspace.svelte.ts` | 273      | OK       |
| `palette.svelte.ts`   | 209      | OK       |
| `theme.svelte.ts`     | 191      | OK       |
| `items.svelte.ts`     | 154      | OK       |

## §7 閾値超過サマリー

| 閾値          | Rust                                 | TS/Svelte | 対応     |
| ------------- | ------------------------------------ | --------- | -------- |
| 500 warning   | workspace_repository.rs (466) — 接近 | なし      | 監視継続 |
| 1000 refactor | なし                                 | なし      | なし     |

**現状: 閾値超過ゼロ。** `workspace_repository.rs` は 466 行で 500 行の警告閾値に近いため監視継続。

## Fan-out 分析（batch-59 madge 実績）

batch-59 (PH-250) の component-graph.md より:

- fan-out top（当時）: LibraryDetailPanel、WorkspaceLayout、LibraryMainArea
- batch-60 で LibraryDetailPanel・WorkspaceLayout を分割 → 現在は改善済み
- LibraryMainArea は未整理（次の整理系バッチ候補）

§7 閾値（fan-out 15 超 warning）: batch-59 時点では明示的な超過なし。

## Cyclomatic Complexity（Rust clippy）

`cargo clippy -- -W clippy::cognitive_complexity` を実行:

- 現状: 明示的な警告なし（clippy のデフォルト閾値内）

## 閾値確定（§7 LCOM/CBO）

LCOM / CBO の定量計測ツールが未確定のため、次回整理フェーズで選定予定:

- TypeScript: eslint-plugin-sonarjs の sonarjs/cognitive-complexity (設定待ち)
- Rust: clippy::cognitive_complexity (現在有効、超過ゼロ確認済み)

## 次回更新トリガー

- `workspace_repository.rs` が 500 行を超えたら分割検討
- `SettingsPanel.svelte` が成長したら Settings コンポーネントに分割
- 新規大型コンポーネント追加時
