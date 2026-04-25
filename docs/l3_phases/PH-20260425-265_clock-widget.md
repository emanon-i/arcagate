---
id: PH-20260425-265
status: todo
batch: 62
type: 改善
---

# PH-265: Clock ウィジェット

## 背景・目的

Workspace に日付・時刻を表示する表示専用ウィジェットを追加する。
バッテリー・通知領域を隠さずにタスクバーを常時表示しない運用をサポートする。

## 仕様

### 表示内容

| 要素 | デフォルト表示 | 設定でOFF可 |
| ---- | -------------- | ----------- |
| 時刻 | `HH:mm:ss`     | 秒 ON/OFF   |
| 日付 | `YYYY/MM/DD`   | 日付 ON/OFF |
| 曜日 | `(月)`         | 曜日 ON/OFF |

### 動作

- `setInterval` 1 秒ごとに更新（`$effect` + `onDestroy` でクリア）
- widget.config: `{ show_seconds: true, show_date: true, show_weekday: true, use_24h: true }`

### WidgetType 追加

- Rust: `WidgetType::Clock => "clock"`
- TypeScript: `| 'clock'`

### 設定 UI

- WidgetSettingsDialog に新規 `clock_settings` セクション
- チェックボックス 4 つ: 秒表示 / 日付 / 曜日 / 24 時間

## 実装ファイル

| ファイル                                                            | 変更内容                      |
| ------------------------------------------------------------------- | ----------------------------- |
| `src/lib/components/arcagate/workspace/ClockWidget.svelte`          | 新規                          |
| `src/lib/types/workspace.ts`                                        | `WidgetType` union に `clock` |
| `src-tauri/src/models/workspace.rs`                                 | `WidgetType::Clock`           |
| `src/lib/components/arcagate/workspace/WorkspaceLayout.svelte`      | clock 登録                    |
| `src/lib/components/arcagate/workspace/WorkspaceSidebar.svelte`     | clock サイドバー追加          |
| `src/lib/components/arcagate/workspace/WidgetSettingsDialog.svelte` | clock 設定追加                |

## 受け入れ条件

- [ ] Workspace に Clock ウィジェットを追加できる
- [ ] 1 秒ごとに時刻が更新される
- [ ] 設定で秒/日付/曜日の表示を切り替えられる
- [ ] ウィジェット削除時に setInterval がクリアされる（メモリリーク無し）
- [ ] `pnpm verify` 全通過
