<script lang="ts">
import { ExternalLink, Info } from '@lucide/svelte';
import { onMount } from 'svelte';

let appVersion = $state<string | null>(null);
let tauriVersion = $state<string | null>(null);

onMount(async () => {
	try {
		const { getVersion, getTauriVersion } = await import('@tauri-apps/api/app');
		appVersion = await getVersion();
		tauriVersion = await getTauriVersion();
	} catch {
		// ブラウザ環境（テスト等）では Tauri API が無いため fallback
		appVersion = 'unknown';
	}
});

const repoUrl = 'https://github.com/emanon-i/arcagate';
</script>

<div class="space-y-5">
	<div class="flex items-center gap-3">
		<div class="rounded-full bg-[var(--ag-surface-2)] p-2 text-[var(--ag-text-muted)]">
			<Info class="h-5 w-5" />
		</div>
		<div>
			<h3 class="text-base font-semibold text-[var(--ag-text-primary)]">Arcagate</h3>
			<p class="text-xs text-[var(--ag-text-secondary)]">
				PC上に散在する起動元を集約する個人用コマンドパレット
			</p>
		</div>
	</div>

	<dl class="space-y-2 text-sm">
		<div class="flex justify-between">
			<dt class="text-[var(--ag-text-muted)]">Version</dt>
			<dd
				class="font-mono text-[var(--ag-text-primary)]"
				data-testid="about-app-version"
			>
				{appVersion ?? '...'}
			</dd>
		</div>
		{#if tauriVersion}
			<div class="flex justify-between">
				<dt class="text-[var(--ag-text-muted)]">Tauri</dt>
				<dd class="font-mono text-[var(--ag-text-primary)]">{tauriVersion}</dd>
			</div>
		{/if}
		<div class="flex justify-between">
			<dt class="text-[var(--ag-text-muted)]">License</dt>
			<dd class="text-[var(--ag-text-primary)]">MIT</dd>
		</div>
	</dl>

	<a
		href={repoUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-1.5 text-sm text-[var(--ag-accent-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
	>
		<ExternalLink class="h-3.5 w-3.5" />
		ソースコード
	</a>
</div>
