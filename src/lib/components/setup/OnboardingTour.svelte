<script lang="ts">
import { Archive, ArrowRight, LayoutDashboard, Search, X as XIcon } from '@lucide/svelte';
import { fade, fly } from 'svelte/transition';
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/i18n.svelte';
import { isOnboardingComplete, markOnboardingComplete } from '$lib/ipc/onboarding';
import { configStore } from '$lib/state/config.svelte';

// PH-PQ-200 T4: SetupWizard 完走直後に発火する軽量ガイドツアー。
// 中央モーダルではなく、 主要 UI (Palette / Library / Workspace) を `data-tour` 属性で
// アンカーし、 実物にスポットライトを重ねて 3 step で指し示す。 各 step は skip 可。
// Settings の「セットアップを再実行」 からも再生される (configStore.restartSetup)。

const rm =
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dFast = rm ? 0 : 120;
const dNormal = rm ? 0 : 200;

interface TourStep {
	/** 対象 UI の data-tour 属性値。 */
	target: string;
	icon: typeof Search;
	titleKey: string;
	descriptionKey: string;
}

// アイコンは NAV_TOP と同じものを使い、 実 UI との対応を視覚的に学習させる。
const STEP_DEFS: TourStep[] = [
	{
		target: 'palette',
		icon: Search,
		titleKey: 'setup.onboarding.step1_title',
		descriptionKey: 'setup.onboarding.step1_desc',
	},
	{
		target: 'library',
		icon: Archive,
		titleKey: 'setup.onboarding.step2_title',
		descriptionKey: 'setup.onboarding.step2_desc',
	},
	{
		target: 'workspace',
		icon: LayoutDashboard,
		titleKey: 'setup.onboarding.step3_title',
		descriptionKey: 'setup.onboarding.step3_desc',
	},
];

interface Rect {
	top: number;
	left: number;
	width: number;
	height: number;
}

const POPOVER_W = 320;
// スポットライトと対象要素の余白 / popover と画面端の余白。
const SPOT_PAD = 6;
const GAP = 12;
const MARGIN = 16;

let isOpen = $state(false);
let currentStep = $state(0);
// 対象要素の矩形 (viewport 座標)。 null = 要素未検出 → popover を画面中央へ fallback。
let rect = $state<Rect | null>(null);
let dialogEl = $state<HTMLDivElement | null>(null);

const step = $derived(STEP_DEFS[currentStep]);
const isLast = $derived(currentStep === STEP_DEFS.length - 1);

$effect(() => {
	// SetupWizard が完走 (configStore.setupComplete) してから判定。
	if (!configStore.setupComplete) return;
	void isOnboardingComplete().then((done) => {
		if (!done) {
			// Settings からの再実行で再度開くケースに備え step を先頭へ戻す。
			currentStep = 0;
			isOpen = true;
		}
	});
});

// 表示中、 現在 step の対象要素を測定。 step 変更・window resize で再計測する。
$effect(() => {
	if (!isOpen) return;
	const targetSelector = `[data-tour="${step.target}"]`;
	function measure(): void {
		const el = document.querySelector(targetSelector);
		if (!el) {
			rect = null;
			return;
		}
		const r = el.getBoundingClientRect();
		rect = { top: r.top, left: r.left, width: r.width, height: r.height };
	}
	measure();
	window.addEventListener('resize', measure);
	return () => window.removeEventListener('resize', measure);
});

// 開いた直後にダイアログへ focus を移し、 キーボード操作 (Tab / Esc) を可能にする。
$effect(() => {
	if (isOpen && dialogEl) dialogEl.focus();
});

// スポットライト矩形 (対象要素 + 余白)。
const spotlightStyle = $derived(
	rect
		? `top:${rect.top - SPOT_PAD}px;left:${rect.left - SPOT_PAD}px;` +
				`width:${rect.width + SPOT_PAD * 2}px;height:${rect.height + SPOT_PAD * 2}px;`
		: null,
);

// popover は対象の直下に配置し、 画面端でクランプ。 対象が無ければ画面中央へ。
const popoverStyle = $derived.by(() => {
	if (!rect) return 'top:50%;left:50%;transform:translate(-50%,-50%);';
	const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
	const top = rect.top + rect.height + SPOT_PAD + GAP;
	const rawLeft = rect.left + rect.width / 2 - POPOVER_W / 2;
	const left = Math.max(MARGIN, Math.min(rawLeft, vw - POPOVER_W - MARGIN));
	return `top:${top}px;left:${left}px;`;
});

// 対象の中心を指す caret の popover 内 x 位置。
const caretLeft = $derived.by(() => {
	if (!rect) return null;
	const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
	const rawLeft = rect.left + rect.width / 2 - POPOVER_W / 2;
	const left = Math.max(MARGIN, Math.min(rawLeft, vw - POPOVER_W - MARGIN));
	const centerX = rect.left + rect.width / 2;
	return Math.max(16, Math.min(centerX - left, POPOVER_W - 16));
});

async function handleClose(): Promise<void> {
	isOpen = false;
	await markOnboardingComplete().catch(() => {
		// best-effort: 失敗しても次回起動時に再表示で OK。
	});
}

function handleNext(): void {
	if (isLast) {
		void handleClose();
	} else {
		currentStep += 1;
	}
}

function handleBack(): void {
	if (currentStep > 0) currentStep -= 1;
}

function handleKey(e: KeyboardEvent): void {
	if (!isOpen) return;
	if (e.key === 'Escape') {
		e.preventDefault();
		void handleClose();
	}
}
</script>

<svelte:window onkeydown={handleKey} />

{#if isOpen}
	<div
		class="fixed inset-0 z-[70]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="onboarding-title"
		data-testid="onboarding-tour"
		transition:fade={{ duration: dFast }}
	>
		<!-- PH-CF-1000 B1: TitleBar の drag region をオーバーレイが覆うため、 top に細い帯で
		     `data-tauri-drag-region` を露出させ window 移動を維持する (`features/cross-cutting/window-drag.md`
		     §オーバーレイ window 操作契約)。 spotlight より下層 (z 指定なし = stacking 順で先) に
		     配置し、 spotlight の対象ボタン操作を吸わない。 -->
		<div
			data-tauri-drag-region
			data-testid="overlay-drag-region"
			class="pointer-events-auto absolute inset-x-0 top-0 h-8"
			aria-hidden="true"
		></div>
		{#if spotlightStyle}
			<!-- スポットライト: box-shadow で対象以外を dim、 対象は accent ring で強調。 -->
			<div
				class="pointer-events-none fixed rounded-xl border-2 border-[var(--ag-accent)] transition-[top,left,width,height] duration-[var(--ag-duration-normal)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none"
				style="{spotlightStyle}box-shadow:0 0 0 9999px var(--scrim);"
			></div>
		{:else}
			<!-- 対象未検出時の fallback: 全面 dim。 -->
			<div class="pointer-events-none fixed inset-0 bg-[var(--scrim)]"></div>
		{/if}

		<div
			bind:this={dialogEl}
			tabindex="-1"
			class="fixed flex w-80 flex-col gap-3 rounded-lg border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-5 shadow-[var(--ag-shadow-dialog)] focus-visible:outline-none transition-[top,left] duration-[var(--ag-duration-normal)] ease-[var(--ag-ease-in-out)] motion-reduce:transition-none"
			style={popoverStyle}
		>
			{#if caretLeft !== null}
				<!-- 対象 UI を指す caret。 -->
				<div
					class="pointer-events-none absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-[var(--ag-border)] bg-[var(--ag-surface-1)]"
					style="left:{caretLeft - 6}px;"
				></div>
			{/if}

			<div class="flex items-center justify-between">
				<p class="text-xs uppercase tracking-wider text-[var(--ag-text-muted)]">
					{currentStep + 1} / {STEP_DEFS.length}
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

			{#key currentStep}
				{@const Icon = step.icon}
				<div
					in:fly={{ x: 12, duration: dNormal }}
					class="flex flex-col items-center gap-3 text-center"
				>
					<div class="rounded-full bg-[var(--ag-accent-bg)] p-3 text-[var(--ag-accent)]">
						<Icon class="h-7 w-7" />
					</div>
					<h2 id="onboarding-title" class="text-base font-semibold text-[var(--ag-text-primary)]">
						{t(step.titleKey)}
					</h2>
					<p class="text-sm text-[var(--ag-text-secondary)]">
						{t(step.descriptionKey)}
					</p>
				</div>
			{/key}

			<div class="flex items-center justify-between gap-2 pt-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={currentStep === 0}
					onclick={handleBack}
				>
					{t('common.back')}
				</Button>
				<Button
					type="button"
					variant="default"
					size="sm"
					onclick={handleNext}
					data-testid="onboarding-next"
				>
					{isLast ? t('setup.complete.start_button') : t('common.next')}
					<ArrowRight class="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	</div>
{/if}
