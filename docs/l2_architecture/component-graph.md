# Svelte コンポーネント依存グラフ

作成日: 2026-04-25 / batch-59 PH-250

## ファイル規模

| 種別                      | 件数 |
| ------------------------- | ---- |
| .svelte ファイル          | 74   |
| .ts / .svelte.ts ファイル | 52   |
| 合計                      | 126  |

## LoC 上位 5 コンポーネント

| ファイル                      | 行数 | 備考                                         |
| ----------------------------- | ---- | -------------------------------------------- |
| `LibraryDetailPanel.svelte`   | 333  | アイテム詳細・編集フォーム                   |
| `WorkspaceLayout.svelte`      | 310  | ワークスペース全体レイアウト・ホイールズーム |
| `LibraryMainArea.svelte`      | 279  | ライブラリリスト・DnD 受け入れ               |
| `WorkspaceWidgetGrid.svelte`  | 223  | ウィジェットグリッド・DnD                    |
| `WidgetSettingsDialog.svelte` | 209  | ウィジェット設定ダイアログ                   |

## State モジュールの依存関係

| State              | IPC 依存                                   | 他 State 依存             |
| ------------------ | ------------------------------------------ | ------------------------- |
| `itemStore`        | `ipc/items`                                | -                         |
| `configStore`      | `ipc/config`                               | -                         |
| `themeStore`       | `ipc/theme`                                | -                         |
| `toastStore`       | -                                          | -                         |
| `soundStore`       | -                                          | -                         |
| `workspaceStore`   | `ipc/workspace`                            | -                         |
| `paletteStore`     | `ipc/items`, `ipc/launch`, `ipc/workspace` | `itemStore`, `toastStore` |
| `hiddenStore`      | `ipc/items`                                | -                         |
| `pointerDragStore` | -                                          | -                         |

## 最多 import State（コンポーネント側からの参照数）

| State            | 参照コンポーネント数 |
| ---------------- | -------------------- |
| `toastStore`     | 7                    |
| `workspaceStore` | 4                    |
| `itemStore`      | 4                    |

## コンポーネント構造（ディレクトリ別）

```
src/lib/components/arcagate/
├── common/      (14 ファイル) — ActionButton, Chip, KeyHint, TitleBar, WidgetShell 等
├── library/     ( 5 ファイル) — LibraryCard, LibraryDetailPanel, LibraryLayout 等
├── palette/     ( 5 ファイル) — PaletteOverlay, PaletteSearchBar, PaletteKeyGuide 等
├── settings/    (多数)        — SettingsDialog, 外観/サウンド/データ 各パネル
├── workspace/   (多数)        — WorkspaceLayout, WidgetGrid, 各ウィジェット
└── theme-editor/ ( 1 ファイル) — ThemeEditor.svelte
```

## 観察

- **大型コンポーネント上位 3** (LibraryDetailPanel / WorkspaceLayout / LibraryMainArea) が機能の中心。リファクタ候補になりうるが現状テスト済みで安定。
- `toastStore` は最多参照だが依存なしで軽量 ✅
- `paletteStore` は多くの IPC + State に依存 → 複雑度高め
