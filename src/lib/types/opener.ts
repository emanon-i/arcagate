// PH-505: Opener registry types
export interface Opener {
	id: string;
	label: string;
	command: string;
	args_template: string;
	icon: string | null;
	builtin: boolean;
	sort_order: number;
	created_at: number;
	updated_at: number;
}

export interface CreateOpenerInput {
	label: string;
	command: string;
	args_template?: string;
	icon?: string | null;
	sort_order?: number;
}

export interface UpdateOpenerInput {
	label?: string;
	command?: string;
	args_template?: string;
	icon?: string | null;
	sort_order?: number;
}
