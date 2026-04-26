/**
 * cmd_get_item_metadata の戻り値型。
 * Rust 側 ItemMetadata と一致（serde rename_all = "camelCase"）。
 *
 * 失敗時は全フィールド undefined の空オブジェクトが返る（best-effort）。
 */
export interface ItemMetadata {
	sizeBytes?: number;
	modifiedAtUnix?: number;
	childCount?: number;
	folderTotalBytes?: number;
	urlDomain?: string;
	imageWidth?: number;
	imageHeight?: number;
	imageFormat?: string;
}
