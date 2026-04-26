import { invoke } from '@tauri-apps/api/core';

export async function isOnboardingComplete(): Promise<boolean> {
	return invoke<boolean>('cmd_is_onboarding_complete');
}

export async function markOnboardingComplete(): Promise<void> {
	return invoke<void>('cmd_mark_onboarding_complete');
}
