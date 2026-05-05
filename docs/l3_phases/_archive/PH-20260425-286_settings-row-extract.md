---
id: PH-20260425-286
status: done
batch: 66
type: 改善
---

# PH-286: Settings UI 重複削減（ColorRow / RangeRow snippet 抽出）

## 参照した規約

- `arcagate-engineering-principles.md` §7 リファクタ発動条件: Duplicate code（5 行 × 3 箇所）
- `feedback_simplify_before_commit.md`
- batch-65 simplify レビューの MEDIUM Quality-1 指摘

## 背景・目的

`LibraryCardSettings.svelte` で同一構造の color picker × 4 / range slider × 3 が並んでいる。Quality-1 指摘で「80 行減らせる」とあった。batch-65 では scope 外で見送り、本 Plan で吸収。

## 仕様

### Svelte 5 snippet 抽出

`LibraryCardSettings.svelte` 内で snippet を定義（独立コンポーネントは過剰、snippet 1 ファイル内で十分）:

```svelte
{#snippet ColorRow(label: string, value: string, oninput: (v: string) => void, testid: string)}
  <label class="flex items-center justify-between gap-3 text-sm">
    <span class="text-[var(--ag-text-secondary)]">{label}</span>
    <input
      type="color"
      {value}
      oninput={(e) => oninput(e.currentTarget.value)}
      data-testid={testid}
      class="h-8 w-16 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent"
    />
  </label>
{/snippet}

{#snippet RangeRow(label: string, value: number, min: number, max: number, step: number, oninput: (v: number) => void, testid: string, suffix: string)}
  <label class="flex items-center justify-between gap-3 text-sm">
    <span class="text-[var(--ag-text-secondary)]">{label}</span>
    <input
      type="range"
      {value} {min} {max} {step}
      oninput={(e) => oninput(Number(e.currentTarget.value))}
      data-testid={testid}
      class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--ag-surface-4)] accent-[var(--ag-accent-text)]"
    />
    <span class="w-10 text-right text-xs tabular-nums text-[var(--ag-text-muted)]">{value}{suffix}</span>
  </label>
{/snippet}
```

各 picker / slider を `{@render ColorRow(...)}` / `{@render RangeRow(...)}` で呼ぶ。

### 期待行数削減

- 現状: 178 行
- 目標: ~100 行（80 行削減）

### data-testid は維持

E2E spec が依存しているため、`library-text-color` / `library-stroke-color` 等の testid 値は変えない。

## 受け入れ条件

- [ ] LibraryCardSettings.svelte が ~100 行以下 [Structure]
- [ ] 既存 E2E（settings.spec.ts / library-card-spec.spec.ts）が緑のまま [P consistency]
- [ ] data-testid 値は不変 [P consistency]
- [ ] snippet 化により全 color picker / range slider が同一表示 [Function]
- [ ] `pnpm verify` 全通過

## 自己検証

- LibraryCardSettings 開いて全 picker / slider が機能することを CDP 確認
- 切替時の即時反映が変わらない
