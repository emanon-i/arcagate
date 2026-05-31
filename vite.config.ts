import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		// `.claude/worktrees/**` には 26+ の git worktree (合計 ~32 万 file) があり、
		// vite/chokidar が full walk すると cold-start で transport thrash → dev mode 不能になる。
		// HMR/モジュール解決の対象から完全に外す (本体 src と src-tauri は worktree 配下に含まれない)。
		//
		// `tmp/**` も同様に ignored: e2e test が `tmp/wv2-e2e-*/EBWebView/` 配下に
		// WebView2 user data folder を作成し、 WebView2 process が `Safe Browsing
		// Cookies` 等を open している状態で vite/chokidar が watch しようとすると
		// Windows 上で **EBUSY: resource busy or locked** で FSWatcher が crash →
		// Vite dev server が落ちて `localhost:5173` 不到達 → Tauri main window が
		// 60s 内に load されず e2e global-setup が timeout する (2026-05-30 観測、
		// PR #595 経緯)。 watch / dev server scope から完全に外して回避する。
		watch: {
			ignored: ['**/.claude/worktrees/**', '**/tmp/**']
		},
		fs: {
			deny: ['.claude/worktrees/**', 'tmp/**']
		}
	}
});
