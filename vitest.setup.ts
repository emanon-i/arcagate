// jsdom 環境でブラウザ API を補う setup（PH-378 で追加）。
// Svelte コンポーネントが `window.matchMedia` を参照するため、
// jsdom 28 にも実装が無い API を最小限に polyfill する。

if (typeof window !== 'undefined' && !window.matchMedia) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}
