<script lang="ts">
import { ArrowRightLeft, Clock3 } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { recentLaunches } from '$lib/mock/arcagate/workspace';

// TODO: recentLaunches をバックエンド (cmd_list_recent_launches) から取得する
</script>

<WidgetShell title="Recent launches" icon={Clock3} badge="This morning" source="Usage log from Library">
	<div class="space-y-2">
		{#each recentLaunches as [label, time]}
			<div
				class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-3 text-sm"
			>
				<div class="flex items-center gap-3 text-[var(--ag-text-secondary)]">
					<div class="h-2.5 w-2.5 rounded-full bg-cyan-300"></div>
					<span>{label}</span>
				</div>
				<span class="text-[var(--ag-text-muted)]">{time}</span>
			</div>
		{/each}
	</div>
	<div class="mt-3 flex justify-end">
		<button
			type="button"
			class="flex items-center gap-2 rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-xs text-[var(--ag-text-secondary)]"
		>
			<ArrowRightLeft class="h-4 w-4" />
			Open in Library
		</button>
	</div>
</WidgetShell>
