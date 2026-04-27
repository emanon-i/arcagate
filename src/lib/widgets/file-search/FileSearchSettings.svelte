<script lang="ts">
import { open } from '@tauri-apps/plugin-dialog';

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
</script>

<div class="space-y-1">
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-root">検索ルートフォルダ</label>
	<div class="flex gap-2">
		<input
			id="ws-fs-root"
			type="text"
			autocomplete="off"
			placeholder="例: E:\Cella\Projects"
			class="flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
			value={fsRoot}
			oninput={(e) => {
				config = { ...config, root: (e.currentTarget as HTMLInputElement).value };
			}}
		/>
		<button
			type="button"
			class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-ag-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
			onclick={async () => {
				const selected = await open({
					directory: true,
					multiple: false,
					title: '検索ルートを選択',
				});
				if (selected && !Array.isArray(selected)) {
					config = { ...config, root: selected };
				}
			}}
		>
			参照
		</button>
	</div>
</div>
<div class="space-y-1">
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-depth">スキャン階層 (1〜3)</label>
	<input
		id="ws-fs-depth"
		type="number"
		min="1"
		max="3"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
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
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-limit">最大件数 (10〜2000)</label>
	<input
		id="ws-fs-limit"
		type="number"
		min="10"
		max="2000"
		step="10"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
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
	<label class="text-ag-sm font-medium text-[var(--ag-text-primary)]" for="ws-fs-title">タイトル</label>
	<input
		id="ws-fs-title"
		type="text"
		autocomplete="off"
		placeholder="ファイル検索"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-ag-sm text-[var(--ag-text-primary)]"
		value={fsTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
