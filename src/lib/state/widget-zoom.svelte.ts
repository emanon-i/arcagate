import { configStore } from '$lib/state/config.svelte';

const BASE_W = 320;
const BASE_H = 180;

export function useWidgetZoom(containerRef: () => HTMLElement | null) {
	const widgetW = $derived(Math.round(BASE_W * (configStore.widgetZoom / 100)));
	const widgetH = $derived(Math.round(BASE_H * (configStore.widgetZoom / 100)));

	function handleWheel(e: WheelEvent) {
		if (!e.ctrlKey) return;
		e.preventDefault();
		const delta = e.deltaY > 0 ? -10 : 10;
		configStore.setWidgetZoom(configStore.widgetZoom + delta);
	}

	$effect(() => {
		const el = containerRef();
		if (!el) return;
		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	return {
		get widgetW() {
			return widgetW;
		},
		get widgetH() {
			return widgetH;
		},
	};
}
