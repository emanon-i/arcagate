<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';

let {
	widget,
	open,
	onClose,
}: {
	widget: WorkspaceWidget;
	open: boolean;
	onClose: () => void;
} = $props();

interface WidgetConfig {
	max_items?: number;
	git_poll_interval_sec?: number;
}

let config = $state<WidgetConfig>({});

$effect(() => {
	if (widget.config) {
		try {
			config = JSON.parse(widget.config) as WidgetConfig;
		} catch {
			config = {};
		}
	} else {
		config = {};
	}
});

const defaults: Record<string, WidgetConfig> = {
	favorites: { max_items: 10 },
	recent: { max_items: 10 },
	projects: { max_items: 10, git_poll_interval_sec: 60 },
};

let maxItems = $derived(config.max_items ?? defaults[widget.widget_type]?.max_items ?? 10);
let gitPollInterval = $derived(
	config.git_poll_interval_sec ?? defaults[widget.widget_type]?.git_poll_interval_sec ?? 60,
);

async function handleSave() {
	const newConfig: WidgetConfig = {
		max_items: maxItems,
	};
	if (widget.widget_type === 'projects') {
		newConfig.git_poll_interval_sec = gitPollInterval;
	}
	await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(newConfig));
	onClose();
}
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-sm rounded-[var(--ag-radius-widget)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] p-6 shadow-[var(--ag-shadow-dialog)]">
      <h3 class="mb-4 text-base font-semibold text-[var(--ag-text-primary)]">ウィジェット設定</h3>

      <div class="space-y-4">
        <div class="space-y-1">
          <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-max-items">表示件数</label>
          <input
            id="ws-max-items"
            type="number"
            min="1"
            max="100"
            autocomplete="off"
            class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
            value={maxItems}
            onchange={(e) => { config = { ...config, max_items: parseInt((e.target as HTMLInputElement).value) || 10 }; }}
          />
        </div>

        {#if widget.widget_type === 'projects'}
          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-git-poll">Git ポーリング間隔（秒）</label>
            <input
              id="ws-git-poll"
              type="number"
              min="10"
              max="600"
              autocomplete="off"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={gitPollInterval}
              onchange={(e) => { config = { ...config, git_poll_interval_sec: parseInt((e.target as HTMLInputElement).value) || 60 }; }}
            />
          </div>
        {/if}
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onclick={onClose}>キャンセル</Button>
        <Button type="button" onclick={handleSave}>保存</Button>
      </div>
    </div>
  </div>
{/if}
