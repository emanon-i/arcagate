<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { scriptConfirm } from '$lib/state/script-confirm.svelte';
import BaseDialog from './BaseDialog.svelte';

/**
 * audit F15 (2026-05-18): Command / Script アイテムの初回起動確認ダイアログ。
 *
 * `scriptConfirm` store (`$lib/state/script-confirm.svelte`) を購読し、 pending な
 * 確認要求があれば実行対象を提示して確認する。 +layout.svelte に 1 度だけ mount し、
 * 全 launch 経路 (launchItem 共通経路) からの確認要求をここで一元的に扱う。
 *
 * 実行対象 (command / script 文字列) を独立した code ブロックで明示することで、
 * 「何が実行されるか」 をユーザーが起動前に確認できるようにする。
 */
let pending = $derived(scriptConfirm.pending);
</script>

<!-- Enter → 実行: BaseDialog の Escape listener とは独立した別 window listener。 -->
<svelte:window
	onkeydown={(e) => {
		if (pending && e.key === 'Enter') scriptConfirm.respond(true);
	}}
/>

{#if pending}
	<BaseDialog
		open={true}
		onClose={() => scriptConfirm.respond(false)}
		ariaLabelledby="script-confirm-title"
		ariaDescribedby="script-confirm-desc"
		size="sm"
	>
		<h3
			id="script-confirm-title"
			class="mb-2 text-base font-semibold text-[var(--ag-text-primary)]"
		>
			{t('dialog.script_launch_confirm_title')}
		</h3>
		<p id="script-confirm-desc" class="mb-3 text-sm text-[var(--ag-text-secondary)]">
			{t('dialog.script_launch_confirm_message')}
		</p>
		<pre
			class="mb-4 max-h-32 overflow-auto rounded bg-[var(--ag-surface-2)] px-3 py-2 font-mono text-xs whitespace-pre-wrap break-all text-[var(--ag-text-primary)]">{pending.target}</pre>
		<div class="flex justify-end gap-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={() => scriptConfirm.respond(false)}
			>
				{t('common.cancel')}
			</Button>
			<Button
				type="button"
				variant="default"
				size="sm"
				onclick={() => scriptConfirm.respond(true)}
			>
				{t('dialog.script_launch_confirm_run')}
			</Button>
		</div>
	</BaseDialog>
{/if}
