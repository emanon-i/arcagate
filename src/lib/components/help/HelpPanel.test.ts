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
});
