import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// `.claude/worktrees/**` には 26+ の git worktree (合計 ~32 万 file) があり、
		// vite/chokidar が full walk すると cold-start で transport thrash → dev mode 不能になる。
		// HMR/モジュール解決の対象から完全に外す (本体 src と src-tauri は worktree 配下に含まれない)。
		watch: {
			ignored: ['**/.claude/worktrees/**']
		},
		fs: {
			deny: ['.claude/worktrees/**']
		}
	}
});
