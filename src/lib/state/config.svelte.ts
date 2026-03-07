import * as configIpc from '$lib/ipc/config';

let hotkey = $state('CmdOrCtrl+Space');
let autostart = $state(false);
let setupComplete = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

async function loadConfig(): Promise<void> {
	loading = true;
	error = null;
	try {
		[hotkey, autostart, setupComplete] = await Promise.all([
			configIpc.getHotkey(),
			configIpc.getAutostart(),
			configIpc.isSetupComplete(),
		]);
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function saveHotkey(newHotkey: string): Promise<void> {
	loading = true;
	error = null;
	try {
		await configIpc.setHotkey(newHotkey);
		hotkey = newHotkey;
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function saveAutostart(enabled: boolean): Promise<void> {
	loading = true;
	error = null;
	try {
		await configIpc.setAutostart(enabled);
		autostart = enabled;
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function completeSetup(): Promise<void> {
	loading = true;
	error = null;
	try {
		await configIpc.markSetupComplete();
		setupComplete = true;
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

export const configStore = {
	get hotkey() {
		return hotkey;
	},
	get autostart() {
		return autostart;
	},
	get setupComplete() {
		return setupComplete;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	loadConfig,
	saveHotkey,
	saveAutostart,
	completeSetup,
};
