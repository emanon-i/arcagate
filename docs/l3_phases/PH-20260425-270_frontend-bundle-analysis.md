---
id: PH-20260425-270
status: todo
batch: 63
type: 計測
---

# PH-270: フロントバンドル分析（依存予算ベースライン §5）

## 背景・目的

engineering-principles.md §5「計測ツール（アーキテクチャ棚卸しフェーズで初回計測 → ベースライン化）」に基づき、
フロントエンドバンドルサイズの初回定量計測を行い、ベースラインを確立する。

vision.md の目標: 単体 exe 20MB 以下 / idle メモリ 100MB 以下 / 起動 P95 2 秒以内。

## 計測内容

### rollup-plugin-visualizer によるバンドル可視化

`pnpm add -D rollup-plugin-visualizer` でプラグイン追加し、
`vite.config.ts` に一時的に組み込んで `pnpm build` を実行。

出力内容:

- `dist/stats.html` — treemap で各 chunk / dep の寄与を可視化
- 総バンドルサイズ (gzip 前後)
- チャンク別サイズ top 10
- 依存ライブラリ別寄与 top 10

### 計測コマンド

```bash
# dist/ ディレクトリのサイズ確認
du -sh dist/
find dist/ -name "*.js" -exec wc -c {} + | sort -n | tail -20
find dist/ -name "*.css" -exec wc -c {} + | sort -n | tail -10
```

## 成果物

- `docs/l2_architecture/bundle-baseline.md` 新設
  - 計測日・ツール・フロントバンドルサイズ数値を記録
  - treemap HTML は `docs/l2_architecture/assets/` に格納（.gitignore 対象外）

## 受け入れ条件

- [ ] フロントバンドル総サイズが計測・記録される
- [ ] チャンク別 / 依存ライブラリ別 top 10 が記録される
- [ ] vision.md の 20MB exe 制約との整合確認
- [ ] `pnpm verify` 全通過（rollup-plugin-visualizer は devDep のみ、本番バンドルに影響しない）
