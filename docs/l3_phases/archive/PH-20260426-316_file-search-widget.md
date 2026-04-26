---
id: PH-20260426-316
status: done
batch: 72
type: 改善
---

# PH-316: FileSearchWidget（指定フォルダ内ファイル検索）

## 横展開チェック実施済か

- batch-69 ExeFolderWatchWidget の cmd_scan_exe_folders / std::fs パターン踏襲
- everything 風 instant 検索は重い、本 MVP は **静的 walk + 部分一致 filter**
- WidgetShell menuItems = 1 原則準拠

## 仕様

- 設定: search_root + max_depth (1-3) + extension filter（任意）
- ウィジェット内に検索 input、入力で部分一致 filter（path / filename）
- クリックで `cmd_launch_path`（既存 launch IPC 流用）or shell open
- 結果上限 100 件で打ち切り
- Rust IPC `cmd_list_files(root, depth, max_files)` 新設

## 受け入れ条件

- [x] WidgetType 'file_search' 追加
- [x] cmd_list_files Rust 単体 6 件 pass（depth / limit / dotfile skip / clamp）
- [x] 検索 input で filter（部分一致、表示上限 50 件）
- [x] menuItems = 1 即モーダル
- [x] cmd_open_path 追加（DB 経由しない一時起動）
- [x] `pnpm verify` 全通過
