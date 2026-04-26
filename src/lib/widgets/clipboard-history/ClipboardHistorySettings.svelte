<script lang="ts">
interface Props {
	config: {
		max_items?: number;
		poll_interval_ms?: number;
		title?: string;
		history?: { id: string; text: string; addedAt: number }[];
	};
}

let { config = $bindable() }: Props = $props();

let clipboardMaxItems = $derived(config.max_items ?? 20);
let clipboardPollMs = $derived(config.poll_interval_ms ?? 1500);
let clipboardTitle = $derived(config.title ?? '');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-clip-max">保持する履歴数 (1〜200)</label>
	<input
		id="ws-clip-max"
		type="number"
		min="1"
		max="200"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={clipboardMaxItems}
		onchange={(e) => {
			config = {
				...config,
				max_items: Math.max(
					1,
					Math.min(200, Number((e.currentTarget as HTMLInputElement).value) || 20),
				),
			};
		}}
	/>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-clip-poll">ポーリング間隔（ミリ秒、500〜10000）</label>
	<input
		id="ws-clip-poll"
		type="number"
		min="500"
		max="10000"
		step="100"
		autocomplete="off"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={clipboardPollMs}
		onchange={(e) => {
			config = {
				...config,
				poll_interval_ms: Math.max(
					500,
					Math.min(10_000, Number((e.currentTarget as HTMLInputElement).value) || 1500),
				),
			};
		}}
	/>
</div>
<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-clip-title">タイトル</label>
	<input
		id="ws-clip-title"
		type="text"
		autocomplete="off"
		placeholder="クリップボード履歴"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={clipboardTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
