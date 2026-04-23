const SOUND_ENABLED_KEY = 'sound-enabled';
const SOUND_VOLUME_KEY = 'sound-volume';

function loadBoolean(key: string, fallback: boolean): boolean {
	try {
		const stored = localStorage.getItem(key);
		if (stored !== null) return stored === 'true';
	} catch {
		// SSR or localStorage unavailable
	}
	return fallback;
}

function loadFloat(key: string, fallback: number): number {
	try {
		const stored = localStorage.getItem(key);
		if (stored !== null) {
			const val = Number(stored);
			if (!Number.isNaN(val)) return Math.max(0, Math.min(1, val));
		}
	} catch {
		// SSR or localStorage unavailable
	}
	return fallback;
}

let soundEnabled = $state(loadBoolean(SOUND_ENABLED_KEY, true));
let soundVolume = $state(loadFloat(SOUND_VOLUME_KEY, 0.4));

function setSoundEnabled(v: boolean): void {
	soundEnabled = v;
	try {
		localStorage.setItem(SOUND_ENABLED_KEY, String(v));
	} catch {
		// ignore
	}
}

function setSoundVolume(v: number): void {
	const clamped = Math.max(0, Math.min(1, v));
	soundVolume = clamped;
	try {
		localStorage.setItem(SOUND_VOLUME_KEY, String(clamped));
	} catch {
		// ignore
	}
}

export const soundStore = {
	get soundEnabled() {
		return soundEnabled;
	},
	get soundVolume() {
		return soundVolume;
	},
	setSoundEnabled,
	setSoundVolume,
};
