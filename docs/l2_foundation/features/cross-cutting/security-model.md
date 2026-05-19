# Security Model

> cross-cutting / PR #510 / #511 で確立した security audit (F1〜F15) の機能契約

## 目的

ローカル完結のランチャーとして、外部プロセス起動 / スクリプト実行 / ファイルアクセスを安全に行うための横断的な防御契約。Arcagate は任意のコマンド・スクリプトを起動するツールであり、injection と path 脱出が最大の攻撃面。

## やること (必要処理)

- **shell injection 排除**: command / script は構造化 argv で `Command` に渡す。`cmd.exe` 経由で文字列を再パースさせない。URL / folder は `explorer.exe` に構造化引数で渡す
- **引数の安全化**: command 文字列は `shell_words::split` で parse (スペース入りパスを安全に分解)
- **拡張子 allowlist**: script は許可拡張子のみ実行 (bat / cmd / ps1 / sh / bash / zsh / fish / vbs / wsf / py / js / ts / rb / pl / lua / applescript)
- **path confinement**: script は `canonicalize` で実体解決し、監視フォルダ配下にあることを検証 (symlink 脱出防止)
- **確認 gate**: command / script item は初回起動時に `ConfirmationRequired` を返し user 確認を経る
- **制御文字拒否**: URL / path に制御文字を含む入力を拒否
- **PowerShell escape**: icon 抽出のスクリプト引数はシングルクォート二重化 (`''`) で escape
- **CSP**: Tauri v2 default CSP 準拠 (`ipc:` / `asset:` のみ、`unsafe-inline` / `unsafe-eval` 禁止)
- **auto-update 署名検証**: [Auto Update](./auto-update.md) 参照

## やらないこと (禁止 / scope 外)

- shell に user 由来文字列をそのまま渡さない
- allowlist 外の拡張子を script として実行しない
- 監視フォルダ外の path を script として実行しない (canonicalize 後に外なら拒否)
- 確認 gate を恒久的に skip しない (widget の「確認 OFF」設定でも backend gate / allowlist / path 検証は迂回しない)
- ファイル / DB の操作を frontend で直接しない (必ず backend service 経由、レイヤー逆流禁止)
- 任意コード実行につながる「便利機能」を Non-goal として追加しない

## 性能予算

- 検証は path canonicalize と文字列処理のみ、起動 latency にほぼ影響しない

## 副作用 (state 変化 / persistence)

- 初回確認の記録

## 依存

- crate: `shell_words`
- 関連 feature: [Launcher](../backend/launcher.md) / [Script Runner Service](../backend/script-runner.md) / [Icon Service](../backend/icon-service.md)

## 既知の判断

- audit ID (F1: PowerShell escape / F2: 構造化 argv / F3: 制御文字 / F5: transaction / F8: path / F15: 確認 gate + script allowlist) は PR #510 / #511 で確立
- CLI / MCP 経由の起動は確認 gate を skip する (対話 UI がない経路のため、呼び出し側が信頼境界)
