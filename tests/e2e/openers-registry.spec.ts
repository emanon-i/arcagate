/**
 * PH-505: Opener registry IPC round-trip
 *
 * 検証シナリオ:
 *   1. builtin opener (Explorer / cmd / Notepad) が seed されている
 *   2. custom opener を create / update / delete できる
 *   3. builtin opener の delete は拒否される
 *   4. launch_with_opener は不在 command で LaunchFileNotFound
 */
import { expect, test } from '../fixtures/tauri.js';
import { invoke } from '../helpers/ipc.js';

interface Opener {
	id: string;
	label: string;
	command: string;
	args_template: string;
	icon: string | null;
	builtin: boolean;
	sort_order: number;
	created_at: number;
	updated_at: number;
}

test.describe('PH-505 opener registry IPC', () => {
	test('builtin seed が存在する + custom CRUD round-trip', async ({ page }) => {
		// 1. 初期状態に builtin が seed されている
		const initial = await invoke<Opener[]>(page, 'cmd_list_openers');
		const builtinIds = initial.filter((o) => o.builtin).map((o) => o.id);
		expect(builtinIds).toContain('opener-builtin-explorer');
		expect(builtinIds).toContain('opener-builtin-cmd');
		expect(builtinIds).toContain('opener-builtin-notepad');

		// 2. custom create
		const created = await invoke<Opener>(page, 'cmd_create_opener', {
			input: {
				label: 'PH-505 E2E custom',
				command: 'C:/__never_exists__/myedit.exe',
				args_template: '"{path}"',
			},
		});
		expect(created.builtin).toBe(false);
		expect(created.label).toBe('PH-505 E2E custom');
		expect(created.id).toMatch(/^opener-custom-/);

		try {
			// 3. custom update
			const updated = await invoke<Opener>(page, 'cmd_update_opener', {
				id: created.id,
				input: { label: 'PH-505 E2E renamed' },
			});
			expect(updated.label).toBe('PH-505 E2E renamed');
			expect(updated.command).toBe('C:/__never_exists__/myedit.exe');

			// 4. builtin delete は拒否
			let rejected = false;
			try {
				await invoke<void>(page, 'cmd_delete_opener', { id: 'opener-builtin-explorer' });
			} catch {
				rejected = true;
			}
			expect(rejected).toBe(true);
			// builtin が DB に残っている
			const stillExists = await invoke<Opener | null>(page, 'cmd_get_opener', {
				id: 'opener-builtin-explorer',
			});
			expect(stillExists?.id).toBe('opener-builtin-explorer');

			// 5. launch_with_opener: 不在 command → LaunchFileNotFound
			let launchFailed = false;
			try {
				await invoke<void>(page, 'cmd_launch_with_opener', {
					openerId: created.id,
					path: 'C:/x',
				});
			} catch {
				launchFailed = true;
			}
			expect(launchFailed).toBe(true);
		} finally {
			// 6. custom delete (cleanup)
			await invoke<void>(page, 'cmd_delete_opener', { id: created.id });
			const after = await invoke<Opener | null>(page, 'cmd_get_opener', { id: created.id });
			expect(after).toBeNull();
		}
	});
});
