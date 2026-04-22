export function formatTarget(target: string): string {
	if (!target) return target;
	try {
		const url = new URL(target);
		if (url.hostname) return url.hostname;
	} catch {
		// not a URL, fall through to path handling
	}
	const seg = target.replace(/\\/g, '/').split('/').filter(Boolean);
	return seg[seg.length - 1] ?? target;
}
