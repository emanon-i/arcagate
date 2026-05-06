<script lang="ts">
import ItemIcon from '$lib/components/arcagate/common/ItemIcon.svelte';

/**
 * ItemForm の識別フィールド (label / icon / aliases)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、basic 抽出)
 */
interface Props {
	label: string;
	iconPath: string;
	aliasesText: string;
	onSelectIcon: () => void;
}

let {
	label = $bindable(''),
	iconPath = $bindable(''),
	aliasesText = $bindable(''),
	onSelectIcon,
}: Props = $props();
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-label"
		>ラベル <span class="text-destructive">*</span></label
	>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		id="item-label"
		type="text"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
		bind:value={label}
		required
		autofocus
		placeholder="表示名"
	/>
</div>

<!-- J-6: アイコン画像プレビュー -->
<div class="space-y-1">
	<span class="text-sm font-medium text-[var(--ag-text-primary)]">アイコン</span>
	<div class="flex items-center gap-3">
		<div
			class="flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-2)]"
		>
			{#if iconPath}
				<ItemIcon iconPath={iconPath} alt="アイコン" class="h-16 w-16 object-contain" />
			{:else}
				<span class="text-xs text-[var(--ag-text-muted)]">なし</span>
			{/if}
		</div>
		<button
			type="button"
			class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:bg-[var(--ag-surface-4)]"
			onclick={onSelectIcon}
		>
			アイコンを選択
		</button>
		{#if iconPath}
			<button
				type="button"
				class="text-xs text-[var(--ag-text-muted)] transition-colors duration-[var(--ag-duration-fast)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none hover:text-destructive"
				onclick={() => {
					iconPath = '';
				}}
			>
				削除
			</button>
		{/if}
	</div>
</div>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="item-aliases"
		>エイリアス（カンマ区切り）</label
	>
	<input
		id="item-aliases"
		type="text"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-muted)]"
		bind:value={aliasesText}
		placeholder="alias1, alias2"
	/>
</div>
