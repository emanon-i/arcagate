# Completeness Matrix — PH-PQ-500 完全性 sweep

> 作成: 2026-05-22 / phase: PH-PQ-500 / 判定: 動 (working) / 半動 (partial) / 死 (dead)

全 screen / widget / settings pane / cross-cutting を「動くか」で audit し、
半動・死を「完成 / 削除 / 隠す」の 3 択で処理した記録。
fact 確認は agent による実コード read + sub-agent 並列 audit + 再 verify。

## サマリ

- 観測点 約 32 件中、**半動 8 件 / 死 1 件** を検出、全件処理済。
- 「隠す」(feature flag gate) と判定したものは **0 件** — すべて「完成」または「削除」で確定
  (CLAUDE.md `do-it-now-philosophy`「将来 trigger 禁止」に沿い、隠して先送りせず今処理)。
- `plugin_api/` は **既に存在しない** — WASTEFUL_PROCESSING W-7 (commit 2e5c9dc) で削除済。
  本 phase の T2 は「確認のみ」で完了 (新規対処なし)。
- code 内 TODO/FIXME/HACK/XXX = 0 件 (Codex 実測、維持)。

## T1. Widget (15 件)

| Widget           | 判定    | 根拠 / 処理                                                                                                                                                                                                                                                              |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Favorites        | 半動→動 | spec が phantom の `sort_field: 'recent'` を記載 (`WidgetSortField` は `'default'｜'name'` のみ)。favorites.md を実装に合わせ `default / name` に修正。                                                                                                                  |
| Recent           | 動      | `getRecentItems` + hide filter + launch、契約通り。                                                                                                                                                                                                                      |
| Projects         | 半動→動 | `config.view_mode` を read (`ProjectsWidget.svelte:89`) するが切替 UI が無い orphan field。spec「card/list 切替」(projects.md:14) は「やること」→ **完成**: toolbar に view 切替 button 追加。dead import `getFolderItems` も除去。                                      |
| Item             | 半動→動 | `ItemWidgetConfig.sort_field` 型に no-op の `'recent'` が残存 (UI からは到達不能、W-4 で UI option は除去済)。**削除**: 型から `'recent'` 除去、item.md も同期。                                                                                                         |
| Stats            | 半動→動 | `CommonMaxItemsSettings` が常に並び順 select を render するが StatsWidget は `sort_field` を read しない (stats.md: pure frequency 固定、config schema は `max_items` のみ)。**削除**: `showSort` prop 追加 + `StatsSettings.svelte` wrapper で stats は select 非表示。 |
| QuickNote        | 動      | textarea debounce 保存 + font_size、契約通り。                                                                                                                                                                                                                           |
| ExeFolder        | 半動→動 | Projects と同根の `view_mode` orphan (card-view path `:401-433` が到達不能)。spec「list/card 切替」(exe-folder.md:14) は「やること」→ **完成**: toolbar に view 切替 button 追加。                                                                                       |
| DailyTask        | 動      | add/toggle/delete 永続化、hideCompleted、契約通り。                                                                                                                                                                                                                      |
| Snippet          | 動      | add/edit/delete + clipboard copy、契約通り。                                                                                                                                                                                                                             |
| ClipboardHistory | 動      | polling clamp + dedup + filter + re-copy、契約通り。                                                                                                                                                                                                                     |
| FileSearch       | 動      | stale-response 破棄 + cancel + keyboard nav、契約通り。                                                                                                                                                                                                                  |
| SystemMonitor    | 動      | 全 metric IPC + chart type、degraded UI、契約通り。network の `gauge` 不在は意図的 (consistent)。                                                                                                                                                                        |
| ImageScrap       | 動      | D&D 配置 + `cmd_save_image_scrap` は page-level drop handler 経由、契約通り。                                                                                                                                                                                            |
| FilePreview      | 動      | `cmd_read_file_preview` + frontmatter + binary/truncated chip、契約通り。                                                                                                                                                                                                |
| ScriptFolder     | 半動→動 | description Info button が `onclick` 無しの dead button (focus ring / aria 付きで操作可能に見える)。→ ExeFolder / Projects と横展開で **完成**: disclosure button 化 (click で説明を inline 展開)。                                                                      |

## T1. Screen (5 件)

| Screen     | 判定    | 根拠                                                                                                                                                                                       |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Library    | 動      | sort / filter / show-hidden / view / 選択 mode すべて configStore 連動・永続化済。                                                                                                         |
| Workspace  | 動      | widget grid / D&D / context menu / undo (snackbar)、契約通り。                                                                                                                             |
| Palette    | 半動→動 | フッターに dead keybinding hint `Ctrl+H 非表示アイテム表示` (handler 不在、component comment 自身が「実装無し」と明記)。**削除**: hint + i18n key 撤去。残る ↑↓ / Tab / = は全て実装あり。 |
| Settings   | 動      | 6 pane すべて配下参照。                                                                                                                                                                    |
| Onboarding | 動      | SetupWizard 3 step + guided tour。HotkeyInput 修正の恩恵を受ける (下記 cross-cutting)。                                                                                                    |

## T1. Settings pane (6 件)

| Pane       | 判定 | 根拠                                                                                                                                         |
| ---------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| General    | 動   | hotkey / autostart / language / setup 再実行 / zoom 範囲、全て IPC・永続化済。                                                               |
| Library    | 動   | card size / text color / overlay / stroke、`setLibraryCardStyle` 永続化。                                                                    |
| Appearance | 動   | theme grid / clone / export / import / a11y toggle、ThemeEditor 高度 token も全 input が `setVar` で live preview + 保存。stub option なし。 |
| Data       | 動   | ExportImport / reset-all / CleanResetDialog、全て実 IPC。                                                                                    |
| Updater    | 動   | Tauri updater plugin の実 call。                                                                                                             |
| About      | 動   | 実 `getVersion` / `getTauriVersion`。                                                                                                        |

## T1. Cross-cutting

| 領域                                                   | 判定    | 根拠 / 処理                                                                                                                                                                                                      |
| ------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hotkey                                                 | 半動→動 | `HotkeyInput`「変更」button click 後、focus が button に残り `<input onkeydown>` が発火せず録音できなかった (Settings / Onboarding 両方に影響)。**完成**: `startRecording` で `inputEl.focus()` を呼ぶよう修正。 |
| autostart / theme / undo / search / D&D / context menu | 動      | sub-agent audit で全て実 handler 確認済。                                                                                                                                                                        |

## T2. plugin_api / dead_code

| 対象                                     | 判定           | 処理                                                                                                                                                                                                                   |
| ---------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin_api/` module                     | 不在           | WASTEFUL_PROCESSING W-7 (commit 2e5c9dc) で削除済。新規対処なし。                                                                                                                                                      |
| `DbState` (`db/mod.rs`)                  | false positive | `#[allow(dead_code)]` は stale (struct は managed state として使用)。**削除** (attr のみ)。                                                                                                                            |
| `AppError` (`utils/error.rs`)            | 一部 dead      | enum-level `#[allow(dead_code)]` が `Zip` / `Permission` variant の未構築を隠していた (構築箇所ゼロ、`code()` の match arm のみ)。**削除**: 2 variant + arm 除去、enum-level attr も除去。残 14 variant は全て構築済。 |
| `SortOrder` enum (`models/launch.rs`)    | 死             | 参照ゼロの dead enum。**削除**。                                                                                                                                                                                       |
| `find_system_tags` (`tag_repository.rs`) | 死             | 呼び出しは自身の test のみ (production 参照ゼロ)。**削除** (関数 + test)。                                                                                                                                             |
| `post_json` (`http_client.rs`)           | 死             | Telemetry 用足場、Telemetry は撤去済。参照ゼロ。**削除** (+ 不要 import `serde_json::Value`)。                                                                                                                         |

## T5. feature flag gate

「隠す」と判定した観測点は **0 件**。全 half-feature を「完成」または「削除」で確定したため、
`experimental` Cargo feature 等の gate 機構は新設しない (未使用の足場は `do-it-now-philosophy`
「将来 trigger 禁止」に反するため作らない)。必要が生じた phase で導入する。

## T6. 再発防止

`scripts/audit-stub-action.sh` を新設し `audit:all` / lefthook に統合:
空関数 / console のみ / TODO のみの event handler、`Ok(Default::default())` 等の stub command を
CI で 0 violations gate。本 phase で潰した dead button / no-op option の再混入を機械検出する。

## 横展開記録

- description Info button の dead button pattern は ExeFolder / Projects / ScriptFolder の
  3 widget に同型で存在 → 横展開で 3 件まとめて disclosure button 化。
- `view_mode` orphan は ExeFolder / Projects に同型で存在 → 2 件まとめて切替 UI 追加
  (Item widget は既に切替 UI 実装済、3 widget で pattern 統一)。
