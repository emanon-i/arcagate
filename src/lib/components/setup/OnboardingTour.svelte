<script lang="ts">
import { ArrowRight, HelpCircle, Settings as SettingsIcon, X as XIcon, Zap } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';
import { isOnboardingComplete, markOnboardingComplete } from '$lib/ipc/onboarding';
import { configStore } from '$lib/state/config.svelte';

// PH-427 / Codex Q5 #3: 初回起動時の OnboardingTour
// - SetupWizard とは役割分離 (SetupWizard = DB 初期化、本コンポーネント = 主要操作の学習)
// - 3 ステップ + skip + 「もう表示しない」(自動 mark)

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

interface Step {
	icon: typeof Zap;
	title: string;
	description: string;
}

const STEPS: Step[] = [
	{
		icon: Zap,
		title: 'Ctrl+Shift+Space でパレットを開く',
		description:
			'どこからでもグローバルホットキーでコマンドパレットが開きます。検索 → Enter で起動。',
	},
	{
		icon: HelpCircle,
		title: '? キーでヘルプを開く',
		description:
			'画面別の操作リファレンスとホットキー一覧が表示されます。困ったらいつでも `?` キー。',
	},
	{
		icon: SettingsIcon,
		title: 'Settings で見た目をカスタマイズ',
		description:
			'右上の歯車アイコンから設定パネル。テーマ・取り込みフォルダ・ライブラリ表示等を変更できます。',
	},
];

let isOpen = $state(false);
let currentStep = $state(0);

$effect(() => {
	// SetupWizard が完走 (configStore.setupComplete) してから判定
	if (!configStore.setupComplete) return;
	void isOnboardingComplete().then((done) => {
		if (!done) isOpen = true;
	});
});

async function handleClose() {
	isOpen = false;
	await markOnboardingComplete().catch(() => {
		// best-effort: 失敗しても次回起動時に再表示で OK
	});
}

function handleNext() {
	if (currentStep < STEPS.length - 1) {
		currentStep += 1;
	} else {
		void handleClose();
	}
}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-8"
		role="dialog"
		aria-modal="true"
		aria-labelledby="onboarding-title"
		data-testid="onboarding-tour"
		transition:fade={{ duration: dFast }}
		tabindex="-1"
	>
		<div
			class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-6 shadow-xl"
			transition:fly={{ y: 16, duration: dNormal }}
		>
			<div class="flex items-center justify-between">
				<p class="text-xs uppercase tracking-wider text-[var(--ag-text-muted)]">
					{currentStep + 1} / {STEPS.length}
				</p>
				<button
					type="button"
					class="rounded p-1 text-[var(--ag-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:bg-[var(--ag-surface-2)] hover:text-[var(--ag-text-primary)]"
					aria-label="ツアーをスキップ"
					data-testid="onboarding-skip"
					onclick={() => void handleClose()}
				>
					<XIcon class="h-4 w-4" />
				</button>
			</div>

			{#each [STEPS[currentStep]] as step (currentStep)}
				{@const Icon = step.icon}
				<div in:fly={{ x: 16, duration: dNormal }} class="flex flex-col items-center gap-3 text-center">
					<div class="rounded-full bg-[var(--ag-accent-bg)] p-4 text-[var(--ag-accent)]">
						<Icon class="h-8 w-8" />
					</div>
					<h2 id="onboarding-title" class="text-lg font-semibold text-[var(--ag-text-primary)]">
						{step.title}
					</h2>
					<p class="text-sm text-[var(--ag-text-secondary)]">
						{step.description}
					</p>
				</div>
			{/each}

			<div class="flex items-center justify-between gap-2 pt-2">
				<button
					type="button"
					class="text-xs text-[var(--ag-text-muted)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)] hover:text-[var(--ag-text-primary)]"
					onclick={() => void handleClose()}
				>
					もう表示しない
				</button>
				<Button
					type="button"
					variant="default"
					size="sm"
					onclick={handleNext}
					data-testid="onboarding-next"
				>
					{currentStep < STEPS.length - 1 ? '次へ' : '始める'}
					<ArrowRight class="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	</div>
{/if}
