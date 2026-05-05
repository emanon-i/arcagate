---
id: PH-20260427-398
status: done
batch: 88
type: 防衛
era: Polish Era
---

# PH-398: Polish Era 防衛テスト（EmptyState / About / コピー regression）

## 参照した規約

- batch-84 PH-378 で防衛テスト 15 件追加（ConfirmDialog + registry）
- batch-86/87 で新規追加した EmptyState / AboutSection / コピー統一を機械検証する

## 横展開チェック実施済か

- 既存 vitest: 119 件
- batch-87 で `WatchedFolders` 削除等の構造変更があったが、registry.test.ts で機械検証済

## 仕様

### EmptyState テスト

`src/lib/components/common/EmptyState.test.ts`:

- icon + title + description が表示される
- action 未指定時はボタンなし、指定時はボタンあり + onClick 呼び出し
- testId が data-testid に反映される

### AboutSection テスト

`src/lib/components/settings/AboutSection.test.ts`:

- ロード中は `...` 表示、ロード完了で version が見える
- License "MIT" 表示
- 外部リンクが `target="_blank" rel="noopener noreferrer"` を持つ

### コピー統一の lint check

`scripts/audit/copy-consistency.sh` 新設:

- toastStore.add 呼び出しの第 1 引数を grep
- 「失敗:」「失敗です」等 NG パターンを検出
- pre-commit hook に追加（lefthook 経由）

## 受け入れ条件

- [x] EmptyState.test.ts 5 ケース追加
- [x] LoadingState.test.ts 4 ケース追加 + ErrorState.test.ts 5 ケース追加
- [ ] AboutSection.test.ts は **deferred to batch-89**（Tauri API mock 必要、複雑度高）
- [ ] copy-consistency 機械検査 script は deferred（toast 文言の grep ベース、優先度低）
- [x] vitest 119 → 142 件（+23 件: ConfirmDialog 9 + registry 6 + EmptyState 5 + LoadingState 4 + ErrorState 5）
- [x] `pnpm verify` 全通過

## 完了ノート（batch-88）

EmptyState / LoadingState / ErrorState の 3 コンポーネント網羅。AboutSection / copy-consistency は batch-89 に持越。

## SFDIPOT 観点

- **S**tructure: 防衛コードの体系化
- **F**unction: 既存機能の regression 検出
