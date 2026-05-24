// PH-CF-800 F1: builtin テーマは 3 系統 (glass / brutalist / neumorph) × Dark/Light の 6 本。
// activeMode は実在する theme ID ('dark' / 'light' / 'brutalist' / 'brutalist-dark' /
// 'neumorph' / 'neumorph-dark' / custom)。 HUD は user 判断 (2026-05-23) で組み込みから削除。
// OS 追従 ('system') は migration 036 で撤廃済 — aesthetic theme が Dark/Light ペアを
// 持たず矛盾するため。 6 本構成では各系統が Dark/Light の対を持ち契約上 'system' を
// 再導入することは可能だが、 PH-CF-800 のスコープ外として現状維持。
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
