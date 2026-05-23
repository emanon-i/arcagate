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

## 機能契約

### scan reconcile 契約 (PH-CF-100)

scan entry の重複判定は **`(widget_id, entry_key)`** で行う (target パス一致ではない —
exe-folder では item.target = exe ファイルパス ≠ entry_key = 第1階層フォルダで key 空間が異なる)。
entry が `widget_item_hides` に存在すれば自動登録を **skip** し、 復活させない。 entry_key は
第1階層フォルダの **正規化済 絶対パス** (forward slash / 末尾 separator 除去) で、 同フォルダの
異表現で 2 重登録 / hide 不発を起こさない (item-service spec の所有関係契約と同 key 空間)。

機械検出:

- 統合 test `test_exe_folder_auto_register_delete_no_resurrection` (entry_key 一致 / hide 連動)
- 統合 test `test_normalize_entry_key_consolidates_path_variants` (path 正規化)

## 既知の判断

- U-4 で script 拡張子 (.bat / .cmd / .ps1 / .sh) も scan 対象に含む
- PH-CF-100 (2026-05-23) で reconcile を所有関係ベース (`source_widget_id, source_entry_key`)
  に切替、 `widget_item_hides` skip を契約化。 exe-folder の安定 identity (= 第1階層フォルダ
  の正規化済 絶対パス) は PH-CF-400 と整合させる。
