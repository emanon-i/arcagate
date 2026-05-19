# Config Service

> backend feature / レイヤー: commands → service → repository → SQLite

## 目的

key-value 形式のアプリ設定 (hotkey / autostart / setup flag 等) を永続化する backend feature。

## やること (必要処理)

- グローバルホットキーの取得 / 設定
- Windows autostart の取得 / 設定
- setup complete / onboarding complete flag の取得 / 設定
- 汎用 key-value の get / set

## やらないこと (禁止 / scope 外)

- config の migration をしない (forward-only schema)
- 値の高度な validation をしない (boolean は "true"/"false" 文字列)
- theme / workspace 等の構造化データを config に持たない (専用テーブル)

## 性能予算

- 単純な KV read / write。起動 latency に影響しない

## 副作用 (state 変化 / persistence)

- `config` テーブルへ write
- hotkey 設定は `tauri-plugin-global-shortcut` の登録、autostart は `tauri-plugin-autostart` のレジストリ操作を伴う

## 依存

- repository: `config_repository`
- plugin: `tauri-plugin-global-shortcut` / `tauri-plugin-autostart`
- DB: `config`
- 依存される: Settings / Onboarding 画面、Palette (hotkey)

## 既知の判断

- boolean 値は "true" / "false" 文字列で保存
