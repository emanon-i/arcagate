---
id: PH-20260425-257
status: todo
batch: 60
type: 防衛
---

# PH-257: Library E2E テスト強化（星・タグ・詳細パネル操作）

## 背景・目的

既存 E2E は Library の基本操作（アイテム登録・削除）をカバーするが、
タグ付け・スター操作・詳細パネル表示の E2E が不足している（PH-253 の発見）。
コンポーネント分割（PH-254）後のリグレッション防止として事前に追加する。

## 実装ステップ

### Step 1: 既存テスト確認

`tests/e2e/` 配下の Library 関連テストを読み、カバレッジギャップを特定。

### Step 2: 詳細パネル E2E 追加

`tests/e2e/library.spec.ts` または新規 `library-detail.spec.ts` に追加:

1. アイテム選択 → 詳細パネルが表示される
2. スター付け → スター状態が切り替わる
3. タグ追加 → タグチップが表示される
4. タグ削除 → タグチップが消える
5. 起動ボタン → `launchItem` IPC が呼ばれる（mock or smoke）

### Step 3: pnpm test:e2e

## 受け入れ条件

- [ ] Library 詳細パネル関連 E2E が5件以上追加される
- [ ] `pnpm test:e2e` 全通過
- [ ] `pnpm verify` 全通過
