import { loadBool, loadNumber, saveBool, saveNumber } from '$lib/utils/local-storage';

const SOUND_ENABLED_KEY = 'sound-enabled';
const SOUND_VOLUME_KEY = 'sound-volume';

let soundEnabled = $state(loadBool(SOUND_ENABLED_KEY, true));
let soundVolume = $state(loadNumber(SOUND_VOLUME_KEY, 0.4, 0, 1));

function setSoundEnabled(v: boolean): void {
	soundEnabled = v;
	saveBool(SOUND_ENABLED_KEY, v);
}

function setSoundVolume(v: number): void {
	const clamped = Math.max(0, Math.min(1, v));
	soundVolume = clamped;
	saveNumber(SOUND_VOLUME_KEY, clamped);
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
