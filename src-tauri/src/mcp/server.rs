use std::io::{self, BufRead, Write};

use serde_json::{json, Value};

use crate::db::DbState;
use crate::mcp::tools;

/// stdin/stdout JSON-RPC 2.0 ループ。
/// stdout は JSON-RPC レスポンス専用。ログは eprintln! のみ使用。
pub fn run_loop(db: &DbState) {
    let stdin = io::stdin();
    let stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[mcp] stdin read error: {}", e);
                break;
            }
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                eprintln!("[mcp] JSON parse error: {}", e);
                let response = json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": {"code": -32700, "message": "Parse error"}
                });
                write_response(&stdout, &response);
                continue;
            }
        };

        if let Some(response) = dispatch(db, &request) {
            write_response(&stdout, &response);
        }
    }
}

fn write_response(stdout: &io::Stdout, response: &Value) {
    let mut out = stdout.lock();
    let _ = writeln!(out, "{}", response);
    let _ = out.flush();
}

pub fn dispatch(db: &DbState, request: &Value) -> Option<Value> {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    let method = request["method"].as_str().unwrap_or("");

    match method {
        "initialize" => {
            let result = json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "arcagate",
                    "version": env!("CARGO_PKG_VERSION")
                }
            });
            Some(json_rpc_result(id, result))
        }
        "notifications/initialized" => {
            // Notification: レスポンス不要
            None
        }
        "tools/list" => {
            let tool_defs = tools::list_tools();
            let tools_json = tools::tools_to_json(&tool_defs);
            Some(json_rpc_result(id, json!({"tools": tools_json})))
        }
        "tools/call" => {
            let params = request.get("params").unwrap_or(&Value::Null);
            let tool_name = params["name"].as_str().unwrap_or("");
            let arguments = params.get("arguments").unwrap_or(&Value::Null);

            match tools::call_tool(db, tool_name, arguments) {
                Ok(content) => Some(json_rpc_result(id, json!({"content": content}))),
                Err((code, message)) => Some(json_rpc_error(id, code, &message)),
            }
        }
        _ => Some(json_rpc_error(
            id,
            -32601,
            &format!("Method not found: {}", method),
        )),
    }
}

fn json_rpc_result(id: Value, result: Value) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "result": result
    })
}

fn json_rpc_error(id: Value, code: i64, message: &str) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": {
            "code": code,
            "message": message
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::services::mcp_service;

    fn make_request(method: &str, params: Option<Value>) -> Value {
        let mut req = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method
        });
        if let Some(p) = params {
            req["params"] = p;
        }
        req
    }

    #[test]
    fn test_initialize_response() {
        let db = initialize_in_memory();
        let req = make_request(
            "initialize",
            Some(json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test", "version": "1.0"}
            })),
        );
        let resp = dispatch(&db, &req).unwrap();
        assert_eq!(resp["result"]["serverInfo"]["name"], "arcagate");
        assert_eq!(resp["result"]["protocolVersion"], "2024-11-05");
        assert!(resp["result"]["capabilities"]["tools"].is_object());
    }

    #[test]
    fn test_tools_list_returns_four_tools() {
        let db = initialize_in_memory();
        let req = make_request("tools/list", None);
        let resp = dispatch(&db, &req).unwrap();
        let tools = resp["result"]["tools"].as_array().unwrap();
        assert_eq!(tools.len(), 4);
    }

    #[test]
    fn test_unknown_method_returns_error_32601() {
        let db = initialize_in_memory();
        let req = make_request("unknown/method", None);
        let resp = dispatch(&db, &req).unwrap();
        assert_eq!(resp["error"]["code"], -32601);
    }

    #[test]
    fn test_notifications_initialized_returns_none() {
        let db = initialize_in_memory();
        let req = make_request("notifications/initialized", None);
        let resp = dispatch(&db, &req);
        assert!(resp.is_none());
    }

    #[test]
    fn test_arcagate_list_via_tools_call() {
        let db = initialize_in_memory();
        let req = make_request(
            "tools/call",
            Some(json!({
                "name": "arcagate_list",
                "arguments": {}
            })),
        );
        let resp = dispatch(&db, &req).unwrap();
        assert!(resp.get("result").is_some());
        assert!(resp.get("error").is_none());
    }

    #[test]
    fn test_arcagate_launch_default_permission_denied() {
        let db = initialize_in_memory();
        let req = make_request(
            "tools/call",
            Some(json!({
                "name": "arcagate_launch",
                "arguments": {"id": "some-id"}
            })),
        );
        let resp = dispatch(&db, &req).unwrap();
        assert_eq!(resp["error"]["code"], -32000);
        assert!(resp["error"]["message"]
            .as_str()
            .unwrap()
            .contains("Permission denied"));
    }

    #[test]
    fn test_arcagate_launch_after_grant_not_permission_error() {
        let db = initialize_in_memory();
        mcp_service::set_tool_allowed(&db, "arcagate_launch", true).unwrap();
        let req = make_request(
            "tools/call",
            Some(json!({
                "name": "arcagate_launch",
                "arguments": {"id": "nonexistent-id"}
            })),
        );
        let resp = dispatch(&db, &req).unwrap();
        // Permission check passes; if error occurs, it must not be "Permission denied"
        if let Some(err) = resp.get("error") {
            let msg = err["message"].as_str().unwrap_or("");
            assert!(!msg.contains("Permission denied"), "Got: {}", msg);
        }
    }

    #[test]
    fn test_arcagate_create_default_denied() {
        let db = initialize_in_memory();
        let req = make_request(
            "tools/call",
            Some(json!({
                "name": "arcagate_create",
                "arguments": {
                    "item_type": "url",
                    "label": "Test",
                    "target": "https://example.com"
                }
            })),
        );
        let resp = dispatch(&db, &req).unwrap();
        assert_eq!(resp["error"]["code"], -32000);
        assert!(resp["error"]["message"]
            .as_str()
            .unwrap()
            .contains("Permission denied"));
    }
}
