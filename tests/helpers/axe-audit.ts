import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * R8-2: axe-core CLI 統合 (G3 WCAG numeric CI gate)。
 *
 * 設計判断:
 *   - shadcn-svelte (`src/lib/components/ui/`) は scaffold で手出ししない方針 (CLAUDE.md)。
 *     その内部に起因する violation は除外できないため、現状の検出をそのまま受ける。
 *   - WCAG 2.1 Level AA を target tag にする (G3 criteria 上の Level)。
 *   - critical / serious のみで CI gate 化、moderate / minor は informational。
 *     Polish 段階では critical を 0 維持 → R9 で serious 0、と段階的 squeeze。
 */
export interface AxeSummary {
	url: string;
	totalViolations: number;
	byImpact: {
		critical: number;
		serious: number;
		moderate: number;
		minor: number;
	};
	violations: Array<{
		id: string;
		impact: string | null | undefined;
		help: string;
		nodes: number;
	}>;
}

export async function runAxe(page: Page, label: string): Promise<AxeSummary> {
	const result = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();

	const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
	for (const v of result.violations) {
		const k = v.impact as keyof typeof byImpact | undefined;
		if (k && k in byImpact) byImpact[k] += 1;
	}

	return {
		url: label,
		totalViolations: result.violations.length,
		byImpact,
		violations: result.violations.map((v) => ({
			id: v.id,
			impact: v.impact,
			help: v.help,
			nodes: v.nodes.length,
		})),
	};
}

/**
 * critical / serious 0 件を gate 条件にする。moderate / minor は警告のみ。
 */
export function isPass(summary: AxeSummary): boolean {
	return summary.byImpact.critical === 0 && summary.byImpact.serious === 0;
}
