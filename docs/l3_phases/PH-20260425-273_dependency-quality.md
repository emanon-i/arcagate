---
id: PH-20260425-273
status: todo
batch: 63
type: 計測
---

# PH-273: 依存品質チェック（audit + 未使用 + 重複）

## 背景・目的

engineering-principles.md §5「システム的検知（自動化対象）」に基づき、
依存の健全性（セキュリティ / 未使用 / 重複 / ライセンス）をチェックしてベースラインとする。

## チェック内容

### セキュリティ脆弱性

```bash
# npm
pnpm audit

# Rust
cargo audit
# または: cargo install cargo-deny && cargo deny check
```

### 未使用 export（knip）

batch-59 で実施済みだが、batch-60〜62 の変更後に再実行して差分確認。

```bash
npx knip
```

### 重複パッケージ

```bash
# npm 重複バージョン
pnpm ls --depth=0 2>&1 | head -50

# Rust 重複クレート
cargo tree --duplicates
```

### ライセンス確認

```bash
# Rust ライセンス一覧
cargo license

# npm ライセンス確認（簡易）
npx license-checker --summary
```

## 成果物

- `docs/l2_architecture/dependency-quality.md` 新設
  - audit 結果サマリー（脆弱性件数 / 重複件数 / 未使用 export 件数）
  - 要対応事項リスト（優先度付き）
  - ライセンス問題があれば記録

## 受け入れ条件

- [ ] pnpm audit + cargo audit 結果が記録される
- [ ] 重複パッケージの有無が確認される
- [ ] 未使用 export が確認される（knip、batch-59 との差分）
- [ ] 要対応事項があれば次バッチに積まれる
- [ ] `pnpm verify` 全通過（計測のみ）
