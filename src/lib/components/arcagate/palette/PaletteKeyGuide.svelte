<script lang="ts">
import KeyHint from '$lib/components/arcagate/common/KeyHint.svelte';

interface Props {
	/** "chips" renders the 3-col guide grid; "bar" renders the bottom keyboard hints */
	variant: 'chips' | 'bar';
}

let { variant }: Props = $props();
</script>

{#if variant === "chips"}
	<div class="grid grid-cols-3 gap-2 pt-3 text-xs text-[var(--ag-text-muted)]">
		<div class="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2">
			:dev で開発ツールのみ
		</div>
		<div class="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2">
			= で電卓
		</div>
		<div class="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2">
			&gt; で内蔵コマンド
		</div>
	</div>
{:else}
	<div class="mt-5 flex flex-wrap items-center gap-2">
		<KeyHint keys="↑ ↓" description="移動" />
		<KeyHint keys="Tab" description="詳細" />
		<KeyHint keys="Ctrl+H" description="非表示アイテム表示" />
		<KeyHint keys="Ctrl+K" description="アクション" />
	</div>
{/if}
