import type { Page } from '@playwright/test';

/**
 * minimal IPC helper for T1 smoke。
 *
 * 引用元: docs/l1_requirements/test-rebuild/index.md (T1 phase、SetupWizard / Onboarding skip)
 *
 * 旧版 (PR-Z で削除済) の subset。markSetupComplete / markOnboardingComplete /
 * listWorkspaces のみ。T2 以降で必要時に追加 (createItem / deleteItem 等)。
 */

interface TauriWindow {
	__TAURI_INTERNALS__: {
		invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
	};
}

export async function invoke<T>(
	page: Page,
	cmd: string,
	args?: Record<string, unknown>,
): Promise<T> {
	return page.evaluate(
		([command, arguments_]) =>
			(window as unknown as TauriWindow).__TAURI_INTERNALS__.invoke(
				command as string,
				arguments_ as Record<string, unknown>,
			),
		[cmd, args ?? {}] as const,
	) as unknown as T;
}

export async function markSetupComplete(page: Page): Promise<void> {
	return invoke<void>(page, 'cmd_mark_setup_complete');
}

export async function markOnboardingComplete(page: Page): Promise<void> {
	return invoke<void>(page, 'cmd_mark_onboarding_complete');
}

export interface Workspace {
	id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export async function listWorkspaces(page: Page): Promise<Workspace[]> {
	return invoke<Workspace[]>(page, 'cmd_list_workspaces');
}
