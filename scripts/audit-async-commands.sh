#!/usr/bin/env bash
# audit-async-commands.sh
#
# W-2 (2026-05-19): heavy I/O を行う `#[tauri::command]` が sync (`pub fn`) のままだと
# Tauri の main thread (event loop thread) 上で実行され、UI 全体を freeze させる。
# これは #524 (Library freeze) の真因そのもので、metadata batch command が sync だった。
#
# ルール (fail-closed):
#   - filesystem walk / file open|read|write|copy / 外部 process spawn / HTTP を行う
#     command は `pub async fn` + `spawn_blocking` で worker thread に逃がす。
#   - pure DB / config / in-memory / 単一 stat / plugin 呼び出しの command のみ sync 可。
#   - 下記 SYNC_ALLOWED に無い command が sync なら fail。
#     → 新規 command は async が既定。 sync にしたい (pure command) なら SYNC_ALLOWED に
#       明示追加する。 これにより「heavy command を sync で足してしまう」事故を構造的に防ぐ。
#
# 参照: docs/l2_foundation/features/cross-cutting/ipc-bridge.md (性能予算)
#       docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md (W-2)

set -e

CMD_DIR="src-tauri/src/commands"

if [ ! -d "$CMD_DIR" ]; then
    echo "✓ audit-async-commands: $CMD_DIR なし、skip"
    exit 0
fi

# sync を許可する command (pure DB / config / in-memory / 単一 stat / plugin 呼び出し)。
# heavy I/O command を新規追加する場合は async にすること (ここに足さない)。
SYNC_ALLOWED="
  cmd_get_autostart cmd_get_config cmd_get_hotkey cmd_is_onboarding_complete
  cmd_is_setup_complete cmd_mark_onboarding_complete cmd_mark_setup_complete
  cmd_set_autostart cmd_set_config cmd_set_hotkey
  cmd_cancel_exe_scan cmd_cancel_file_search
  cmd_bulk_add_tag cmd_bulk_delete_items cmd_bulk_remove_tag cmd_check_is_directory
  cmd_count_hidden_items cmd_count_item_references cmd_create_item cmd_create_tag
  cmd_delete_item cmd_delete_tag cmd_get_item_tags cmd_get_library_stats
  cmd_get_tag_counts cmd_get_tags cmd_list_items cmd_register_exe_item
  cmd_register_exe_items_bulk cmd_search_items cmd_search_items_in_tag cmd_toggle_star
  cmd_update_item cmd_update_tag cmd_update_tag_prefix
  cmd_confirm_item cmd_get_item_stats cmd_list_frequent cmd_list_recent
  cmd_delete_opener cmd_list_openers cmd_save_opener
  cmd_factory_reset cmd_confirm_script
  cmd_get_disk_stats cmd_get_network_stats cmd_get_system_stats
  cmd_create_theme cmd_delete_theme cmd_export_theme_json cmd_get_active_theme_mode
  cmd_get_theme cmd_import_theme_json cmd_list_themes cmd_set_active_theme_mode
  cmd_update_theme
  cmd_add_watched_path cmd_get_watched_paths cmd_remove_watched_path
  cmd_add_widget_item_hide cmd_list_widget_item_hides cmd_remove_widget_item_hide
  cmd_add_widget cmd_create_workspace cmd_delete_workspace cmd_get_folder_items
  cmd_get_frecency_items cmd_get_frequent_items cmd_get_recent_items cmd_list_widgets
  cmd_list_workspaces cmd_remove_widget cmd_set_workspace_wallpaper
  cmd_update_widget_config cmd_update_widget_position cmd_update_workspace
"

is_allowed() {
    case " $(echo "$SYNC_ALLOWED" | tr -s '[:space:]' ' ') " in
        *" $1 "*) return 0 ;;
        *) return 1 ;;
    esac
}

# `#[tauri::command]` 直後の fn 行を全て収集 (attribute の次行が fn)。
fn_lines=$(grep -rhA1 '#\[tauri::command\]' "$CMD_DIR" | grep -E 'pub (async )?fn cmd_' || true)

violations=""
seen=""
while IFS= read -r line; do
    [ -z "$line" ] && continue
    name=$(echo "$line" | sed -E 's/.*fn (cmd_[a-z0-9_]+).*/\1/')
    seen="$seen $name"
    if echo "$line" | grep -q 'async fn'; then
        # async command は SYNC_ALLOWED に入っていてはいけない (allowlist の陳腐化検出)。
        if is_allowed "$name"; then
            violations="${violations}  [stale] $name は async だが SYNC_ALLOWED に残っている → allowlist から削除\n"
        fi
    else
        # sync command は SYNC_ALLOWED に明示登録されていなければ fail。
        if ! is_allowed "$name"; then
            violations="${violations}  [sync] $name が sync — heavy I/O なら async + spawn_blocking 化、pure なら SYNC_ALLOWED に追加\n"
        fi
    fi
done <<EOF
$fn_lines
EOF

# SYNC_ALLOWED に書かれているが実在しない command (削除済 command の取り残し) を検出。
for allowed in $SYNC_ALLOWED; do
    case " $seen " in
        *" $allowed "*) ;;
        *) violations="${violations}  [missing] $allowed が SYNC_ALLOWED にあるが command として存在しない → allowlist から削除\n" ;;
    esac
done

if [ -n "$violations" ]; then
    echo "ERROR: audit-async-commands 違反"
    echo
    printf '%b' "$violations"
    echo
    echo "heavy I/O (filesystem walk / file open / process spawn / HTTP) を行う command は"
    echo "async fn + tauri::async_runtime::spawn_blocking で worker thread に逃がすこと。"
    echo "参照: docs/l2_foundation/audit/WASTEFUL_PROCESSING_AUDIT_2026-05-19.md (W-2)"
    exit 1
fi

echo "✓ audit-async-commands: 0 violations"
exit 0
