<script lang="ts">
import { ChevronDown, ChevronRight, Shuffle } from '@lucide/svelte';
import { t } from '$lib/i18n.svelte';
import { themeStore } from '$lib/state/theme.svelte';
import type { Theme } from '$lib/types/theme';
import { BG_REF_DARK, BG_REF_LIGHT, cssColorToHex, randomSeedPair } from '$lib/utils/color';
import { detectAesthetic } from '$lib/utils/theme-aesthetic';
import ThemeEditorHeader from './ThemeEditorHeader.svelte';
import ThemeEditorTokenEditor from './ThemeEditorTokenEditor.svelte';

/**
 * ThemeEditor (design tokens v2) facade。
 *
 * v2: custom theme は «color seed (--c-primary / --c-secondary) を決めるだけ» が基本操作。
 * 派生する色全体は CSS 側 (oklch(from …) / color-mix()) が自動計算する。
 * - 上段: primary 必須 / secondary 任意の color picker + ランダム生成ボタン
 * - 下段: advanced — 全 token (--c-* / --ag-*) の生値編集 (折りたたみ、 power user 用)
 * 変更は即 documentElement に反映 (live preview)、 保存で css_vars に永続化。
 *
 * 引用元 guideline:
 *   docs/l2_foundation/design-tokens.md §A / §D / §G
 */

let { theme, onClose }: { theme: Theme; onClose: () => void } = $props();

/**
 * 編集対象の token 1 件。 `dirty` は「user が明示的に編集 / 保存済 token」 = 保存先 JSON に
 * 書き戻す対象、 を表す。 編集前に display のため computed value から init された entry は
 * `dirty=false` で保持し、 `handleSave` で JSON から除外する。 これにより LAYER 2 (`--ag-*`)
 * 派生 token が literal 凍結されず、 CSS の動的 chain (`--ag-accent: var(--c-primary)` 等) が
 * 温存される (DEV_REVIEW_R4_THREE_DEFECTS_2026-05-27 §2 ⑪ 根治、 推奨案 C dirty トラッキング)。
 */
type VarEntry = { key: string; value: string; dirty: boolean };

// color seed (--c-*) — v2 の編集主軸。 advanced で全 --ag-* も編集可能。
const SEED_VARS: string[] = [
	'--c-bg',
	'--c-fg',
	'--c-primary',
	'--c-secondary',
	'--c-glass-tint',
	'--c-warn',
	'--c-error',
	'--c-success',
];

const AG_VARS: string[] = [
	'--ag-surface-page',
	'--ag-surface-0',
	'--ag-surface-1',
	'--ag-surface-2',
	'--ag-surface-3',
	'--ag-surface-4',
	'--ag-surface-opaque',
	'--ag-border',
	'--ag-border-hover',
	'--ag-border-dashed',
	'--ag-accent',
	'--ag-accent-text',
	'--ag-accent-bg',
	'--ag-accent-border',
	'--ag-accent-secondary',
	'--ag-text-primary',
	'--ag-text-secondary',
	'--ag-text-muted',
	'--ag-text-faint',
	'--ag-error-bg',
	'--ag-error-border',
	'--ag-error-text',
	'--ag-warm-bg',
	'--ag-warm-border',
	'--ag-warm-text',
	'--ag-success-bg',
	'--ag-success-border',
	'--ag-success-text',
];

const ALL_VARS: string[] = [...SEED_VARS, ...AG_VARS];

const bgRef = $derived(theme.base_theme === 'light' ? BG_REF_LIGHT : BG_REF_DARK);

// 編集対象 theme から random 生成用 aesthetic を推定 (DEV_REVIEW_R4 §3 ⑫(b))。
// builtin id 一致 / css_vars signature の 2 段で判定 — custom theme でも source aesthetic に
// 沿った chroma / lightness レンジで random pair を生成する。
const aesthetic = $derived(detectAesthetic(theme));

function parseCssVarsMap(cssVars: string): Map<string, string> {
	try {
		const obj = JSON.parse(cssVars) as Record<string, string>;
		return new Map(Object.entries(obj));
	} catch {
		return new Map();
	}
}

function initEntries(): VarEntry[] {
	const overrides = parseCssVarsMap(theme.css_vars);
	const style = getComputedStyle(document.documentElement);
	return ALL_VARS.map((key) => {
		const override = overrides.get(key);
		if (override !== undefined && override !== '') {
			// JSON に明示値が保存されている token → 「user が以前 dirty 編集した」 として扱う。
			// 既存 freeze 済 theme (LAYER 2 が全て literal 凍結) の救済は本 fix の範囲外:
			// user が手動で advanced 編集で値を消すか、 別 PR で migration を実装する。
			return { key, value: override, dirty: true };
		}
		// 未保存 token → CSS の動的派生値を表示用に取得 (dirty=false で保持、 save から除外される)。
		return { key, value: style.getPropertyValue(key).trim(), dirty: false };
	});
}

// secondary が «明示的に指定済» かを theme.css_vars から判定 (function 内 access で
// reactive ではない初期値読み取り — editor は 1 theme に紐付き lifetime 中 theme は不変)。
function initSecondaryEnabled(): boolean {
	const o = parseCssVarsMap(theme.css_vars);
	return o.has('--c-secondary') && (o.get('--c-secondary') ?? '') !== '';
}

let entries = $state<VarEntry[]>(initEntries());
let savedCssVars = $state<VarEntry[]>(initEntries());
let saving = $state(false);
let saveError = $state<string | null>(null);
let savedSuccess = $state(false);
let confirmDelete = $state(false);
let showAdvanced = $state(false);
// secondary は «明示的に指定されたとき» のみ有効。 未指定なら CSS が primary 補色を自動派生。
let secondaryEnabled = $state(initSecondaryEnabled());

let editingName = $state(false);
let nameValue = $state('');

function entryIndex(key: string): number {
	return entries.findIndex((e) => e.key === key);
}

function setVar(key: string, value: string): void {
	const idx = entryIndex(key);
	if (idx < 0) return;
	entries[idx].value = value;
	entries[idx].dirty = true;
	document.documentElement.style.setProperty(key, value);
}

// color picker は hex を扱う。 現在値 (oklch / var 等) はブラウザに hex 解決させる。
const primaryHex = $derived(cssColorToHex(entries[entryIndex('--c-primary')]?.value || '#000000'));
const secondaryHex = $derived(
	cssColorToHex(entries[entryIndex('--c-secondary')]?.value || '#000000'),
);

function randomize(): void {
	// DEV_REVIEW_R4 §3 ⑫(b): aesthetic を編集中 theme から推定 (旧 `'glass'` ハードコード撤廃)。
	// brutalist → 鮮烈なレンジ、 neumorph → muted なレンジ、 glass → 中庸レンジ で random pair を生成。
	const pair = randomSeedPair(aesthetic, bgRef, primaryHex, secondaryHex);
	setVar('--c-primary', pair.primary);
	setVar('--c-secondary', pair.secondary);
	secondaryEnabled = true;
}

function toggleSecondary(enabled: boolean): void {
	secondaryEnabled = enabled;
	const idx = entryIndex('--c-secondary');
	if (idx < 0) return;
	if (enabled) {
		// 明示有効化: 現在 picker 値を inline style に書き戻し、 dirty にして JSON 保存対象とする。
		entries[idx].dirty = true;
		document.documentElement.style.setProperty('--c-secondary', entries[idx].value);
	} else {
		// 無効化: inline style を removeProperty → CSS rule (`oklch(from var(--c-primary) ...)`)
		// の primary 補色 auto 派生に戻す。 dirty=false で save から除外し、 JSON にも書かない
		// (= chain を温存)。
		entries[idx].dirty = false;
		document.documentElement.style.removeProperty('--c-secondary');
	}
}

function startNameEdit() {
	nameValue = theme.name;
	editingName = true;
}

async function commitNameEdit() {
	if (!editingName) return;
	editingName = false;
	const trimmed = nameValue.trim();
	if (!trimmed || trimmed === theme.name) return;
	await themeStore.updateTheme(theme.id, trimmed);
}

function cancelNameEdit() {
	editingName = false;
}

// isDirty: 「保存ボタンを enabled にするか」 の signal。 value の変化 / dirty フラグの変化の
// 両方を見て、 未保存変更がある状態を正確に検出する (advanced editor の inline edit / random
// click / toggleSecondary 経由のいずれでも dirty が立つ)。
const isDirty = $derived(
	entries.some((e, i) => e.value !== savedCssVars[i]?.value || e.dirty !== savedCssVars[i]?.dirty),
);

// unmount 時に未保存の CSS vars をリセットする。 dirty=false token は initEntries で computed
// value を持つだけで JSON に保存されないため、 unmount 時の「保存済 state に戻す」 行動は
// dirty=true なら setProperty、 dirty=false なら removeProperty (= CSS rule に戻す)。
$effect(() => {
	return () => {
		for (const saved of savedCssVars) {
			if (saved.dirty) {
				document.documentElement.style.setProperty(saved.key, saved.value);
			} else {
				document.documentElement.style.removeProperty(saved.key);
			}
		}
	};
});

function handleValueChange(idx: number, newValue: string) {
	entries[idx].value = newValue;
	entries[idx].dirty = true;
	document.documentElement.style.setProperty(entries[idx].key, newValue);
}

async function handleSave() {
	saving = true;
	saveError = null;
	const cssVars: Record<string, string> = {};
	// DEV_REVIEW_R4 §2 ⑪ 根治: dirty=true の token のみ JSON 化する。 未編集 token (= initEntries
	// で computed value を持つだけ) を literal 化しない → LAYER 2 (`--ag-*`) の `var(--c-primary)`
	// CSS chain が温存され、 後から primary を変えても派生 token が連動する。
	for (const { key, value, dirty } of entries) {
		if (!dirty) continue;
		if (key === '--c-secondary' && !secondaryEnabled) continue;
		cssVars[key] = value;
	}
	const updated = await themeStore.updateTheme(
		theme.id,
		undefined,
		undefined,
		JSON.stringify(cssVars),
	);
	saving = false;
	if (updated) {
		savedCssVars = entries.map((e) => ({ ...e }));
		savedSuccess = true;
		setTimeout(() => {
			savedSuccess = false;
		}, 2000);
	} else {
		saveError = themeStore.error ?? t('settings.appearance.save_failed');
	}
}

async function handleDelete() {
	if (!confirmDelete) {
		confirmDelete = true;
		return;
	}
	await themeStore.deleteTheme(theme.id);
	onClose();
}

// advanced editor: --c-* / --ag-* を prefix group 化。
const GROUP_ORDER = [
	'--c-',
	'--ag-surface',
	'--ag-border',
	'--ag-accent',
	'--ag-text',
	'--ag-error',
	'--ag-warm',
	'--ag-success',
];

const grouped = $derived.by(() => {
	const otherKey = t('settings.appearance.token_group_other');
	const groups: Record<string, VarEntry[]> = { [otherKey]: [] };
	for (const g of GROUP_ORDER) groups[g] = [];
	for (const entry of entries) {
		let matched = false;
		for (const g of GROUP_ORDER) {
			if (entry.key.startsWith(g)) {
				groups[g].push(entry);
				matched = true;
				break;
			}
		}
		if (!matched) groups[otherKey].push(entry);
	}
	return Object.entries(groups).filter(([, vs]) => vs.length > 0);
});
</script>

<div class="mt-4 rounded-xl border border-[var(--ag-border)] bg-[var(--ag-surface-1)] p-4">
	<ThemeEditorHeader
		themeName={theme.name}
		isBuiltin={theme.is_builtin}
		{isDirty}
		{saving}
		{savedSuccess}
		{confirmDelete}
		{editingName}
		bind:nameValue
		onStartNameEdit={startNameEdit}
		onCommitNameEdit={() => void commitNameEdit()}
		onCancelNameEdit={cancelNameEdit}
		onSave={() => void handleSave()}
		onDelete={() => void handleDelete()}
	/>

	{#if saveError}
		<p class="mb-2 text-xs text-[var(--ag-error-text)]">{saveError}</p>
	{/if}

	<!-- color seed editor (v2 の編集主軸) -->
	<div class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<label class="flex items-center gap-2 text-sm text-[var(--ag-text-primary)]" for="seed-primary">
				{t('settings.appearance.seed_primary')}
			</label>
			<div class="flex items-center gap-2">
				<input
					id="seed-primary"
					type="color"
					value={primaryHex}
					oninput={(e) => setVar('--c-primary', e.currentTarget.value)}
					class="h-7 w-10 shrink-0 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent p-0.5"
					data-testid="theme-editor-primary-color"
				/>
				<span class="w-20 font-mono text-xs text-[var(--ag-text-muted)]">{primaryHex}</span>
			</div>
		</div>

		<div class="flex items-center justify-between gap-3">
			<label class="flex items-center gap-2 text-sm text-[var(--ag-text-primary)]">
				<input
					type="checkbox"
					checked={secondaryEnabled}
					onchange={(e) => toggleSecondary(e.currentTarget.checked)}
					class="accent-[var(--ag-accent)]"
				/>
				{t('settings.appearance.seed_secondary')}
			</label>
			{#if secondaryEnabled}
				<div class="flex items-center gap-2">
					<input
						type="color"
						aria-label={t('settings.appearance.seed_secondary')}
						value={secondaryHex}
						oninput={(e) => setVar('--c-secondary', e.currentTarget.value)}
						class="h-7 w-10 shrink-0 cursor-pointer rounded border border-[var(--ag-border)] bg-transparent p-0.5"
					/>
					<span class="w-20 font-mono text-xs text-[var(--ag-text-muted)]">{secondaryHex}</span>
				</div>
			{:else}
				<span class="text-xs text-[var(--ag-text-faint)]">{t('settings.appearance.seed_secondary_auto')}</span>
			{/if}
		</div>

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md border border-[var(--ag-border)] bg-[var(--ag-surface-3)] px-3 py-1.5 text-xs font-medium text-[var(--ag-text-primary)] transition-colors hover:bg-[var(--ag-surface-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]"
			onclick={randomize}
			data-testid="theme-editor-random"
		>
			<Shuffle class="h-3.5 w-3.5" />
			{t('settings.appearance.seed_random')}
		</button>
	</div>

	<!-- advanced: 全 token の生値編集 -->
	<div class="mt-4 border-t border-[var(--ag-border)] pt-3">
		<button
			type="button"
			class="flex items-center gap-1 text-xs font-medium text-[var(--ag-text-secondary)] hover:text-[var(--ag-text-primary)] focus-visible:outline-none"
			onclick={() => (showAdvanced = !showAdvanced)}
		>
			{#if showAdvanced}
				<ChevronDown class="h-3.5 w-3.5" />
			{:else}
				<ChevronRight class="h-3.5 w-3.5" />
			{/if}
			{t('settings.appearance.advanced_tokens')}
		</button>
		{#if showAdvanced}
			<div class="mt-2">
				<ThemeEditorTokenEditor {entries} {grouped} onValueChange={handleValueChange} />
			</div>
		{/if}
	</div>
</div>
