<script lang="ts">
import { Lock } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';

// TODO: 非表示件数・一時表示状態をバックエンド (cmd_get_visibility_status) から取得する
</script>

<WidgetShell title="Visibility" icon={Lock} badge="Privacy" source="Workspace-only controls">
	<div class="space-y-3 text-sm text-[var(--ag-text-secondary)]">
		<div class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5">
			<span>非表示アイテム</span>
			<span class="text-[var(--ag-warm-text)]">22 件</span>
		</div>
		<div class="flex items-center justify-between rounded-2xl bg-[var(--ag-surface-3)] px-3 py-2.5">
			<span>一時表示</span>
			<span class="text-[var(--ag-success-text)]">OFF</span>
		</div>
		<div
			class="rounded-2xl border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-3 text-xs leading-5 text-[var(--ag-text-muted)]"
		>
			ストリーミング・会議前にまとめて隠せる導線を明示。
		</div>
	</div>
</WidgetShell>
