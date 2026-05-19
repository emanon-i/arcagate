# Icon Service

> backend feature / レイヤー: commands → service → repository → SQLite + filesystem

## 目的

EXE ファイルから関連アイコンを抽出し PNG として cache 保存する backend feature。重複抽出を回避する。

## やること (必要処理)

- EXE から icon を抽出し PNG 出力 (PowerShell 経由)
- `%APPDATA%/icons/<uuid>.png` に保存
- exe_path をキーに icon cache の upsert / find / delete

## やらないこと (禁止 / scope 外)

- icon のバージョニング管理をしない
- 不要 icon ファイルの GC をしない (caller の責務)
- 画像の最適化 / リサイズをしない
- exe 以外 (folder / url 等) の icon 抽出をしない

## 性能予算

- PowerShell 起動は初回抽出時に重い → cache hit で 2 回目以降は回避
- 抽出は同期 IPC のため、一覧表示で N 件一斉に呼ばない (Library は store で 1 回 batch + cache — lessons.md)

## 副作用 (state 変化 / persistence)

- PowerShell process を起動
- `%APPDATA%/icons/<uuid>.png` を生成
- `icon_cache` テーブルへ write

## 依存

- repository: `icon_cache_repository`
- OS: Windows PowerShell
- 依存される: Item Service (exe 登録時)、Library

## 既知の判断 / セキュリティ

- PowerShell スクリプトのクォート escape (`''` 二重化) + 制御文字検証で injection 対策 (audit F1)
- icon は file system 保存 (base64 TEXT 比で容量 33% 削減)
