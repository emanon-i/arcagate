import * as configIpc from '$lib/ipc/config';

let hotkey = $state('CmdOrCtrl+Space');
let autostart = $state(false);
let setupComplete = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

// Widget zoom (50-200%, persisted in localStorage)
const ZOOM_STORAGE_KEY = 'widget-zoom';
const DEFAULT_ZOOM = 100;

function loadZoomFromStorage(): number {
	try {
		const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
		if (stored !== null) {
			const val = Number(stored);
			if (!Number.isNaN(val) && val >= 50 && val <= 200) return val;
		}
	} catch {
		// SSR or localStorage unavailable
	}
	return DEFAULT_ZOOM;
}

let widgetZoom = $state(loadZoomFromStorage());

function setWidgetZoom(zoom: number): void {
	const clamped = Math.max(50, Math.min(200, Math.round(zoom / 10) * 10));
	if (widgetZoom === clamped) return;
	widgetZoom = clamped;
	try {
		localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
	} catch {
		// ignore
	}
}

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
	get widgetZoom() {
		return widgetZoom;
	},
	loadConfig,
	saveHotkey,
	saveAutostart,
	completeSetup,
	setWidgetZoom,
};
