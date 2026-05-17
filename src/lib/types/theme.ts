// #7: builtin テーマは Dark / Light の 2 本。
// activeMode は theme ID ('dark' / 'light' / custom) か 'system' (OS 追従)。
export type ThemeMode = 'system' | (string & {});

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
