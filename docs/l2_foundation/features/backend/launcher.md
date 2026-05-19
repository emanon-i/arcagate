# Launcher

> backend feature / レイヤー: commands → service → launcher module → OS

## 目的

Item を type 別に起動する backend feature。exe / url / folder / script / command を OS process / shell として実行し、起動履歴を記録する。Opener (開き方の override) もここに含む。

## やること (必要処理)

- `launch_item`: item 取得 → preflight check → type 別 launcher 呼出
- exe: EXE 起動 (BAT / CMD は script に委譲)
- url / folder: `explorer.exe` に構造化引数で渡す (shell 再パース回避)
- script: インタプリタ指定で起動 (allowlist 拡張子)
- command: `shell_words::split` で parse → 構造化引数で起動
- 起動時に `launch_log` 記録 + item 統計更新
- Opener: built-in + user custom の opener registry、per-item / widget / global の 3 段 cascade

## やらないこと (禁止 / scope 外)

- 起動後の process 監視 / タイムアウト / 出力キャプチャをしない (起動して以降は OS 任せ)
- 起動失敗時のリトライをしない
- `cmd.exe` 経由で shell に文字列を渡さない (構造化引数で shell injection を排除)
- allowlist 外の拡張子を script として実行しない

## 性能予算

- item 起動 P95 ≤ 200ms。log 記録は非同期、process 起動自体は DB transaction 外
- sync command (起動 spawn は即 return)

## 副作用 (state 変化 / persistence)

- 外部 process を spawn
- `launch_log` テーブルへ起動ログを記録、item 統計を更新

## 依存

- repository: `item_repository` / `launch_repository` / `opener_repository`
- module: `launcher/` / `opener_service`
- 依存される: Palette / Library / Item / Favorites / Recent / Stats / Exe Folder widget

## 既知の判断 / セキュリティ

- command / script item は初回起動時に `ConfirmationRequired` で gate (CLI / MCP 経由は gate スキップ)
- URL / path に制御文字を含む場合は拒否
- 詳細は [Security Model](../cross-cutting/security-model.md)
