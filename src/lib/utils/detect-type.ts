import type { ItemType } from '$lib/types/item';

export function detectType(target: string): ItemType {
	const trimmed = target.trim();
	if (/^https?:\/\//i.test(trimmed)) return 'url';
	if (trimmed.endsWith('\\') || trimmed.endsWith('/')) return 'folder';
	const lower = trimmed.toLowerCase();
	if (lower.endsWith('.exe') || lower.endsWith('.msi') || lower.endsWith('.com')) return 'exe';
	if (['.ps1', '.bat', '.cmd', '.sh', '.py', '.js'].some((ext) => lower.endsWith(ext)))
		return 'script';
	return 'exe';
}
