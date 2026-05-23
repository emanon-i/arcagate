# Settings 画面

> Functional Spec。機能契約のみ記載。詳細な機能カタログは [`../../screens/settings.md`](../../screens/settings.md)。

## 目的

アプリ全体の設定。2 ペイン (左 category / 右 内容) の modal dialog。設定変更は保存ボタンなしで即反映する。

## やること (必要処理)

各 category ペイン:

- **General**: グローバルホットキー入力、Windows autostart toggle
- **Appearance**: theme 選択 / 編集 (CSS 変数 picker) / JSON export / import、font token、a11y override (透明度 / コントラスト / 動き)
- **Library**: card サイズ S/M/L、default ソート field / order
- **Data**: JSON export / import (item + tag + workspace + widget)、DB バックアップ、監視 folder の一覧 / 追加 / 削除
- **Workspaces**: workspace の一覧 / rename / delete
- **About**: バージョン表示、アップデート確認、changelog + install button

## やらないこと (禁止 / scope 外)

- multi-profile を持たない (1 user 1 config)
- account / login を持たない
- cloud sync をしない (export / import は file ベース)
- 保存ボタンを置かない (instant-feedback 原則。変更 = 即反映)
- 選択肢 1 個の menu を挟まない (button = 即 action)

## 性能予算

- 設定変更 → 反映 < 100ms (特に theme は選択した瞬間に preview が変わる)
- export / import は item 数に対し線形、長時間なら progress 表示

## 副作用 (state 変化 / persistence)

- `config` テーブル (key-value)、`themes` テーブル、`watched_paths` テーブルへ write
- a11y override は localStorage に永続化 (初回 paint 前に適用)
- グローバルホットキー登録 / autostart レジストリ操作 (backend)
- DB バックアップは filesystem への file copy

## 依存

- IPC: `cmd_get_config` / `cmd_set_config` / `cmd_get_hotkey` / `cmd_set_hotkey` / `cmd_get_autostart` / `cmd_set_autostart` / `cmd_list_themes` / `cmd_create_theme` / `cmd_update_theme` / `cmd_delete_theme` / `cmd_get_active_theme_mode` / `cmd_set_active_theme_mode` / `cmd_export_theme_json` / `cmd_import_theme_json` / `cmd_export_json` / `cmd_import_json` / `cmd_check_for_updates`
- backend: [Config Service](../backend/config-service.md) / [Theme Service](../backend/theme-service.md) / [Export/Import Service](../backend/export-import.md)
- cross-cutting: [Design Tokens](../cross-cutting/design-tokens.md) / [Auto Update](../cross-cutting/auto-update.md)
- 依存される: なし (modal overlay)

## 既知の判断

- Settings は modal overlay (`showSettings = true`)、独立 route ではない
- Onboarding / Setup Wizard は別 component だが同じ「設定」系統 ([onboarding.md](./onboarding.md))

## 破壊的操作の確認契約 (PH-CF-300 横展開)

Settings 配下で取り返しのつかない操作 (全設定 reset / アップデート適用 = 再起動を伴う / テーマ
削除等) も `window.confirm` を使わない。 `ConfirmDialog` (destructive variant) または専用
modal (`CleanResetDialog` のような type-to-confirm dialog) を必ず経由する。
詳細契約は [library.md](./library.md) / [workspace.md](./workspace.md) §破壊的操作の確認契約 を参照。

機械検出: `scripts/audit-window-confirm.sh` (lefthook + `pnpm audit:all`)。
