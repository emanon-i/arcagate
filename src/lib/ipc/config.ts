import { invoke } from '@tauri-apps/api/core';

export async function getConfig(key: string): Promise<string | null> {
	return invoke<string | null>('cmd_get_config', { key });
}

export async function setConfig(key: string, value: string): Promise<void> {
	return invoke<void>('cmd_set_config', { key, value });
}

export async function getHotkey(): Promise<string> {
	return invoke<string>('cmd_get_hotkey');
}

export async function setHotkey(hotkey: string): Promise<void> {
	return invoke<void>('cmd_set_hotkey', { hotkey });
}

export async function getAutostart(): Promise<boolean> {
	return invoke<boolean>('cmd_get_autostart');
}

export async function setAutostart(enabled: boolean): Promise<void> {
	return invoke<void>('cmd_set_autostart', { enabled });
}

export async function isSetupComplete(): Promise<boolean> {
	return invoke<boolean>('cmd_is_setup_complete');
}

export async function markSetupComplete(): Promise<void> {
	return invoke<void>('cmd_mark_setup_complete');
}

export async function setHiddenPassword(password: string): Promise<void> {
	return invoke<void>('cmd_set_hidden_password', { password });
}

export async function verifyHiddenPassword(password: string): Promise<boolean | null> {
	return invoke<boolean | null>('cmd_verify_hidden_password', { password });
}
