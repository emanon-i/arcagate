import * as configIpc from '$lib/ipc/config';

let isHiddenVisible = $state(false);
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

async function setPassword(password: string): Promise<void> {
	await configIpc.setHiddenPassword(password);
}

export const hiddenStore = {
	get isHiddenVisible() {
		return isHiddenVisible;
	},
	get error() {
		return error;
	},
	toggle,
	setPassword,
};
