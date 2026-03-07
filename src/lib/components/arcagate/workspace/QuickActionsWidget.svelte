<script lang="ts">
import { Zap } from '@lucide/svelte';
import { open as dialogOpen, save } from '@tauri-apps/plugin-dialog';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { exportJson, importJson } from '$lib/ipc/export';
import { paletteStore } from '$lib/state/palette.svelte';
import { themeStore } from '$lib/state/theme.svelte';

interface QuickAction {
	label: string;
	onclick: () => void;
}

async function handleExport() {
	const path = await save({
		defaultPath: 'arcagate-export.json',
		filters: [{ name: 'JSON', extensions: ['json'] }],
	});
	if (path) await exportJson(path);
}

async function handleImport() {
	const result = await dialogOpen({
		filters: [{ name: 'JSON', extensions: ['json'] }],
	});
	if (result) await importJson(result);
}

function handleThemeToggle() {
	void themeStore.setThemeMode(themeStore.activeMode === 'dark' ? 'light' : 'dark');
}

const actions: QuickAction[] = [
	{ label: 'Open palette', onclick: () => paletteStore.open() },
	{ label: 'Import DB', onclick: () => void handleImport() },
	{ label: 'Export DB', onclick: () => void handleExport() },
	{ label: 'Theme toggle', onclick: handleThemeToggle },
	{
		label: 'Calculator',
		onclick: () => {
			paletteStore.open();
			void paletteStore.search('= ');
		},
	},
];
</script>

<WidgetShell title="Quick actions" icon={Zap}>
	<div class="grid grid-cols-2 gap-2 text-sm">
		{#each actions as action}
			<button
				type="button"
				class="rounded-2xl bg-[var(--ag-surface-3)] px-3 py-3 text-center text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)] transition-colors"
				onclick={action.onclick}
			>
				{action.label}
			</button>
		{/each}
	</div>
</WidgetShell>
