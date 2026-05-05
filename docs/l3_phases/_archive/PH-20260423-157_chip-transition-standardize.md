---
status: todo
phase_id: PH-20260423-157
scope_files:
  - src/lib/components/arcagate/common/Chip.svelte
parallel_safe: true
depends_on: []
---

# PH-20260423-157 Chip.svelte トランジション標準化 + active 状態追加

## 背景・目的

`Chip.svelte` の `onclick` あり（button）バリアントが裸の `transition` を使用しており:

1. Tailwind デフォルト（150ms ease）に依存 → CSS 変数と乖離
2. `active:scale` がなくプレス感ゼロ
3. `motion-reduce:transition-none` なし
4. `focus-visible:ring` がなくキーボードフォーカスが見えない

Chip はワークスペースタブ（PageTabBar）・パレットヘッダー（Alt+Space / 非表示トグル）・設定パネル等で使われるため影響範囲は広い。

## 実装仕様

### Chip.svelte テンプレート変更（onclick ありブランチ）

**Before:**

```svelte
<button
  type="button"
  class="rounded-full border transition {sizeClasses[size]} {toneClasses[tone]}"
  {onclick}
  {...restProps}
>
```

**After:**

```svelte
<button
  type="button"
  class="rounded-full border transition-[color,background-color,border-color,transform] duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] {sizeClasses[size]} {toneClasses[tone]}"
  {onclick}
  {...restProps}
>
```

`span`（onclick なし）バリアントは静的表示のみなのでトランジション不要。変更なし。

## 受け入れ条件

- [ ] button バリアントでホバー色変化が `--ag-duration-fast` でトランジション
- [ ] クリック時に `scale(0.97)` のプレス感がある
- [ ] Tab フォーカス時に cyan リングが表示される
- [ ] `motion-reduce:transition-none` が付与されている
- [ ] span バリアントは変更なし
- [ ] `pnpm verify` 全通過

## 注意事項

- `tone` ごとに hover スタイルは `toneClasses` では定義されていないが、border/background の transition は tone に関わらず必要
- PageTabBar の active タブ（accent tone）は既にアクセント色で表示されているが、transition があることで切り替えが滑らかになる
