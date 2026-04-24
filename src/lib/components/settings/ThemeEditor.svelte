<script lang="ts">
import { Check, Trash2 } from '@lucide/svelte';
import { themeStore } from '$lib/state/theme.svelte';
import type { Theme } from '$lib/types/theme';

let { theme, onClose }: { theme: Theme; onClose: () => void } = $props();

type VarEntry = { key: string; value: string };

function parseVars(cssVars: string): VarEntry[] {
	try {
		const obj = JSON.parse(cssVars) as Record<string, string>;
		return Object.entries(obj).map(([key, value]) => ({ key, value }));
	} catch {
		return [];
	}
}

let entries = $state<VarEntry[]>(parseVars(theme.css_vars));
let saving = $state(false);
let saveError = $state<string | null>(null);
let confirmDelete = $state(false);

function isHex(value: string): boolean {
	return /^#[0-9a-f]{6}$/i.test(value);
}

function looksLikeColor(value: string): boolean {
	return /^(#|rgb|hsl)/i.test(value.trim());
}

function handleValueChange(idx: number, newValue: string) {
	entries[idx].value = newValue;
	document.documentElement.style.setProperty(entries[idx].key, newValue);
}

async function handleSave() {
	saving = true;
	saveError = null;
	const cssVars: Record<string, string> = {};
	for (const { key, value } of entries) {
		cssVars[key] = value;
	}
	const updated = await themeStore.updateTheme(
		theme.id,
		undefined,
		undefined,
		JSON.stringify(cssVars),
	);
	saving = false;
	if (!updated) {
		saveError = themeStore.error ?? '保存に失敗しました';
	}
}

async function handleDelete() {
	if (!confirmDelete) {
		confirmDelete = true;
		return;
	}
	await themeStore.deleteTheme(theme.id);
	onClose();
}

// Group vars by prefix for display
const GROUP_ORDER = [
	'--ag-bg',
	'--ag-surface',
	'--ag-border',
	'--ag-accent',
	'--ag-text',
	'--ag-error',
	'--ag-warm',
	'--ag-success',
	'--ag-shadow',
	'--ag-radius',
	'--ag-backdrop',
	'--ag-duration',
	'--ag-ease',
];

const grouped = $derived.by(() => {
	const groups: Record<string, VarEntry[]> = { その他: [] };
	for (const g of GROUP_ORDER) {
		groups[g] = [];
	}
	for (const entry of entries) {
		let matched = false;
		for (const g of GROUP_ORDER) {
			if (entry.key.startsWith(g)) {
				groups[g].push(entry);
				matched = true;
				break;
			}
		}
		if (!matched) groups['その他'].push(entry);
	}
	return Object.entries(groups).filter(([, vs]) => vs.length > 0);
});
</script>

<div class="mt-4 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-4">
	<div class="mb-3 flex items-center justify-between">
		<p class="text-sm font-semibold text-[var(--ag-text-primary)]">{theme.name} を編集</p>
		<div class="flex items-center gap-2">
			{#if !theme.is_builtin}
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--ag-error-text)] transition-colors hover:bg-[var(--ag-error-bg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
					onclick={handleDelete}
				>
					<Trash2 class="h-3.5 w-3.5" />
					{confirmDelete ? '本当に削除' : '削除'}
				</button>
			{/if}
			<button
				type="button"
				disabled={saving}
				class="flex items-center gap-1.5 rounded-md bg-[var(--ag-accent-bg)] px-3 py-1.5 text-xs font-medium text-[var(--ag-accent-text)] transition-colors hover:bg-[var(--ag-accent-active-bg)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ag-accent)]"
				onclick={handleSave}
			>
				<Check class="h-3.5 w-3.5" />
				{saving ? '保存中…' : '保存'}
			</button>
		</div>
	</div>

	{#if saveError}
		<p class="mb-2 text-xs text-[var(--ag-error-text)]">{saveError}</p>
	{/if}

	<div class="max-h-80 space-y-4 overflow-y-auto pr-1">
		{#each grouped as [groupKey, vars]}
			<div>
				<p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ag-text-muted)]">
					{groupKey.replace('--ag-', '')}
				</p>
				<div class="space-y-1.5">
					{#each vars as entry, i (entry.key)}
						{@const entryIdx = entries.indexOf(entry)}
						<div class="flex items-center gap-2">
							<span class="w-48 shrink-0 truncate text-[11px] text-[var(--ag-text-muted)]" title={entry.key}>
								{entry.key.replace('--ag-', '')}
							</span>
							{#if isHex(entry.value)}
								<input
									type="color"
									value={entry.value}
									oninput={(e) => handleValueChange(entryIdx, e.currentTarget.value)}
									class="h-6 w-8 shrink-0 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent p-0.5"
								/>
							{:else}
								{#if looksLikeColor(entry.value)}
									<span
										class="h-5 w-5 shrink-0 rounded-full border border-[var(--ag-border)]"
										style="background: {entry.value}"
									></span>
								{/if}
							{/if}
							<input
								type="text"
								value={entry.value}
								oninput={(e) => handleValueChange(entryIdx, e.currentTarget.value)}
								class="min-w-0 flex-1 rounded border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-0.5 font-mono text-[11px] text-[var(--ag-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
							/>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
