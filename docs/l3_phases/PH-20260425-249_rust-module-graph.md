# PH-20260425-249 Rust モジュール依存グラフ

- **フェーズ**: batch-59 Plan A（整理系 1）
- **status**: todo
- **開始日**: -

## 目的

`src-tauri/src/` のモジュール依存関係を Mermaid グラフとして文書化し、
循環依存・高結合箇所を可視化する。

## 技術方針

1. `cargo-depgraph` で依存グラフを DOT 形式で出力
2. 手動 or スクリプトで Mermaid LR 記法に変換
3. `docs/l2_architecture/module-graph.md` に保存

### コマンド

```bash
cargo install cargo-depgraph 2>/dev/null || true
cargo depgraph --all-deps 2>/dev/null | head -100
```

### レイヤー依存確認（違反検出）

- `commands/` → `services/` → `repositories/` → DB 一方向を確認
- 逆方向参照（services → commands 等）がないか

## 受け入れ条件

- [ ] `docs/l2_architecture/module-graph.md` が存在し Mermaid グラフを含む
- [ ] レイヤー違反がないことを明記
- [ ] `pnpm verify` 全通過（コード変更なし）
