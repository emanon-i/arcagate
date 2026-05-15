<script lang="ts">
import { Trash2 } from '@lucide/svelte';
import BaseDialog from '$lib/components/common/BaseDialog.svelte';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { type WorkspaceWidget, widgetLabel } from '$lib/types/workspace';
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

let SettingsContent = $derived(widgetRegistry[widget.widget_type]?.SettingsContent);

async function handleSave() {
	try {
		await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(config));
		toastStore.add(t('toast.settings_saved'), 'success');
		onClose();
	} catch {
		toastStore.add(t('toast.save_failed'), 'error');
	}
}

// 検収 #4: Settings dialog から widget 削除 (即削除)。
// 検収 #2: toast 文言から「Ctrl+Z で戻せます」を削除。
function handleDelete() {
	void workspaceStore.removeWidget(widget.id);
	toastStore.add(t('toast.widget_deleted'), 'info');
	onClose();
}
</script>

<!-- BaseDialog rewrite (Dialog wrapper unify Phase 2)。
     G-4 の 3-pane layout (header fixed + body scroll + footer fixed) は維持、
     boxClass で `!p-0 max-h-[85vh] flex flex-col` を渡して BaseDialog 既定 p-6 を override。 -->
<BaseDialog
	open={dialogOpen}
	{onClose}
	ariaLabelledby="widget-settings-title"
	size="sm"
	boxClass="max-h-[85vh] !p-0 flex flex-col"
>
	<!-- PH-issue-026 (Issue 23): widget label を含めた title。aria-labelledby でアクセシブル。 -->
	<h3
		id="widget-settings-title"
		class="flex-none border-b border-[var(--ag-border)] px-6 pb-4 pt-6 text-base font-semibold text-[var(--ag-text-primary)]"
	>
		{t('widgets.settings_dialog_title', { label: widgetLabel(widget.widget_type) })}
	</h3>
	<form
		class="flex min-h-0 flex-1 flex-col"
		onsubmit={(e) => {
			e.preventDefault();
			void handleSave();
		}}
	>
		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
			{#if SettingsContent}
				<SettingsContent bind:config />
			{:else}
				<p class="text-sm text-[var(--ag-text-secondary)]">{t('widgets.no_settings')}</p>
			{/if}
		</div>

		<!-- PH-issue-033 / 検収項目 #4: 左に削除 button、右に キャンセル / 保存。
		     destructive operation を主操作 (保存) と離して配置 (誤クリック防止)。 -->
		<div class="flex flex-none items-center justify-between gap-2 border-t border-[var(--ag-border)] px-6 py-4">
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
</BaseDialog>
