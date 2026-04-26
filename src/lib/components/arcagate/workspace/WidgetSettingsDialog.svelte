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
	sort_field?: 'default' | 'name';
	font_size?: 'sm' | 'md' | 'lg';
	note?: string;
	// Clock widget
	show_seconds?: boolean;
	show_date?: boolean;
	show_weekday?: boolean;
	use_24h?: boolean;
	// ExeFolder widget
	watch_path?: string;
	scan_depth?: number;
	item_overrides?: Record<string, string>;
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
let sortField = $derived(config.sort_field ?? 'default');
let fontSize = $derived<'sm' | 'md' | 'lg'>(config.font_size ?? 'md');
// Clock widget defaults
let showSeconds = $derived(config.show_seconds ?? true);
let showDate = $derived(config.show_date ?? true);
let showWeekday = $derived(config.show_weekday ?? true);
let use24h = $derived(config.use_24h ?? true);
// ExeFolder widget defaults
let watchPath = $derived(config.watch_path ?? '');
let scanDepth = $derived(config.scan_depth ?? 2);
let exeFolderTitle = $derived(config.title ?? '');

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
	let newConfig: WidgetConfig;
	if (widget.widget_type === 'quick_note') {
		newConfig = { ...config, font_size: fontSize };
	} else if (widget.widget_type === 'projects') {
		newConfig = {
			max_items: maxItems,
			sort_field: sortField,
			git_poll_interval_sec: gitPollInterval,
			title: wsTitle,
			description: wsDescription,
			watched_folder: watchedFolder,
			auto_add: autoAdd,
		};
	} else if (widget.widget_type === 'clock') {
		newConfig = {
			show_seconds: showSeconds,
			show_date: showDate,
			show_weekday: showWeekday,
			use_24h: use24h,
		};
	} else if (widget.widget_type === 'exe_folder') {
		newConfig = {
			watch_path: watchPath,
			scan_depth: Math.max(1, Math.min(3, scanDepth)),
			title: exeFolderTitle,
			item_overrides: config.item_overrides,
		};
	} else {
		newConfig = { max_items: maxItems, sort_field: sortField };
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
        {#if widget.widget_type === 'quick_note'}
          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-font-size">フォントサイズ</label>
            <select
              id="ws-font-size"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={fontSize}
              onchange={(e) => { config = { ...config, font_size: (e.target as HTMLSelectElement).value as 'sm' | 'md' | 'lg' }; }}
            >
              <option value="sm">小</option>
              <option value="md">中（デフォルト）</option>
              <option value="lg">大</option>
            </select>
          </div>
        {:else if widget.widget_type === 'clock'}
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-[var(--ag-text-primary)]">秒を表示</span>
            <input
              type="checkbox"
              data-testid="clock-show-seconds"
              checked={showSeconds}
              onchange={(e) => { config = { ...config, show_seconds: (e.currentTarget as HTMLInputElement).checked }; }}
              class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
            />
          </label>
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-[var(--ag-text-primary)]">日付を表示</span>
            <input
              type="checkbox"
              data-testid="clock-show-date"
              checked={showDate}
              onchange={(e) => { config = { ...config, show_date: (e.currentTarget as HTMLInputElement).checked }; }}
              class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
            />
          </label>
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-[var(--ag-text-primary)]">曜日を表示</span>
            <input
              type="checkbox"
              data-testid="clock-show-weekday"
              checked={showWeekday}
              onchange={(e) => { config = { ...config, show_weekday: (e.currentTarget as HTMLInputElement).checked }; }}
              class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
            />
          </label>
          <label class="flex items-center justify-between gap-3 text-sm">
            <span class="text-[var(--ag-text-primary)]">24 時間表示</span>
            <input
              type="checkbox"
              data-testid="clock-use-24h"
              checked={use24h}
              onchange={(e) => { config = { ...config, use_24h: (e.currentTarget as HTMLInputElement).checked }; }}
              class="h-4 w-4 cursor-pointer accent-[var(--ag-accent-text)]"
            />
          </label>
        {:else if widget.widget_type === 'exe_folder'}
          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-watch-path">監視フォルダ</label>
            <div class="flex gap-2">
              <input
                id="ws-watch-path"
                type="text"
                autocomplete="off"
                placeholder="例: D:\Tools"
                class="flex-1 rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
                value={watchPath}
                oninput={(e) => { config = { ...config, watch_path: (e.currentTarget as HTMLInputElement).value }; }}
              />
              <button
                type="button"
                class="rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-2 text-sm text-[var(--ag-text-secondary)] hover:bg-[var(--ag-surface-4)]"
                onclick={async () => {
                  const selected = await open({ directory: true, multiple: false, title: '監視するフォルダを選択' });
                  if (selected && !Array.isArray(selected)) {
                    config = { ...config, watch_path: selected };
                  }
                }}
              >
                参照
              </button>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-scan-depth">スキャン階層 (1〜3)</label>
            <input
              id="ws-scan-depth"
              type="number"
              min="1"
              max="3"
              autocomplete="off"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={scanDepth}
              onchange={(e) => { config = { ...config, scan_depth: Math.max(1, Math.min(3, Number((e.currentTarget as HTMLInputElement).value) || 2)) }; }}
            />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-exe-title">タイトル</label>
            <input
              id="ws-exe-title"
              type="text"
              autocomplete="off"
              placeholder="Exe Folders"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={exeFolderTitle}
              oninput={(e) => { config = { ...config, title: (e.currentTarget as HTMLInputElement).value }; }}
            />
          </div>
        {:else}
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

          <div class="space-y-1">
            <label class="text-sm font-medium text-[var(--ag-text-primary)]" for="ws-sort-field">並び順</label>
            <select
              id="ws-sort-field"
              class="w-full rounded-[var(--ag-radius-input)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-3 py-2 text-sm text-[var(--ag-text-primary)]"
              value={sortField}
              onchange={(e) => { config = { ...config, sort_field: (e.target as HTMLSelectElement).value as 'default' | 'name' }; }}
            >
              <option value="default">デフォルト（IPC 順）</option>
              <option value="name">名前順（A-Z）</option>
            </select>
          </div>
        {/if}

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
