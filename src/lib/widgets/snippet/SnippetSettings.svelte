<script lang="ts">
/**
 * PH-issue-027 / 検収項目 #21 横展開: SnippetWidget 専用 Settings dialog content。
 *
 * 旧実装は CommonMaxItemsSettings (max_items + sort_field) を使っていたが、
 * SnippetConfig schema は `{ snippets, title }` で max_items は無い。
 * 本 component で title のみに置換。
 */
interface Props {
	config: {
		title?: string;
		snippets?: unknown[];
	};
}

let { config = $bindable() }: Props = $props();

let widgetTitle = $derived(config.title ?? '');
</script>

<div class="space-y-1">
	<label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-snippet-title">タイトル</label>
	<input
		id="ws-snippet-title"
		type="text"
		autocomplete="off"
		placeholder="スニペット"
		class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
		value={widgetTitle}
		oninput={(e) => {
			config = { ...config, title: (e.currentTarget as HTMLInputElement).value };
		}}
	/>
</div>
