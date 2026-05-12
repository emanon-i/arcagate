# Settings (設定)

アプリ全体の設定。 2 ペイン構成 (左 category / 右 内容)、 modal dialog として表示。

route: main `+page.svelte` で `showSettings = true` → SettingsPanel modal overlay

---

## 何があるか

| pane                 | 内容                                                       |
| -------------------- | ---------------------------------------------------------- |
| 左: category tablist | General / Library / Appearance / Data / Workspaces / About |
| 右: content          | 選択 category の設定 UI                                    |

実装場所:

- `src/lib/components/settings/SettingsPanel.svelte` (root)
- 各 category section: `SettingsGeneral.svelte` / `SettingsLibrary.svelte` / `SettingsAppearance.svelte` / `SettingsData.svelte` / `SettingsWorkspaces.svelte` / `SettingsAbout.svelte`

---

## 機能 / 各 category

### General

- グローバルホットキー入力欄 (Ctrl+Shift+Space default、 user 変更可)
- Windows autostart toggle (起動時に Arcagate を自動起動)

### Library

- カードサイズ S / M / L 切替
- default ソート field / order

### Appearance

- Theme 選択 (builtin + user-defined)
- Theme 編集 (CSS 変数値の picker)
- Theme JSON export / import
- `--ag-font-ui` / `--ag-font-content` font tokens (次 PR で UI 追加予定)

### Data

- JSON export / import (item + tag + workspace + widget)
- DB バックアップ (filesystem copy 経由)
- 監視 folder (watched_paths) 一覧 / 追加 / 削除

### Workspaces

- workspace 一覧 + rename / delete

### About

- バージョン番号
- アップデート確認 (`cmd_check_for_updates`)
- 更新がある場合は changelog + install button

---

## こうあってほしい (L0 抜粋)

- 設定変更 = 即反映 (保存ボタン無し)
- Theme 選んだ瞬間に preview で見た目が変わる (instant-feedback rule)
- ホットキーは入力欄に key を押すだけで登録

---

## Onboarding / Wizard

Settings とは別だが、 同じ「設定」 系統:

- 初回起動時のみ表示 (`is_setup_complete = false` で開く)
- step 1: ホットキー設定 (Ctrl+Shift+Space default)
- step 2: 自動起動 toggle
- step 3: 完了 → Library 開く + `cmd_mark_setup_complete`

実装: `src/lib/components/setup/SetupWizard.svelte` + `OnboardingTour.svelte`

---

## 関連 IPC

| command                                                                          | 用途                      |
| -------------------------------------------------------------------------------- | ------------------------- |
| `cmd_get_config` / `cmd_set_config`                                              | key-value 設定            |
| `cmd_get_hotkey` / `cmd_set_hotkey`                                              | global hotkey             |
| `cmd_get_autostart` / `cmd_set_autostart`                                        | Windows autostart         |
| `cmd_is_setup_complete` / `cmd_mark_setup_complete`                              | setup wizard 完了 flag    |
| `cmd_mark_onboarding_complete`                                                   | onboarding tour 完了 flag |
| `cmd_list_themes` / `cmd_create_theme` / `cmd_update_theme` / `cmd_delete_theme` | theme CRUD                |
| `cmd_get_active_theme_mode` / `cmd_set_active_theme_mode`                        | 現 theme 切替             |
| `cmd_export_theme_json` / `cmd_import_theme_json`                                | theme 共有                |
| `cmd_export_json` / `cmd_import_json`                                            | data export / import      |
| `cmd_check_for_updates`                                                          | update 確認               |

---

## 制約 / Non-goals

- multi-profile なし (1 user 1 config)
- account / login なし
- cloud sync なし (export / import は file-based)
