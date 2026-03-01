use serde_json::{json, Value};

use crate::db::DbState;
use crate::models::item::{CreateItemInput, ItemType};
use crate::services::{item_service, launch_service, mcp_service};

const TOOL_LIST: &str = "arcagate_list";
const TOOL_SEARCH: &str = "arcagate_search";
const TOOL_LAUNCH: &str = "arcagate_launch";
const TOOL_CREATE: &str = "arcagate_create";

pub struct ToolDef {
    pub name: &'static str,
    pub description: &'static str,
    pub input_schema: Value,
}

pub fn list_tools() -> Vec<ToolDef> {
    vec![
        ToolDef {
            name: TOOL_LIST,
            description: "List all items registered in Arcagate",
            input_schema: json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
        },
        ToolDef {
            name: TOOL_SEARCH,
            description: "Search Arcagate items by keyword (partial match on label and target)",
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    }
                },
                "required": ["query"]
            }),
        },
        ToolDef {
            name: TOOL_LAUNCH,
            description: "Launch an Arcagate item by ID (requires write permission)",
            input_schema: json!({
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Item UUID"
                    }
                },
                "required": ["id"]
            }),
        },
        ToolDef {
            name: TOOL_CREATE,
            description: "Create a new Arcagate item (requires write permission)",
            input_schema: json!({
                "type": "object",
                "properties": {
                    "item_type": {
                        "type": "string",
                        "enum": ["exe", "url", "folder", "script", "command"],
                        "description": "Type of item"
                    },
                    "label": {
                        "type": "string",
                        "description": "Display name"
                    },
                    "target": {
                        "type": "string",
                        "description": "Path, URL, or command"
                    }
                },
                "required": ["item_type", "label", "target"]
            }),
        },
    ]
}

pub fn tools_to_json(tools: &[ToolDef]) -> Value {
    json!(tools
        .iter()
        .map(|t| json!({
            "name": t.name,
            "description": t.description,
            "inputSchema": t.input_schema.clone()
        }))
        .collect::<Vec<_>>())
}

/// JSON 引数から文字列フィールドを取り出す。存在しない場合は -32602 (Invalid params) を返す。
fn get_str_arg<'a>(arguments: &'a Value, key: &str) -> Result<&'a str, (i64, String)> {
    arguments[key]
        .as_str()
        .ok_or_else(|| (-32602i64, format!("missing '{}' argument", key)))
}

/// ツールを実行する。パーミッション違反は JSON-RPC エラー (-32000) として返す。
/// 引数不足は -32602 (Invalid params) として返す。
pub fn call_tool(db: &DbState, name: &str, arguments: &Value) -> Result<Value, (i64, String)> {
    match name {
        TOOL_LIST => {
            check_permission(db, name)?;
            let items = item_service::list_items(db).map_err(|e| (-32000i64, e.to_string()))?;
            let text = serde_json::to_string_pretty(&items).unwrap_or_else(|_| "[]".to_string());
            Ok(json!([{"type": "text", "text": text}]))
        }
        TOOL_SEARCH => {
            check_permission(db, name)?;
            let query = get_str_arg(arguments, "query")?;
            let items =
                item_service::search_items(db, query).map_err(|e| (-32000i64, e.to_string()))?;
            let text = serde_json::to_string_pretty(&items).unwrap_or_else(|_| "[]".to_string());
            Ok(json!([{"type": "text", "text": text}]))
        }
        TOOL_LAUNCH => {
            check_permission(db, name)?;
            let id = get_str_arg(arguments, "id")?;
            launch_service::launch_item(db, id, "mcp").map_err(|e| (-32000i64, e.to_string()))?;
            Ok(json!([{"type": "text", "text": format!("Launched item: {}", id)}]))
        }
        TOOL_CREATE => {
            check_permission(db, name)?;
            let item_type_str = get_str_arg(arguments, "item_type")?;
            let label = get_str_arg(arguments, "label")?;
            let target = get_str_arg(arguments, "target")?;
            let item_type = ItemType::from_str(item_type_str)
                .ok_or((-32602i64, format!("invalid item_type: {}", item_type_str)))?;
            let input = CreateItemInput {
                item_type,
                label: label.to_string(),
                target: target.to_string(),
                args: None,
                working_dir: None,
                icon_path: None,
                aliases: vec![],
                category_ids: vec![],
                tag_ids: vec![],
            };
            let item =
                item_service::create_item(db, input).map_err(|e| (-32000i64, e.to_string()))?;
            let text = serde_json::to_string_pretty(&item).unwrap_or_else(|_| "{}".to_string());
            Ok(json!([{"type": "text", "text": text}]))
        }
        _ => Err((-32601i64, format!("unknown tool: {}", name))),
    }
}

fn check_permission(db: &DbState, tool_name: &str) -> Result<(), (i64, String)> {
    let allowed =
        mcp_service::is_tool_allowed(db, tool_name).map_err(|e| (-32000i64, e.to_string()))?;
    if !allowed {
        return Err((-32000, format!("Permission denied for tool: {}", tool_name)));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::services::mcp_service;

    #[test]
    fn test_arcagate_list_default_allowed() {
        let db = initialize_in_memory();
        let result = call_tool(&db, "arcagate_list", &json!({}));
        assert!(result.is_ok());
    }

    #[test]
    fn test_arcagate_search_uses_query() {
        let db = initialize_in_memory();
        let result = call_tool(&db, "arcagate_search", &json!({"query": "nonexistent"}));
        assert!(result.is_ok());
        let content = result.unwrap();
        assert!(content[0]["text"].as_str().unwrap().contains("[]"));
    }

    #[test]
    fn test_arcagate_launch_default_denied() {
        let db = initialize_in_memory();
        let result = call_tool(&db, "arcagate_launch", &json!({"id": "some-id"}));
        assert!(result.is_err());
        let (code, msg) = result.unwrap_err();
        assert_eq!(code, -32000);
        assert!(msg.contains("Permission denied"));
    }

    #[test]
    fn test_arcagate_launch_after_grant_no_permission_error() {
        let db = initialize_in_memory();
        mcp_service::set_tool_allowed(&db, "arcagate_launch", true).unwrap();
        let result = call_tool(&db, "arcagate_launch", &json!({"id": "nonexistent-id"}));
        // Permission check passes; fails with NotFound, not Permission denied
        if let Err((_, msg)) = &result {
            assert!(
                !msg.contains("Permission denied"),
                "Expected no permission error, got: {}",
                msg
            );
        }
    }

    #[test]
    fn test_arcagate_create_default_denied() {
        let db = initialize_in_memory();
        let result = call_tool(
            &db,
            "arcagate_create",
            &json!({"item_type": "url", "label": "Test", "target": "https://example.com"}),
        );
        assert!(result.is_err());
        let (code, msg) = result.unwrap_err();
        assert_eq!(code, -32000);
        assert!(msg.contains("Permission denied"));
    }

    #[test]
    fn test_arcagate_create_after_permission_grant() {
        let db = initialize_in_memory();
        mcp_service::set_tool_allowed(&db, "arcagate_create", true).unwrap();
        let result = call_tool(
            &db,
            "arcagate_create",
            &json!({"item_type": "url", "label": "Test Site", "target": "https://example.com"}),
        );
        assert!(result.is_ok());
    }
}
