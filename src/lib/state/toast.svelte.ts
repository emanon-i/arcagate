export type ToastType = 'success' | 'error' | 'info';

interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

const AUTO_DISMISS_MS = 3000;

let toasts = $state<Toast[]>([]);
let nextId = 0;

function add(message: string, type: ToastType = 'info'): void {
	const id = nextId++;
	toasts = [...toasts, { id, message, type }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, AUTO_DISMISS_MS);
}

function dismiss(id: number): void {
	toasts = toasts.filter((t) => t.id !== id);
}

export const toastStore = {
	get toasts() {
		return toasts;
	},
	add,
	dismiss,
};
