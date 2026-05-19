# Exe Scanner Service

> backend feature / レイヤー: commands → service → filesystem

## 目的

指定フォルダ配下の実行ファイル / スクリプトを列挙し、Exe Folder Watch widget へ候補を提供する backend feature。

## やること (必要処理)

- `scan_exe_folders`: depth 1-3 でフォルダを walk し exe / bat / cmd / ps1 / sh を列挙
- フォルダ内の代表 exe candidate と同フォルダ `.ico` (先頭 1 件) を提供
- ソート用にフォルダの mtime を返す

## やらないこと (禁止 / scope 外)

- exe を実行しない (列挙のみ。起動は [Launcher](./launcher.md))
- icon を抽出しない ([Icon Service](./icon-service.md) / 登録時の責務)
- depth を 3 より深く walk しない
- ファイル read 失敗で全体を止めない (該当ファイルを skip)

## 性能予算

- depth 上限 (1-3) + error tolerance で有界。file metadata の stat のみ

## 副作用 (state 変化 / persistence)

- なし (read-only。filesystem walk のみ)

## 依存

- 外部 crate なし
- 依存される: Exe Folder Watch widget

## 既知の判断

- U-4 で script 拡張子 (.bat / .cmd / .ps1 / .sh) も scan 対象に含む
