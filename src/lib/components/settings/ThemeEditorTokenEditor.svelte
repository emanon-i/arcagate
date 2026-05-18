<script lang="ts">
type VarEntry = { key: string; value: string };

/**
 * ThemeEditor の var token editor (group ごとの entry list、color picker + text input)。
 *
 * 引用元 guideline:
 *   docs/l1_requirements/code-refactor/a3-frontend-shape.md §3.1 (V5 解消、token editor 抽出)
 *
 * agent judgment: a3 元提案の "ThemeEditorCategoryList" は sidebar 風 category 一覧を
 * 想定するが、実装は inline group display のため CategoryList と TokenEditor を統合した。
 */
interface Props {
	entries: VarEntry[];
	grouped: [string, VarEntry[]][];
	onValueChange: (idx: number, newValue: string) => void;
}

let { entries, grouped, onValueChange }: Props = $props();

function isHex(value: string): boolean {
	return /^#[0-9a-f]{6}$/i.test(value);
}

function looksLikeColor(value: string): boolean {
	return /^(#|rgb|hsl|oklch|oklab|color-mix)/i.test(value.trim());
}
</script>

<div class="max-h-80 space-y-4 overflow-y-auto pr-1">
	{#each grouped as [groupKey, vars] (groupKey)}
		<div>
			<p
				class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]"
			>
				{groupKey.replace('--ag-', '').replace('--c-', 'seed')}
			</p>
			<div class="space-y-1.5">
				{#each vars as entry (entry.key)}
					{@const entryIdx = entries.indexOf(entry)}
					<div class="flex items-center gap-2">
						<span
							class="w-48 shrink-0 truncate text-xs text-[var(--ag-text-muted)]"
							title={entry.key}
						>
							{entry.key.replace('--ag-', '')}
						</span>
						{#if isHex(entry.value)}
							<input
								type="color"
								value={entry.value}
								oninput={(e) => onValueChange(entryIdx, e.currentTarget.value)}
								class="h-6 w-8 shrink-0 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent p-0.5"
							/>
						{:else if looksLikeColor(entry.value)}
							<span
								class="h-5 w-5 shrink-0 rounded-full border border-[var(--ag-border)]"
								style="background: {entry.value}"
							></span>
						{/if}
						<input
							type="text"
							value={entry.value}
							oninput={(e) => onValueChange(entryIdx, e.currentTarget.value)}
							class="min-w-0 flex-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-0.5 font-mono text-xs text-[var(--ag-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
						/>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
