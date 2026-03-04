<script lang="ts">
import { Zap } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';
import { quickActions } from '$lib/mock/arcagate/workspace';

// TODO: quickActions をバックエンド (cmd_list_quick_actions) から取得する
// TODO: 各アクションの onclick ハンドラーを接続する
</script>

<WidgetShell title="Quick actions" icon={Zap} badge="Keyboard" source="Global actions">
	<div class="grid grid-cols-2 gap-2 text-sm">
		{#each quickActions as action}
			<div class="rounded-2xl bg-[var(--ag-surface-3)] px-3 py-3 text-center text-[var(--ag-text-secondary)]">
				{action}
			</div>
		{/each}
	</div>
</WidgetShell>
