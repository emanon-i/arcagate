# PH-20260424-247 テーマ視覚差分 E2E（品質防衛）

- **フェーズ**: batch-58 Plan D（品質防衛）
- **status**: todo
- **開始日**: -

## 目的

テーマ切替の視覚差が退行しないよう、computed style を検証する E2E テストを追加する。
「Flat と Endfield で accent 色が異なること」「Endfield の bg が暗い青系であること」などを
ピンポイントで確認し、CSS 変数の誤上書きを即座に検出できる。

## テスト方針

スクリーンショット比較（ピクセルベース）は CI 環境でフレークしやすいため採用しない。
代わりに `page.evaluate()` で `getComputedStyle` を取り、特定 CSS 変数の値を検証する。

```typescript
// テーマ切替後に特定 CSS 変数が期待値を返すことを確認
const accent = await page.evaluate(
  () => getComputedStyle(document.documentElement).getPropertyValue('--ag-accent').trim()
);
expect(accent).toBe('#3ecfcf'); // Endfield accent
```

## テスト項目

| テーマ         | 検証変数            | 期待値の性質                             |
| -------------- | ------------------- | ---------------------------------------- |
| dark（Flat）   | `--ag-accent`       | `#22d3ee` 系シアン                       |
| Endfield       | `--ag-accent`       | Endfield 固有シアン（dark と異なる）     |
| Endfield       | `--ag-surface-page` | `#0d1422` 系（Flat dark より明るい深青） |
| Ubuntu Frosted | `--ag-accent`       | `#e95420`（オレンジ）                    |
| Liquid Glass   | `--ag-backdrop`     | `blur(...)` 含む文字列                   |

## 受け入れ条件

- [ ] 4 テーマそれぞれの代表 CSS 変数値を E2E で検証するテストが存在する
- [ ] CI（GitHub Actions）で全テスト通過
- [ ] `pnpm verify` 全通過
