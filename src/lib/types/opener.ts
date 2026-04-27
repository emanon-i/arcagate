// PH-505 batch-109: Opener registry
// {path} placeholder で args を組み立てる shell 風 invocation registry。

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
}

export interface UpdateOpenerInput {
	label?: string;
	command?: string;
	args_template?: string;
	/** undefined: 維持 / null: クリア / 文字列: 設定 */
	icon?: string | null;
	sort_order?: number;
}
