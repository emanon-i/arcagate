# PH-20260425-250 Svelte コンポーネント依存グラフ

- **フェーズ**: batch-59 Plan B（整理系 2）
- **status**: done
- **開始日**: -

## 目的

`src/lib/components/` と `src/lib/state/` の依存関係を可視化し、
コンポーネントの凝集度・ファイル規模を把握する。

## 技術方針

1. `madge` で Svelte/TS の依存グラフを出力
2. LoC 計測（`tokei` 相当を Node で実行、または `wc -l`）
3. 最大依存コンポーネント（ファンアウト上位 5）を特定

### コマンド

```bash
pnpm add -D madge 2>/dev/null || true
node_modules/.bin/madge --circular src/
node_modules/.bin/madge --image /tmp/component-graph.svg src/lib/
```

成果物: `docs/l2_architecture/component-graph.md`（Mermaid + テキスト要約）

## 受け入れ条件

- [ ] `docs/l2_architecture/component-graph.md` が存在
- [ ] 循環依存がないことを確認（あれば記載）
- [ ] ファンアウト上位 5 コンポーネントのリスト
- [ ] `pnpm verify` 全通過（`madge` は devDependency に追加しない → スクリプト一時実行のみ）
