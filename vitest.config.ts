import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [svelte({ hot: false }), svelteTesting()],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.test.ts'],
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			include: ['src/lib/state/**/*.ts', 'src/lib/utils/**/*.ts', 'src/lib/types/**/*.ts'],
			exclude: ['src/lib/ipc/**', 'src/lib/types/index.ts'],
		},
	},
	resolve: {
		alias: {
			$lib: '/src/lib',
		},
	},
});
