<script lang="ts">
import { Palette } from '@lucide/svelte';
import WidgetShell from '$lib/components/arcagate/common/WidgetShell.svelte';

interface Props {
	currentTheme: 'dark' | 'light';
	onToggleTheme?: () => void;
}

let { currentTheme, onToggleTheme }: Props = $props();

// TODO: テーマ設定をバックエンドで永続化する (cmd_set_theme)
</script>

<WidgetShell title="Theme controls" icon={Palette} badge="Light / Dark" source="Workspace appearance">
	<div class="space-y-3">
		<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="rounded-[var(--ag-radius-card)] border p-3 text-left {currentTheme === 'dark'
					? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-bg)]'
					: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)]'}"
				onclick={onToggleTheme}
			>
				<div class="text-sm font-medium text-[var(--ag-text-primary)]">Dark theme</div>
				<div class="mt-1 text-xs leading-5 text-[var(--ag-text-muted)]">
					日常利用の既定テーマ。内部でアクセント色・角丸・密度を調整可能。
				</div>
			</button>
			<button
				type="button"
				class="rounded-[var(--ag-radius-card)] border p-3 text-left {currentTheme === 'light'
					? 'border-[var(--ag-accent-active-border)] bg-[var(--ag-accent-bg)]'
					: 'border-[var(--ag-border)] bg-[var(--ag-surface-3)]'}"
				onclick={onToggleTheme}
			>
				<div class="text-sm font-medium text-[var(--ag-text-primary)]">Light theme</div>
				<div class="mt-1 text-xs leading-5 text-[var(--ag-text-muted)]">
					画面共有や昼間利用向け。こちらも内部設定だけ個別に調整可能。
				</div>
			</button>
		</div>
		<div class="rounded-2xl bg-[var(--ag-surface-3)] px-3 py-3 text-sm text-[var(--ag-text-secondary)]">
			表には Light / Dark だけを出し、色味やシェイプはテーマ設定画面の中で編集する想定。
		</div>
	</div>
</WidgetShell>
