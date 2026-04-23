<script lang="ts">
import { open } from '@tauri-apps/plugin-dialog';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';
import { toastStore } from '$lib/state/toast.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import type { WorkspaceWidget } from '$lib/types/workspace';

let {
	widget,
	open: dialogOpen,
	onClose,
}: {
	widget: WorkspaceWidget;
	open: boolean;
	onClose: () => void;
} = $props();

interface WidgetConfig {
	max_items?: number;
	git_poll_interval_sec?: number;
	title?: string;
	description?: string;
	watched_folder?: string;
	auto_add?: boolean;
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
	projects: {
		max_items: 10,
		git_poll_interval_sec: 60,
		title: 'ウォッチフォルダー',
		description: '',
		watched_folder: '',
		auto_add: false,
	},
};

let maxItems = $derived(config.max_items ?? defaults[widget.widget_type]?.max_items ?? 10);
let gitPollInterval = $derived(
	config.git_poll_interval_sec ?? defaults[widget.widget_type]?.git_poll_interval_sec ?? 60,
);
let wsTitle = $derived(config.title ?? defaults[widget.widget_type]?.title ?? '');
let wsDescription = $derived(config.description ?? defaults[widget.widget_type]?.description ?? '');
let watchedFolder = $derived(
	config.watched_folder ?? defaults[widget.widget_type]?.watched_folder ?? '',
);
let autoAdd = $derived(config.auto_add ?? defaults[widget.widget_type]?.auto_add ?? false);

async function handlePickFolder() {
	const selected = await open({
		directory: true,
		multiple: false,
		title: '監視対象フォルダを選択',
	});
	if (!selected || Array.isArray(selected)) return;
	config = { ...config, watched_folder: selected };
}

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

async function handleSave() {
	const newConfig: WidgetConfig = {
		max_items: maxItems,
	};
	if (widget.widget_type === 'projects') {
		newConfig.git_poll_interval_sec = gitPollInterval;
		newConfig.title = wsTitle;
		newConfig.description = wsDescription;
		newConfig.watched_folder = watchedFolder;
		newConfig.auto_add = autoAdd;
	}
	try {
		await workspaceStore.updateWidgetConfig(widget.id, JSON.stringify(newConfig));
		toastStore.add('設定を保存しました', 'success');
		onClose();
	} catch {
		toastStore.add('保存に失敗しました', 'error');
	}
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
      transition:scale={{ duration: dNormal, start: 0.96, easing: cubicOut }}
    >
      <h3 class="mb-4 text-base font-semibold text-[var(--ag-text-primary)]">ウィジェット設定</h3>
      <form onsubmit={(e) => { e.preventDefault(); void handleSave(); }}>
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

          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-title">タイトル</label>
            <input
              id="ws-title"
              type="text"
              autocomplete="off"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={wsTitle}
              oninput={(e) => { config = { ...config, title: (e.target as HTMLInputElement).value }; }}
            />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-description">説明</label>
            <input
              id="ws-description"
              type="text"
              autocomplete="off"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={wsDescription}
              oninput={(e) => { config = { ...config, description: (e.target as HTMLInputElement).value }; }}
            />
          </div>

          <div class="space-y-1">
            <span class="text-sm font-medium text-[var(--ag-text-primary)]">監視対象フォルダ</span>
            <div class="flex items-center gap-2">
              <div class="min-w-0 flex-1 truncate rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-secondary)]">
                {watchedFolder || '未選択'}
              </div>
              <Button type="button" variant="outline" size="sm" onclick={handlePickFolder}>選択</Button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="ws-auto-add"
              type="checkbox"
              class="h-4 w-4 rounded border-[var(--ag-border)]"
              checked={autoAdd}
              onchange={(e) => { config = { ...config, auto_add: (e.target as HTMLInputElement).checked }; }}
            />
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-auto-add">自動追加</label>
          </div>
        {/if}
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onclick={onClose}>キャンセル</Button>
        <Button type="submit">保存</Button>
      </div>
      </form>
    </div>
  </div>
{/if}
