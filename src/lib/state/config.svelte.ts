import * as configIpc from '$lib/ipc/config';

let hotkey = $state('CmdOrCtrl+Space');
let autostart = $state(false);
let setupComplete = $state(false);
let themeMode = $state<'dark' | 'light'>('dark');
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

async function loadTheme(): Promise<void> {
	try {
		const saved = await configIpc.getConfig('theme_mode');
		if (saved === 'light' || saved === 'dark') {
			themeMode = saved;
		}
		applyThemeClass();
	} catch (e) {
		error = String(e);
	}
}

async function setTheme(mode: 'dark' | 'light'): Promise<void> {
	themeMode = mode;
	applyThemeClass();
	try {
		await configIpc.setConfig('theme_mode', mode);
	} catch (e) {
		error = String(e);
	}
}

function applyThemeClass(): void {
	if (typeof document !== 'undefined') {
		if (themeMode === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
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
	get themeMode() {
		return themeMode;
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
	loadTheme,
	setTheme,
};
