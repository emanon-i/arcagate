export interface Tag {
	id: string;
	name: string;
	is_hidden: boolean;
	is_system: boolean;
	prefix: string | null;
	icon: string | null;
	sort_order: number;
	created_at: string;
}

export interface CreateTagInput {
	name: string;
	is_hidden: boolean;
}

export interface TagWithCount {
	id: string;
	name: string;
	is_system: boolean;
	prefix: string | null;
	icon: string | null;
	item_count: number;
}
