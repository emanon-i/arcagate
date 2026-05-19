# Script Runner Service

> backend feature / レイヤー: commands → service → filesystem / OS

## 目的

監視フォルダ内のシェルスクリプトを列挙・実行する backend feature。path confinement と確認 gate で安全に実行する。

## やること (必要処理)

- `scan_script_folder`: allowlist 拡張子のスクリプトを列挙
- `validate_script`: folder と script を `canonicalize` し、script が folder 配下にあることを検証 (path traversal 防止)
- `run_script`: 拡張子別インタプリタで構造化 argv 起動
- 初回実行時の confirm gate (`cmd_confirm_script`)

## やらないこと (禁止 / scope 外)

- allowlist 外の拡張子を実行しない
- symlink で folder 外へ脱出する script を実行しない (canonicalize 検証)
- スクリプト本体を編集・権限変更しない
- インタプリタのインストール確認をしない
- shell に文字列を渡さない (構造化 argv で injection 排除)

## 性能予算

- scan は depth 1-3 のフォルダ walk。実行は外部 process spawn

## 副作用 (state 変化 / persistence)

- 外部 process を spawn
- 初回確認の記録

## 依存

- 外部 crate なし
- 依存される: Script Folder Watch widget

## 既知の判断 / セキュリティ

- allowlist: bat / cmd / ps1 / sh / bash / zsh / fish / vbs / wsf / py / js / ts / rb / pl / lua / applescript
- `canonicalize` による path confinement、構造化 argv、初回 confirm gate (audit F15 / F2)。詳細は [Security Model](../cross-cutting/security-model.md)
