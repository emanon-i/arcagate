export interface Tag {
	id: string;
	name: string;
	is_hidden: boolean;
	created_at: string;
}

export interface CreateTagInput {
	name: string;
	is_hidden: boolean;
}
