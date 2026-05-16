<script lang="ts">
import { ArrowRight, HelpCircle, Settings as SettingsIcon, X as XIcon, Zap } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
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
	titleKey: string;
	descriptionKey: string;
}

const STEP_DEFS: Step[] = [
	{
		icon: Zap,
		titleKey: 'setup.onboarding.step1_title',
		descriptionKey: 'setup.onboarding.step1_desc',
	},
	{
		icon: HelpCircle,
		titleKey: 'setup.onboarding.step2_title',
		descriptionKey: 'setup.onboarding.step2_desc',
	},
	{
		icon: SettingsIcon,
		titleKey: 'setup.onboarding.step3_title',
		descriptionKey: 'setup.onboarding.step3_desc',
	},
];

let isOpen = $state(false);
let currentStep = $state(0);
let STEPS = $derived(
	STEP_DEFS.map((s) => ({ icon: s.icon, title: t(s.titleKey), description: t(s.descriptionKey) })),
);

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
	<!-- B-6 #1: il-zone scope 撤去、accent は theme 追従。 -->
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
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t('setup.onboarding.skip_aria')}
					data-testid="onboarding-skip"
					onclick={() => void handleClose()}
				>
					<XIcon class="h-4 w-4" />
				</Button>
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
				<Button
					type="button"
					variant="link"
					size="sm"
					onclick={() => void handleClose()}
				>
					{t('setup.onboarding.no_more')}
				</Button>
				<Button
					type="button"
					variant="default"
					size="sm"
					onclick={handleNext}
					data-testid="onboarding-next"
				>
					{currentStep < STEPS.length - 1 ? t('common.next') : t('setup.complete.start_button')}
					<ArrowRight class="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	</div>
{/if}

