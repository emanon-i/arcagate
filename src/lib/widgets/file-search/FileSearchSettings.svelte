<script lang="ts">
/**
 * PH-issue-026 (Issue 23): FileSearchSettings polish — folder picker を shadcn Button に統一。
 */
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';

interface Props {
	config: {
		root?: string;
		depth?: number;
		limit?: number;
		title?: string;
	};
}

let { config = $bindable() }: Props = $props();

let fsRoot = $derived(config.root ?? '');
let fsDepth = $derived(config.depth ?? 2);
let fsLimit = $derived(config.limit ?? 200);
let fsTitle = $derived(config.title ?? '');

async function handlePickFolder() {
	const selected = await open({
		directory: true,
		multiple: false,
		title: t('widgets.file_search.picker_title'),
	});
	if (selected && !Array.isArray(selected)) {
		config = { ...config, root: selected };
	}
}
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-root">{t('widgets.file_search.root_label')}</label>
	<div class="flex gap-2">
		<input
			id="ws-fs-root"
			type="text"
			autocomplete="off"
			placeholder={t('widgets.common.folder.placeholder')}
			class="min-w-0 flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
			value={fsRoot}
			oninput={(e) => {
				config = { ...config, root: (e.currentTarget as HTMLInputElement).value };
			}}
		/>
		<Button type="button" variant="outline" size="sm" onclick={handlePickFolder}>{t('widgets.common.folder.pick_button')}</Button>
	</div>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-depth">{t('widgets.file_search.depth_label')}</label>
	<input
		id="ws-fs-depth"
		type="number"
		min="1"
		max="3"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={fsDepth}
		onchange={(e) => {
			config = {
				...config,
				depth: Math.max(
					1,
					Math.min(3, Number((e.currentTarget as HTMLInputElement).value) || 2),
				),
			};
		}}
	/>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-limit">{t('widgets.file_search.limit_label')}</label>
	<input
		id="ws-fs-limit"
		type="number"
		min="10"
		max="2000"
		step="10"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={fsLimit}
		onchange={(e) => {
			config = {
				...config,
				limit: Math.max(
					10,
					Math.min(2000, Number((e.currentTarget as HTMLInputElement).value) || 200),
				),
			};
		}}
	/>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-title">{t('widgets.settings.title_label')}</label>
	<input
		id="ws-fs-title"
		type="text"
		autocomplete="off"
		placeholder={t('widgets.file_search.default_title')}
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={fsTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
