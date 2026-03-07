---
status: wip
phase_id: PH-003-K
depends_on: []
---

# PH-003-K: ワークスペース整理（不要ウィジェット削除 + レイアウト修正）

## 概要

フィードバックで「不要」とされたウィジェット4つを削除し、残存するレイアウトの重なり問題を修正する。
削除中心のため比較的シンプルだが、WorkspaceLayout のデフォルト構成やAddWidgetDialog のウィジェットリストにも影響する。

---

## K-1: ThemeControlsWidget 削除

### 背景

フィードバックで「Theme controls ウィジェット不要」とされている。テーマ設定は PageTabBar のダーク/ライトトグルで十分。

### 受け入れ条件

- [ ] `ThemeControlsWidget.svelte` が削除される
- [ ] `WorkspaceLayout` からの参照が削除される
- [ ] `AddWidgetDialog` のウィジェットリストから除外される
- [ ] DB の `widget_type = 'theme_controls'` データが存在する場合のハンドリング（表示スキップ or マイグレーションで削除）
- [ ] テーマ切替機能は `PageTabBar` のトグルで引き続き利用可能
- [ ] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                           | 変更内容                                |
| ------------------------------------------------------------------ | --------------------------------------- |
| `src/lib/components/arcagate/workspace/ThemeControlsWidget.svelte` | 削除                                    |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`     | ThemeControlsWidget の import・参照削除 |
| `src/lib/components/workspace/AddWidgetDialog.svelte`              | ウィジェットリストから除外              |

---

## K-2: VisibilityWidget 削除

### 背景

フィードバックで「Visibility ウィジェット不要」とされている。非表示アイテムの制御は `SensitiveControl`（Library パネル）で行う。

### 受け入れ条件

- [ ] `VisibilityWidget.svelte` が削除される
- [ ] `WorkspaceLayout` からの参照が削除される
- [ ] `AddWidgetDialog` のウィジェットリストから除外される
- [ ] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                        | 変更内容                             |
| --------------------------------------------------------------- | ------------------------------------ |
| `src/lib/components/arcagate/workspace/VisibilityWidget.svelte` | 削除                                 |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`  | VisibilityWidget の import・参照削除 |
| `src/lib/components/workspace/AddWidgetDialog.svelte`           | ウィジェットリストから除外           |

---

## K-3: QuickActionsWidget 削除

### 背景

フィードバックで「Quick actions 不要（Favorites と被っている）」とされている。

### 受け入れ条件

- [ ] `QuickActionsWidget.svelte` が削除される
- [ ] `WorkspaceLayout` からの参照が削除される
- [ ] Quick actions 内の個別機能（パレット起動、DB import/export、テーマトグル、電卓）は他の導線で利用可能であることを確認
- [ ] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                          | 変更内容                               |
| ----------------------------------------------------------------- | -------------------------------------- |
| `src/lib/components/arcagate/workspace/QuickActionsWidget.svelte` | 削除                                   |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`    | QuickActionsWidget の import・参照削除 |

---

## K-4: WatchFoldersWidget 削除（独立ウィジェットとして）

### 背景

フィードバックで「Watch folders ウィジェット不要」とされている。フォルダ監視機能は PH-003-M で ProjectsWidget に統合される予定。

### 受け入れ条件

- [ ] `WatchFoldersWidget.svelte` が削除される
- [ ] `WorkspaceLayout` からの参照が削除される
- [ ] `AddWidgetDialog` のウィジェットリストから除外される
- [ ] バックエンドのフォルダ監視機能（`watched_paths` テーブル、watcher service）はそのまま維持
- [ ] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                          | 変更内容                               |
| ----------------------------------------------------------------- | -------------------------------------- |
| `src/lib/components/arcagate/workspace/WatchFoldersWidget.svelte` | 削除                                   |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`    | WatchFoldersWidget の import・参照削除 |
| `src/lib/components/workspace/AddWidgetDialog.svelte`             | ウィジェットリストから除外             |

---

## K-5: ウィジェット設定ボタンとテキストの重なり修正

### 背景

`WidgetShell` の MoreMenu（`...` ボタン）とウィジェットタイトルテキストが視覚的に被る問題がある。

### 受け入れ条件

- [ ] MoreMenu ボタンがウィジェットタイトルと重ならない
- [ ] ウィジェットヘッダーのレイアウトが `justify-between` で適切に配置される
- [ ] 全ウィジェットで統一的な見た目になる
- [ ] `pnpm verify` が通過する

### 変更対象ファイル

| ファイル                                                | 変更内容                                               |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `src/lib/components/arcagate/common/WidgetShell.svelte` | ヘッダーレイアウト修正（タイトルとメニューの配置調整） |

---

## Exit Criteria

- [ ] 4つの不要ウィジェットが完全に削除される
- [ ] WorkspaceLayout のデフォルト構成が更新される
- [ ] ウィジェットヘッダーの重なり問題が解消される
- [ ] 削除したウィジェットの機能が他の導線で利用可能であることを確認
- [ ] E2E テストが通過する
- [ ] `pnpm verify` が全通過
