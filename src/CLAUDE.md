# src (SvelteKit frontend)

- **禁止事項** (color hardcode 禁止 = `var(--ag-*)` / `var(--c-*)` token 経由必須、`lib/components/ui/` 手動編集禁止):
  [`../.claude/rules/frontend.md`](../.claude/rules/frontend.md)
- **state (runes singleton `.svelte.ts`) / IPC wrapper / component 構成 / dirs**: [`../docs/l2_foundation/foundation.md`](../docs/l2_foundation/foundation.md)
- **design token の正本** (色 / radius / shadow / surface): [`../docs/l2_foundation/design-tokens.md`](../docs/l2_foundation/design-tokens.md)
- **UX 標準の正本** (motion / duration / 状態別色 / widget grid / perf 予算): [`../docs/l1_requirements/vision.md`](../docs/l1_requirements/vision.md)
- **文言 i18n 判定 / button variant**: [`../docs/l2_foundation/i18n-policy.md`](../docs/l2_foundation/i18n-policy.md) / [`button-usage.md`](../docs/l2_foundation/button-usage.md)
- **画面 UX/IA と契約**: [`../docs/l2_foundation/screens/`](../docs/l2_foundation/screens/) / [`features/screens/`](../docs/l2_foundation/features/screens/)、widget 仕様: [`features/widgets/`](../docs/l2_foundation/features/widgets/)
- **widget 追加の触る箇所チェックリスト**: [`../docs/l1_requirements/operations.md`](../docs/l1_requirements/operations.md) (Part 4)
- 全体の地図: [`../AGENTS.md`](../AGENTS.md)
