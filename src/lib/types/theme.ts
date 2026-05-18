// builtin テーマは Dark / Light / Neumorph / Brutalist / HUD の 5 本。
// activeMode は実在する theme ID ('dark' / 'light' / 'neumorph' / 'brutalist' / 'hud' / custom)。
// OS 追従 ('system') は撤廃済 — aesthetic theme が Dark/Light ペアを持たず矛盾するため。
export type ThemeMode = string;

export const BUILTIN_THEME_DARK = 'dark';
export const BUILTIN_THEME_LIGHT = 'light';

export interface Theme {
	id: string;
	name: string;
	base_theme: 'dark' | 'light';
	css_vars: string;
	is_builtin: boolean;
	created_at: string;
	updated_at: string;
}
