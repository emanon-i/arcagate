import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForAppReady } from './app-ready.js';
import { addWidget, createWorkspace, type Workspace } from './ipc.js';

export async function setupWorkspaceWithWidget(
	page: Page,
	workspaceName: string,
	widgetType: string,
): Promise<Workspace> {
	const workspace = await createWorkspace(page, workspaceName);
	await addWidget(page, workspace.id, widgetType);
	await page.reload();
	await page.waitForLoadState('domcontentloaded');
	await waitForAppReady(page);
	await page.getByRole('button', { name: 'Workspace' }).click();
	await expect(page.getByText(workspaceName)).toBeVisible();
	return workspace;
}
