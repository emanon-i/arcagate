<script lang="ts">
import { ChevronRight, Star } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { favorites } from '$lib/mock/arcagate/workspace';

// TODO: favorites をバックエンド (cmd_list_favorites) から取得する
</script>

<WidgetShell title="Favorites" icon={Star} badge="Pinned {favorites.length}" source="Linked from Library">
	<div class="space-y-2">
		{#each favorites as item}
			<div
				class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5 text-sm text-[var(--ag-text-secondary)]"
			>
				<span>{item}</span>
				<ChevronRight class="h-4 w-4 text-[var(--ag-text-faint)]" />
			</div>
		{/each}
	</div>
</WidgetShell>
