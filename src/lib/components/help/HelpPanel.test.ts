import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { helpStore } from '$lib/state/help.svelte';
import HelpPanel from './HelpPanel.svelte';

describe('HelpPanel', () => {
	afterEach(() => {
		helpStore.close();
	});

	it('does not render when isOpen is false', () => {
		helpStore.close();
		render(HelpPanel);
		expect(screen.queryByTestId('help-panel')).toBeNull();
	});

	it('renders when isOpen is true', () => {
		helpStore.open();
		render(HelpPanel);
		expect(screen.queryByTestId('help-panel')).not.toBeNull();
	});

	it('shows global hotkeys section', () => {
		helpStore.open();
		render(HelpPanel);
		expect(screen.getByText('グローバルホットキー')).toBeTruthy();
		// Ctrl+Shift+Space appears multiple times (global + palette section), confirm at least one
		expect(screen.getAllByText('Ctrl+Shift+Space').length).toBeGreaterThan(0);
	});

	it('shows screen sections (Library / Workspace / Palette / Settings)', () => {
		helpStore.open();
		render(HelpPanel);
		expect(screen.getAllByText(/Library/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Workspace/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Palette/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/Settings/).length).toBeGreaterThan(0);
	});

	it('closes when close button is clicked', async () => {
		helpStore.open();
		render(HelpPanel);
		const closeBtn = screen.getByTestId('help-panel-close');
		await fireEvent.click(closeBtn);
		expect(helpStore.isOpen).toBe(false);
	});

	// PH-423 / Codex Q5 #7 — a11y focus trap + 復帰
	it('focuses the close button when opened', async () => {
		helpStore.open();
		render(HelpPanel);
		// Svelte の $effect + tick が走るのを待つ
		await new Promise((r) => setTimeout(r, 50));
		const closeBtn = screen.getByTestId('help-panel-close');
		expect(document.activeElement).toBe(closeBtn);
	});

	it('restores focus to previously active element on close', async () => {
		// 開く前に擬似的にフォーカス可能要素を作る
		const trigger = document.createElement('button');
		trigger.textContent = 'open help';
		document.body.appendChild(trigger);
		trigger.focus();
		expect(document.activeElement).toBe(trigger);

		helpStore.open();
		render(HelpPanel);
		await new Promise((r) => setTimeout(r, 50));

		const closeBtn = screen.getByTestId('help-panel-close');
		await fireEvent.click(closeBtn);
		await new Promise((r) => setTimeout(r, 50));

		expect(helpStore.isOpen).toBe(false);
		expect(document.activeElement).toBe(trigger);
		trigger.remove();
	});
});
