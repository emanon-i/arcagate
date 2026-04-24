# PH-20260425-252 未使用コード・依存検出 + 整理

- **フェーズ**: batch-59 Plan D（品質防衛）
- **status**: done
- **開始日**: -

## 目的

未使用 Rust クレートと TS エクスポートを検出し、削除可能なものを整理する。

## 技術方針

### Rust: cargo-udeps

```bash
cargo install cargo-udeps --locked 2>/dev/null || true
cargo +nightly udeps --all-targets 2>&1
```

未使用クレートを `Cargo.toml` から削除する。

### TypeScript: knip（またはバンドル分析）

```bash
pnpm add -D knip 2>/dev/null || true
node_modules/.bin/knip --reporter compact 2>&1 | head -50
```

未使用エクスポートを削除 or `_` prefix に変更。

### 受け入れ条件

- [ ] `cargo udeps` で未使用クレートが 0 または削除済み
- [ ] `knip` レポートを `docs/l2_architecture/metrics-report.md` に記録
- [ ] `pnpm verify` 全通過
