---
status: done
phase_id: PH-20260423-149
title: "品質防衛: トークン存在 / motion-reduce / SE ミュートテスト"
depends_on: [PH-20260423-147, PH-20260423-148]
scope_files:
  - src/lib/styles/arcagate-theme.css
  - src/lib/state/sound.svelte.ts
  - src/lib/utils/sfx.ts
parallel_safe: false
---

# PH-20260423-149: 品質防衛テスト追加

## 目的

batch-32 で追加した CSS トークン・サウンド機能の品質を vitest でガードする。
「CSS カスタムプロパティは未定義でも pnpm verify で検出されない」
（lessons.md §CSS トークンの未定義はサイレントバグ）対策として、
必須トークンの存在を CI でチェックする。

## 実装ステップ

### Step 1: CSS トークン存在確認テスト

`src/lib/styles/arcagate-theme.test.ts` を新規作成:

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(__dirname, 'arcagate-theme.css'), 'utf-8');

const REQUIRED_TOKENS = [
  '--ag-duration-instant',
  '--ag-duration-fast',
  '--ag-duration-normal',
  '--ag-duration-slow',
  '--ag-ease-in-out',
  '--ag-ease-out',
  '--ag-ease-in',
  '--ag-ease-bounce',
  '--ag-shadow-none',
  '--ag-shadow-sm',
  '--ag-shadow-md',
  '--ag-shadow-dialog',
  '--ag-shadow-palette',
];

describe('arcagate-theme.css', () => {
  it.each(REQUIRED_TOKENS)('defines %s', (token) => {
    expect(css).toContain(token);
  });
});
```

### Step 2: motion-reduce テスト

```typescript
describe('prefers-reduced-motion', () => {
  it('has @media (prefers-reduced-motion: reduce) block', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
  it('sets --ag-duration-fast to 0ms in reduced motion', () => {
    const reduceBlock = css.split('prefers-reduced-motion: reduce')[1];
    expect(reduceBlock).toContain('--ag-duration-fast: 0ms');
  });
});
```

### Step 3: soundStore ユニットテスト

`src/lib/state/sound.svelte.test.ts` を新規作成:

```typescript
describe('soundStore', () => {
  it('soundEnabled defaults to true when localStorage is empty', () => { ... });
  it('setSoundEnabled persists to localStorage', () => { ... });
  it('soundVolume clamps to 0.0-1.0', () => { ... });
  it('setSoundEnabled false prevents playClick call', () => { ... });
});
```

（localStorage はテスト用にモック）

### Step 4: sfx.ts ユニットテスト

`src/lib/utils/sfx.test.ts` を新規作成:

```typescript
// Web Audio API を vitest でモック
describe('playClick', () => {
  it('does not throw when volume is 0', () => { ... });
  it('creates AudioContext on first call', () => { ... });
  it('does not create AudioContext when volume is 0', () => { ... });
});
```

## 受け入れ条件

- [ ] `arcagate-theme.test.ts` が存在し、13 必須トークンをチェックする
- [ ] `prefers-reduced-motion` ブロックの存在と `--ag-duration-fast: 0ms` を確認する
- [ ] `sound.svelte.test.ts` が soundEnabled デフォルト・localStorage 永続・clamp を確認する
- [ ] `sfx.test.ts` が playClick の基本動作を確認する
- [ ] `pnpm verify` 全通過（新規テストすべて green）
