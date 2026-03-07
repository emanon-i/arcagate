<script lang="ts">
import {
	Download,
	Monitor,
	Moon,
	Palette,
	Pencil,
	Plus,
	Sun,
	Trash2,
	Upload,
} from '@lucide/svelte';
import { open as dialogOpen, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import type { Theme } from '$lib/types/theme';

// Form state
let showForm = $state(false);
let editingTheme = $state<Theme | null>(null);
let formName = $state('');
let formBaseTheme = $state<'dark' | 'light'>('dark');
let formCssVars = $state('{}');
let formError = $state<string | null>(null);

const modeButtons = [
	{ mode: 'dark' as const, label: 'Dark', icon: Moon },
	{ mode: 'light' as const, label: 'Light', icon: Sun },
	{ mode: 'system' as const, label: 'System', icon: Monitor },
];

const customThemes = $derived(themeStore.themes.filter((t) => !t.is_builtin));

function isActive(mode: string): boolean {
	return themeStore.activeMode === mode;
}

function resetFormState() {
	editingTheme = null;
	formName = '';
	formBaseTheme = 'dark';
	formCssVars = '{}';
	formError = null;
}

function openCreateForm() {
	resetFormState();
	showForm = true;
}

function openEditForm(theme: Theme) {
	resetFormState();
	editingTheme = theme;
	formName = theme.name;
	formBaseTheme = theme.base_theme as 'dark' | 'light';
	formCssVars = theme.css_vars;
	showForm = true;
}

function closeForm() {
	showForm = false;
	resetFormState();
}

async function handleSave() {
	formError = null;
	try {
		JSON.parse(formCssVars);
	} catch {
		formError = 'CSS variables must be valid JSON';
		return;
	}

	if (editingTheme) {
		const result = await themeStore.updateTheme(
			editingTheme.id,
			formName,
			formBaseTheme,
			formCssVars,
		);
		if (result) closeForm();
		else formError = themeStore.error;
	} else {
		const result = await themeStore.createTheme(formName, formBaseTheme, formCssVars);
		if (result) closeForm();
		else formError = themeStore.error;
	}
}

async function handleDelete(theme: Theme) {
	await themeStore.deleteTheme(theme.id);
}

async function handleExport(theme: Theme) {
	const json = await themeStore.exportTheme(theme.id);
	if (!json) return;

	const path = await save({
		defaultPath: `${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`,
		filters: [{ name: 'JSON', extensions: ['json'] }],
	});
	if (path) {
		await writeTextFile(path, json);
	}
}

async function handleImport() {
	const result = await dialogOpen({
		filters: [{ name: 'JSON', extensions: ['json'] }],
	});
	if (!result) return;

	try {
		const json = await readTextFile(result);
		await themeStore.importTheme(json);
	} catch (e) {
		formError = String(e);
	}
}
</script>

<WidgetShell title="Theme controls" icon={Palette}>
	<div class="space-y-3">
		<!-- Mode selector: Dark / Light / System -->
		<div class="grid grid-cols-3 gap-2">
			{#each modeButtons as btn}
				<button
					type="button"
					class="flex items-center justify-center gap-1.5 rounded-[var(--ag-radius-card)] border p-2.5 text-sm transition-colors {isActive(btn.mode)
						? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-bg)] text-[var(--ag-text-primary)]'
						: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)] text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]'}"
					onclick={() => void themeStore.setThemeMode(btn.mode)}
				>
					<btn.icon class="h-4 w-4" />
					{btn.label}
				</button>
			{/each}
		</div>

		<!-- Custom themes list -->
		{#if customThemes.length > 0}
			<div class="space-y-1.5">
				<div class="text-xs font-medium text-[var(--ag-text-muted)]">Custom themes</div>
				{#each customThemes as theme}
					<div
						class="flex items-center justify-between rounded-[var(--ag-radius-card)] border p-2.5 {isActive(theme.id)
							? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-bg)]'
							: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)]'}"
					>
						<button
							type="button"
							class="flex-1 text-left text-sm text-[var(--ag-text-primary)]"
							onclick={() => void themeStore.setThemeMode(theme.id)}
						>
							{theme.name}
							<span class="ml-1 text-xs text-[var(--ag-text-faint)]">({theme.base_theme})</span>
						</button>
						<div class="flex gap-1">
							<button
								type="button"
								class="rounded-lg p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)]"
								onclick={() => openEditForm(theme)}
								aria-label="Edit {theme.name}"
							>
								<Pencil class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="rounded-lg p-1 text-[var(--ag-text-muted)] hover:bg-[var(--ag-surface-4)]"
								onclick={() => void handleExport(theme)}
								aria-label="Export {theme.name}"
							>
								<Download class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="rounded-lg p-1 text-[var(--ag-text-muted)] hover:text-red-400"
								onclick={() => void handleDelete(theme)}
								aria-label="Delete {theme.name}"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="flex gap-2">
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] transition-colors"
				onclick={openCreateForm}
			>
				<Plus class="h-3.5 w-3.5" />
				New
			</button>
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] transition-colors"
				onclick={() => void handleImport()}
			>
				<Upload class="h-3.5 w-3.5" />
				Import
			</button>
		</div>

		<!-- Create/Edit form (inline) -->
		{#if showForm}
			<div class="space-y-2.5 rounded-[var(--ag-radius-card)] border border-[var(--ag-border)] bg-[var(--ag-surface-4)] p-3">
				<div class="text-xs font-medium text-[var(--ag-text-muted)]">
					{editingTheme ? 'Edit theme' : 'New theme'}
				</div>

				<!-- Name -->
				<input
					type="text"
					class="w-full rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2.5 py-1.5 text-sm text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:border-[var(--ag-accent-active-border)] focus:outline-none"
					placeholder="Theme name"
					bind:value={formName}
				/>

				<!-- Base theme -->
				<div class="flex gap-2">
					<label class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-1.5 text-sm transition-colors {formBaseTheme === 'dark' ? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-bg)]' : 'border-[var(--ag-border)]'}">
						<input type="radio" class="sr-only" bind:group={formBaseTheme} value="dark" />
						<Moon class="h-3.5 w-3.5" />
						Dark base
					</label>
					<label class="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-1.5 text-sm transition-colors {formBaseTheme === 'light' ? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-bg)]' : 'border-[var(--ag-border)]'}">
						<input type="radio" class="sr-only" bind:group={formBaseTheme} value="light" />
						<Sun class="h-3.5 w-3.5" />
						Light base
					</label>
				</div>

				<!-- CSS vars -->
				<textarea
					class="w-full rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-2.5 py-1.5 font-mono text-xs text-[var(--ag-text-primary)] placeholder:text-[var(--ag-text-faint)] focus:border-[var(--ag-accent-active-border)] focus:outline-none"
					rows="5"
					placeholder={'{"--ag-accent": "#ff0000"}'}
					bind:value={formCssVars}
				></textarea>

				{#if formError}
					<div class="text-xs text-red-400">{formError}</div>
				{/if}

				<div class="flex gap-2">
					<button
						type="button"
						class="flex-1 rounded-lg bg-[var(--ag-accent-bg)] px-3 py-1.5 text-sm font-medium text-[var(--ag-text-primary)] hover:opacity-90 transition-opacity"
						onclick={() => void handleSave()}
					>
						Save
					</button>
					<button
						type="button"
						class="flex-1 rounded-lg border border-[var(--ag-border)] px-3 py-1.5 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-3)] transition-colors"
						onclick={closeForm}
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</div>
</WidgetShell>
