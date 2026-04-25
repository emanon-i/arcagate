---
id: PH-20260425-271
status: todo
batch: 63
type: 計測
---

# PH-271: Rust バイナリサイズ計測（cargo bloat）

## 背景・目的

engineering-principles.md §5 の計測ツール一覧にある `cargo bloat --release --crates -n 30` を実行し、
Rust バイナリサイズのベースラインを確立する。

## 計測内容

### 前提: リリースビルド

```bash
cargo build --release
# または
pnpm tauri build
```

### cargo-bloat インストール

```bash
cargo install cargo-bloat
```

### 計測コマンド

```bash
# バイナリ全体サイズ
ls -lh src-tauri/target/release/arcagate.exe

# クレート別寄与 top 30
cargo bloat --release --crates -n 30

# 関数別 top 30（オプション）
cargo bloat --release -n 30
```

## 成果物

- `docs/l2_architecture/bundle-baseline.md` に Rust セクションを追記
  - バイナリサイズ (exe, msix, installer)
  - クレート別寄与 top 10 テーブル
  - vision.md の 20MB exe 制約との比較

## 受け入れ条件

- [ ] Rust バイナリサイズ (exe) が計測・記録される
- [ ] クレート別寄与 top 10 が記録される
- [ ] vision.md 制約との整合が確認される
- [ ] `pnpm verify` 全通過（計測のみ、コード変更なし）
