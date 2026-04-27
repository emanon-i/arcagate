---
id: PH-20260427-443
status: done
batch: 97
type: 防衛
era: Distribution Era + Codex Q5 残
---

# PH-443: launch error e2e 原因別文言検証 (Codex Q5 #8 残)

## 問題

batch-93 PH-423 で launch-error.spec.ts 新設したが `File not found` 1 ケース中心、
他 2 原因 (`launch.permission_denied` / `launch.not_executable`) は test.skip。
Codex 3 回目 Q1: #8「e2e 原因別文言」が 7.5/8 で 0.5 落ちる原因。

## 改修

### tests/e2e/launch-error.spec.ts

- 既存 `存在しない exe path → File not found` ケース (1 件) を維持
- **拡張子なし path → 「実行可能ファイルではありません」 toast** (NotExecutable e2e)
  - CARGO_MANIFEST_DIR 等の存在するが拡張子なし path を item として作成
  - launch → toast 文言 contains 「実行可能ファイルではありません」
- **権限なし path → 「起動権限がありません」 toast** (PermissionDenied e2e)
  - Windows で permission denied をシミュレートするのは困難
  - 代替: invoke で `cmd_launch_item` 直接呼んで Rust 側 LaunchPermissionDenied をモック
  - または `process::Command` 起動失敗時の io::ErrorKind::PermissionDenied は OS 依存 → 単体テストで担保し e2e は skip 維持

### vitest 補完

- `src/lib/utils/launch-error.test.ts` (既存 10 ケース) で文言の正規表現検証
- 文言変更 regression 防止

### 受け入れ条件

- [ ] tests/e2e/launch-error.spec.ts に NotExecutable e2e 1 ケース追加 (skip 解除)
- [ ] PermissionDenied は OS 依存のため単体テストで担保 (test.skip + 理由記述)
- [ ] vitest launch-error.test.ts に「形式 invariant」検証 1 ケース追加
- [ ] `pnpm verify` 全通過

### Codex Q5 #8 完了化

これで #8 を「実装ベース 8/8 解消」と判定可能。
