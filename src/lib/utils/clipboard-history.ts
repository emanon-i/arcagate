export interface ClipboardEntry {
	id: string;
	text: string;
	addedAt: number;
}

export interface PushOptions {
	maxItems: number;
}

export function pushClipboardEntry(
	history: ClipboardEntry[],
	text: string,
	{ maxItems }: PushOptions,
	now: () => number = Date.now,
): ClipboardEntry[] {
	const trimmed = text;
	if (!trimmed) return history;
	if (history.length > 0 && history[0].text === trimmed) return history;
	const filtered = history.filter((e) => e.text !== trimmed);
	const next: ClipboardEntry = {
		id: `${now()}-${Math.random().toString(36).slice(2, 8)}`,
		text: trimmed,
		addedAt: now(),
	};
	const out = [next, ...filtered];
	const limit = Math.max(1, Math.min(200, maxItems));
	return out.slice(0, limit);
}

export function deleteClipboardEntry(history: ClipboardEntry[], id: string): ClipboardEntry[] {
	return history.filter((e) => e.id !== id);
}
