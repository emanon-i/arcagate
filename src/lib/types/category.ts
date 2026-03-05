export interface Category {
	id: string;
	name: string;
	prefix: string | null;
	icon: string | null;
	sort_order: number;
	created_at: string;
}

export interface CreateCategoryInput {
	name: string;
	prefix: string | null;
	icon: string | null;
}

export interface CategoryWithCount {
	id: string;
	name: string;
	prefix: string | null;
	item_count: number;
}
