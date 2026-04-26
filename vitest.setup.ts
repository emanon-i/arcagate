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

// Svelte transitions (fly/fade) が element.animate を呼ぶため、jsdom 用に最小 polyfill (PH-418)
if (typeof Element !== 'undefined' && !('animate' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'animate', {
		writable: true,
		value: () => ({
			cancel: () => {},
			finish: () => {},
			pause: () => {},
			play: () => {},
			reverse: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			finished: Promise.resolve(),
			ready: Promise.resolve(),
			onfinish: null,
			oncancel: null,
			onremove: null,
		}),
	});
}
