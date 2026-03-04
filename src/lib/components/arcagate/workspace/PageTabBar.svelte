<script lang="ts">
import Chip from '$lib/components/arcagate/common/Chip.svelte';
import { mockWorkspaces } from '$lib/mock/arcagate/workspace';

interface Props {
	activeWorkspace: string;
	currentTheme: 'dark' | 'light';
	onSelectWorkspace?: (name: string) => void;
	onToggleTheme?: () => void;
}

let { activeWorkspace, currentTheme, onSelectWorkspace, onToggleTheme }: Props = $props();

// TODO: ワークスペース一覧をバックエンド (cmd_list_workspaces) から取得する
// TODO: ページ追加ボタンに cmd_create_workspace を接続する
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-wrap items-center gap-2">
		{#each mockWorkspaces as ws}
			<Chip
				tone={ws.name === activeWorkspace ? "accent" : "default"}
				onclick={() => onSelectWorkspace?.(ws.name)}
			>
				{ws.name}
			</Chip>
		{/each}
		<button
			type="button"
			class="rounded-full border border-dashed border-[var(--ag-border-dashed)] px-3 py-1.5 text-xs text-[var(--ag-text-muted)]"
		>
			+ Add page
		</button>
	</div>
	<div class="flex flex-wrap gap-2">
		<Chip tone={currentTheme === "dark" ? "accent" : "default"} onclick={onToggleTheme}>
			Dark
		</Chip>
		<Chip tone={currentTheme === "light" ? "accent" : "default"} onclick={onToggleTheme}>
			Light
		</Chip>
		<Chip>Theme settings</Chip>
	</div>
</div>
