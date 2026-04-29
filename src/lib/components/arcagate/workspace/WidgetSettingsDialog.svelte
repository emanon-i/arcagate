<script lang="ts">
import { Trash2 } from '@lucide/svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { WIDGET_LABELS, type WorkspaceWidget } from '$lib/types/workspace';
import { widgetRegistry } from '$lib/widgets';

let {
	widget,
	open: dialogOpen,
	onClose,
}: {
	widget: WorkspaceWidget;
	open: boolean;
	onClose: () => void;
} = $props();

let config = $state<Record<string, unknown>>({});

$effect(() => {
	if (widget.config) {
		try {
			config = JSON.parse(widget.config) as Record<string, unknown>;
		} catch {
			config = {};
		}
	} else {
		config = {};
	}
});

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

let SettingsContent = $derived(widgetRegistry[widget.widget_type]?.SettingsContent);

async function handleSave() {
	try {
		await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(config));
		toastStore.add('設定を保存しました', 'success');
		onClose();
	} catch {
		toastStore.add('保存に失敗しました', 'error');
	}
}

// 検収 #4: Settings dialog から widget 削除 (即削除)。
// 検収 #2: toast 文言から「Ctrl+Z で戻せます」を削除。
function handleDelete() {
	void workspaceStore.removeWidget(widget.id);
	toastStore.add('ウィジェットを削除しました', 'info');
	onClose();
}
</script>

{#if dialogOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: dFast }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
	>
		<div
			class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-opaque)] p-6 shadow-[var(--ag-shadow-dialog)]"
			role="document"
			aria-labelledby="widget-settings-title"
			transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
		>
			<!-- PH-issue-026 (Issue 23): widget label を含めた title。aria-labelledby でアクセシブル。 -->
			<h3 id="widget-settings-title" class="mb-4 text-base font-semibold text-[var(--ag-text-primary)]">
				{WIDGET_LABELS[widget.widget_type] ?? 'ウィジェット'} の設定
			</h3>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					void handleSave();
				}}
			>
				<div class="space-y-4">
					{#if SettingsContent}
						<SettingsContent bind:config />
					{:else}
						<p class="text-sm text-[var(--ag-text-secondary)]">このウィジェットには設定項目がありません。</p>
					{/if}
				</div>

				<!-- PH-issue-033 / 検収項目 #4: 左に削除 button、右に キャンセル / 保存。
				     destructive operation を主操作 (保存) と離して配置 (誤クリック防止)。 -->
				<div class="mt-6 flex items-center justify-between gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="text-destructive hover:bg-destructive/10 hover:text-destructive"
						onclick={handleDelete}
					>
						<Trash2 class="h-3.5 w-3.5" />
						このウィジェットを削除
					</Button>
					<div class="flex items-center gap-2">
						<Button type="button" variant="outline" onclick={onClose}>キャンセル</Button>
						<Button type="submit">保存</Button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
