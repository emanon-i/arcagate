---
id: PH-20260426-342
status: todo
batch: 77
type: 改善
---

# PH-342: 可視/不可視トグルの説明 hint + ExeFolder 起動 toast 確認

## 横展開チェック実施済か

- 既存の is_enabled トグル + 隠しアイテム件数表示はあるが「何が起きるか」のヒントがない
- ExeFolderWatchWidget は batch-74 で `cmd_open_path` 置換済、起動 toast 動作の e2e カバレッジを追加

## 仕様

- LibraryDetailPanel の「アイテムを非表示」トグルに `Tip` コンポーネントで「非表示にすると Library + パレット候補から外れます」説明
- LibrarySidebar の「隠しアイテム N 件」リンクで隠しアイテム一覧表示
- ExeFolder 起動 e2e（@core 外、@nightly タグ）: スキャン後にエントリクリックで toast 出ること

## 受け入れ条件

- [ ] is_enabled トグル説明 Tip 表示
- [ ] 隠しアイテム件数 click → 一覧画面
- [ ] ExeFolder e2e（nightly）pass
- [ ] `pnpm verify` 全通過
