---
id: PH-20260426-357
status: todo
batch: 80
type: 改善
---

# PH-357: ExeFolderWatchWidget 起動 e2e + lessons.md 更新

## 横展開チェック実施済か

- batch-74 で `cmd_open_path` 置換修正済、e2e カバレッジは batch-77 PH-342 で「nightly に追加」と書いたが未着手
- lessons.md に「launchItem virtual id バグ」「lefthook GIT_* env 漏出」を未追加

## 仕様

- e2e: tempdir に exe + ico を作って ExeFolderWatchWidget を表示、entry click で `cmd_open_path` invoke が呼ばれることを spy 検証（実起動はしない）
- @nightly タグ
- lessons.md にエントリ 2 件追加:
  1. launchItem('exe-folder:<path>') が DB find_by_id NotFound で silently fail → cmd_open_path で path 直接起動
  2. lefthook + cargo test の GIT_DIR / GIT_WORK_TREE env 漏出問題 → git_cmd() helper で除去

## 受け入れ条件

- [ ] e2e nightly テスト 1 件 pass
- [ ] lessons.md エントリ 2 件追加
- [ ] `pnpm verify` 全通過
