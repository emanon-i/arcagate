import { Cpu, FolderOpen, Gamepad2, Globe, TerminalSquare } from '@lucide/svelte';
import type { Component } from 'svelte';
import type { ItemType } from '$lib/types/item';

/** Gradient classes for card / detail panel art area */
export const artMap: Record<ItemType, string> = {
	exe: 'from-violet-600 via-fuchsia-600 to-indigo-700',
	url: 'from-emerald-500 via-teal-500 to-cyan-700',
	script: 'from-cyan-500 via-sky-500 to-blue-700',
	folder: 'from-amber-500 via-orange-500 to-yellow-700',
	command: 'from-pink-500 via-rose-500 to-fuchsia-700',
};

/** Human-readable display name for each item type */
export const typeLabel: Record<ItemType, string> = {
	exe: 'Executable',
	url: 'URL',
	script: 'Script',
	folder: 'Folder',
	command: 'Command',
};

/** Lucide icon component for each item type (palette) */
export const typeIconMap: Record<ItemType, Component> = {
	exe: Gamepad2,
	url: Globe,
	script: TerminalSquare,
	folder: FolderOpen,
	command: Cpu,
};

/** Palette accent gradient for each item type */
export const typeAccentMap: Record<ItemType, string> = {
	exe: 'from-violet-500/30 to-fuchsia-500/20',
	url: 'from-emerald-500/30 to-teal-500/20',
	script: 'from-cyan-500/30 to-sky-500/20',
	folder: 'from-amber-500/30 to-orange-500/20',
	command: 'from-pink-500/30 to-rose-500/20',
};
