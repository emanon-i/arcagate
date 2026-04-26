export function pushBuffer<T>(buffer: T[], next: T, maxSize: number): T[] {
	const limit = Math.max(1, Math.min(1000, maxSize));
	const out = [...buffer, next];
	if (out.length <= limit) return out;
	return out.slice(out.length - limit);
}

export function bufferToSparklinePath(
	values: number[],
	width: number,
	height: number,
	maxValue = 100,
): string {
	if (values.length === 0) return '';
	const cap = Math.max(1, maxValue);
	const dx = values.length > 1 ? width / (values.length - 1) : 0;
	return values
		.map((v, i) => {
			const x = i * dx;
			const clamped = Math.max(0, Math.min(cap, v));
			const y = height - (clamped / cap) * height;
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(' ');
}
