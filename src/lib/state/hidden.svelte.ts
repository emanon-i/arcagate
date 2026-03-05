import * as configIpc from '$lib/ipc/config';
import { countHiddenItems } from '$lib/ipc/items';

let isHiddenVisible = $state(false);
let hiddenCount = $state(0);
let error = $state<string | null>(null);

async function toggle(password: string): Promise<boolean> {
	try {
		const result = await configIpc.verifyHiddenPassword(password);
		if (result === null) {
			// パスワード未設定の場合はそのまま切り替え
			isHiddenVisible = !isHiddenVisible;
			return true;
		}
		if (result) {
			isHiddenVisible = !isHiddenVisible;
			error = null;
			return true;
		} else {
			error = 'パスワードが正しくありません';
			return false;
		}
	} catch (e) {
		error = String(e);
		return false;
	}
}

function toggleDirect(): void {
	isHiddenVisible = !isHiddenVisible;
}

async function loadHiddenCount(): Promise<void> {
	try {
		hiddenCount = await countHiddenItems();
	} catch (e) {
		error = String(e);
	}
}

async function setPassword(password: string): Promise<void> {
	await configIpc.setHiddenPassword(password);
}

export const hiddenStore = {
	get isHiddenVisible() {
		return isHiddenVisible;
	},
	get hiddenCount() {
		return hiddenCount;
	},
	get error() {
		return error;
	},
	toggle,
	toggleDirect,
	loadHiddenCount,
	setPassword,
};
