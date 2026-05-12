<script lang="ts">
interface Props {
	keys: string;
	description: string;
}

let { keys, description }: Props = $props();
</script>

<!-- audit batch deferred (2026-05-13) #4: whitespace-nowrap で KeyHint 内テキストを 1 行固定。
     palette が狭いとき keys / description が改行で見切れる問題を回避。 -->
<span class="whitespace-nowrap rounded-[var(--ag-radius-keyhint)] border border-[var(--ag-border)] bg-[var(--ag-surface-2)] px-2 py-1 text-xs text-[var(--ag-text-muted)]" title="{keys} {description}">
	{keys} {description}
</span>
