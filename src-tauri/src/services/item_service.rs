use uuid::Uuid;

use crate::db::DbState;
use crate::models::item::{CreateItemInput, Item, LibraryStats, UpdateItemInput};
use crate::models::tag::{self, CreateTagInput, Tag, TagWithCount};
use crate::repositories::{
    icon_cache_repository, item_repository, tag_repository, widget_item_hides_repository,
    workspace_repository,
};
use crate::utils::error::AppError;
use crate::utils::icon;

/// PH-CF-100: 監視 entry id (= `widget_item_hides.item_target` の key 空間) を
/// 単一実装で正規化する。 同じ folder を異なる表現 (区切り混在 / 末尾 separator 付き) で
/// scan しても重複登録 / hide 不発を起こさないために、 forward slash / 末尾 separator 除去で
/// 揃える。 ProjectsWidget は subfolder の絶対パス、 ExeFolderWatchWidget は第1階層フォルダ
/// (= exe の parent) の絶対パスを entry_key として渡す。
fn normalize_entry_key(path: &str) -> String {
    let with_fwd = path.replace('\\', "/");
    let trimmed = with_fwd.trim_end_matches('/');
    if trimmed.is_empty() {
        with_fwd
    } else {
        trimmed.to_string()
    }
}

pub fn create_item(db: &DbState, input: CreateItemInput) -> Result<Item, AppError> {
    if input.label.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "label must not be empty".to_string(),
        ));
    }

    let id = Uuid::now_v7().to_string();

    let item = Item {
        id: id.clone(),
        item_type: input.item_type,
        label: input.label,
        target: input.target,
        args: input.args,
        working_dir: input.working_dir,
        icon_path: input.icon_path,
        icon_type: None,
        aliases: input.aliases,
        sort_order: 0,
        is_enabled: true,
        is_tracked: input.is_tracked,
        default_app: None,
        card_override_json: None,
        // PH-CF-100: user 作成経路は 監視非由来 → back-link は NULL。 監視自動登録経路
        // (auto_register_folder_items / register_exe_item_on_conn) のみ両列を埋める。
        source_widget_id: None,
        source_entry_key: None,
        created_at: String::new(), // set by DB DEFAULT on insert
        updated_at: String::new(),
    };

    // audit 2026-05-13 F5: 手動 BEGIN/COMMIT/ROLLBACK を rusqlite::Transaction API に置換。
    // 利点: Drop で auto-rollback (panic / early-return でも safe)、 commit 失敗時の
    // diagnostics 明確化。 bulk_* と同じ pattern に統一。
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;

    item_repository::insert(&tx, &item)?;

    // システムタグ自動付与（item_type別）
    let sys_tag_id = tag::sys_type_tag_id(&input.item_type);
    item_repository::add_system_tag(&tx, &id, &sys_tag_id)?;

    // ユーザー指定タグ
    item_repository::set_tags(&tx, &id, &input.tag_ids)?;

    let created = item_repository::find_by_id(&tx, &id)?;
    tx.commit()?;
    log::info!("item created: id={} label={}", id, item.label);
    Ok(created)
}

pub fn list_items(db: &DbState) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::find_all(&conn)
}

pub fn search_items(db: &DbState, query: &str) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let mut items = item_repository::search(&conn, query)?;

    // U-9 (2026-05-12): screens-and-flows.md User Flow §
    //   「コマンドパレットで workspace 名の dev と入力 → 予測で workspace に登録されている
    //    アイテムが出てくる」 を実装。
    // query が workspace 名 (sys-ws-* tag.name) と部分一致する場合、 該当 workspace の
    // sys-ws-<id> tag が付いた item を追加で返す (label match と OR、 重複は排除)。
    let trimmed = query.trim();
    if !trimmed.is_empty() {
        let pattern = format!("%{}%", trimmed);
        let mut stmt = conn.prepare(
            "SELECT DISTINCT i.id, i.item_type, i.label, i.target, i.args, i.working_dir,
                    i.icon_path, i.icon_type, i.aliases, i.sort_order, i.is_enabled,
                    i.is_tracked, i.default_app, i.card_override_json, i.source_widget_id, i.source_entry_key, i.created_at, i.updated_at
             FROM items i
             JOIN item_tags it ON it.item_id = i.id
             JOIN tags t ON t.id = it.tag_id
             WHERE t.id LIKE 'sys-ws-%' AND t.name LIKE ?1 AND i.is_enabled = 1
             ORDER BY i.label",
        )?;
        let rows = stmt.query_map([&pattern], |row| {
            let aliases_json: String = row.get(8)?;
            let aliases: Vec<String> = serde_json::from_str(&aliases_json).unwrap_or_default();
            let item_type_str: String = row.get(1)?;
            let item_type =
                crate::models::item::ItemType::from_str(&item_type_str).unwrap_or_else(|| {
                    log::warn!(
                        "invalid item_type '{}' in DB, defaulting to Url",
                        item_type_str
                    );
                    crate::models::item::ItemType::Url
                });
            Ok(Item {
                id: row.get(0)?,
                item_type,
                label: row.get(2)?,
                target: row.get(3)?,
                args: row.get(4)?,
                working_dir: row.get(5)?,
                icon_path: row.get(6)?,
                icon_type: row.get(7)?,
                aliases,
                sort_order: row.get(9)?,
                is_enabled: row.get(10)?,
                is_tracked: row.get(11)?,
                default_app: row.get(12)?,
                card_override_json: row.get(13)?,
                source_widget_id: row.get(14)?,
                source_entry_key: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
            })
        })?;
        // audit 2026-05-13 F2: row parse 失敗を silent drop していたが、 schema mismatch / NULL violation
        // 等は log で見える状態にする (best-effort 維持で続行、 ただし観測可能に)。
        let workspace_items: Vec<Item> = rows
            .filter_map(|r| match r {
                Ok(item) => Some(item),
                Err(e) => {
                    log::warn!("search_items: workspace row parse failed (dropped): {}", e);
                    None
                }
            })
            .collect();
        // 既存 items に含まれない workspace item を append (dedup)。
        let existing_ids: std::collections::HashSet<String> =
            items.iter().map(|i| i.id.clone()).collect();
        for it in workspace_items {
            if !existing_ids.contains(&it.id) {
                items.push(it);
            }
        }
    }
    Ok(items)
}

pub fn update_item(db: &DbState, id: &str, input: UpdateItemInput) -> Result<Item, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::update(&conn, id, &input)?;
    if let Some(tag_ids) = &input.tag_ids {
        item_repository::set_tags(&conn, id, tag_ids)?;
    }
    item_repository::find_by_id(&conn, id)
}

pub fn delete_item(db: &DbState, id: &str) -> Result<(), AppError> {
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    // PH-CF-100: 削除前に back-link を読み、 監視自動登録 item なら
    // `widget_item_hides` に「user が意図的に削除した」を記録 (INSERT OR IGNORE)。
    // これで次の scan reconcile が同 entry を skip するため、 復活させない (モグラ叩き解消)。
    let recorded_hide =
        if let Some((widget_id, entry_key)) = item_repository::find_source_back_link(&tx, id)? {
            widget_item_hides_repository::add(&tx, &widget_id, &entry_key)?;
            true
        } else {
            false
        };
    // PH-issue-006: item 削除前に widget config からも cascade 除去 (orphan 防止)。
    let cascaded = workspace_repository::cascade_remove_item_from_widgets(&tx, id)?;
    item_repository::delete(&tx, id)?;
    tx.commit()?;
    log::info!(
        "item deleted: id={} cascaded_widgets={} hide_recorded={}",
        id,
        cascaded,
        recorded_hide,
    );
    Ok(())
}

/// PH-issue-006: 削除確認 dialog 用 — 該当 item を参照する widget 数を返す。
pub fn count_item_references(db: &DbState, id: &str) -> Result<usize, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let refs = workspace_repository::find_widgets_referencing_item(&conn, id)?;
    Ok(refs.len())
}

pub fn get_tags(db: &DbState) -> Result<Vec<Tag>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::find_all(&conn)
}

pub fn create_tag(db: &DbState, input: CreateTagInput) -> Result<Tag, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "tag name must not be empty".to_string(),
        ));
    }
    let id = Uuid::now_v7().to_string();
    let tag = Tag {
        id: id.clone(),
        name: input.name,
        is_hidden: input.is_hidden,
        is_system: false,
        prefix: None,
        icon: None,
        sort_order: 0,
        created_at: String::new(), // set by DB DEFAULT on insert
    };
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::insert(&conn, &tag)?;
    tag_repository::find_by_id(&conn, &id)
}

pub fn update_tag(db: &DbState, id: &str, name: &str, is_hidden: bool) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::update(&conn, id, name, is_hidden)
}

pub fn update_tag_prefix(db: &DbState, id: &str, prefix: Option<&str>) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::update_prefix(&conn, id, prefix)
}

pub fn delete_tag(db: &DbState, id: &str) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::delete(&conn, id)
}

pub fn get_library_stats(db: &DbState) -> Result<LibraryStats, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::get_library_stats(&conn)
}

pub fn get_tag_counts(db: &DbState) -> Result<Vec<TagWithCount>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::find_all_with_counts(&conn)
}

/// PH-436: 複数アイテムに同一タグを一括追加 (transaction)。
/// item_ids は最大 1000 件 (UI で実用上の上限)。
pub fn bulk_add_tag(
    db: &DbState,
    item_ids: Vec<String>,
    tag_id: String,
) -> Result<usize, AppError> {
    if item_ids.is_empty() {
        return Ok(0);
    }
    if item_ids.len() > 1000 {
        return Err(AppError::InvalidInput(
            "bulk operation limit exceeded (>1000 items)".into(),
        ));
    }
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    let mut count = 0usize;
    for item_id in &item_ids {
        // audit 2026-05-13 F3: tx.execute() の affected rows を加算 (INSERT OR IGNORE で既存
        // 付与済 item は 0 行 affected → count に加えない)。 user 表示の「新規付与件数」 正確化。
        count += tx.execute(
            "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![item_id, tag_id],
        )?;
    }
    tx.commit()?;
    Ok(count)
}

/// PH-436: 複数アイテムから同一タグを一括削除 (transaction)。
pub fn bulk_remove_tag(
    db: &DbState,
    item_ids: Vec<String>,
    tag_id: String,
) -> Result<usize, AppError> {
    if item_ids.is_empty() {
        return Ok(0);
    }
    if item_ids.len() > 1000 {
        return Err(AppError::InvalidInput(
            "bulk operation limit exceeded (>1000 items)".into(),
        ));
    }
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    let mut count = 0usize;
    for item_id in &item_ids {
        // audit 2026-05-13 F3: affected rows 加算 (該当 (item_id, tag_id) pair なし → 0 行)。
        count += tx.execute(
            "DELETE FROM item_tags WHERE item_id = ?1 AND tag_id = ?2",
            rusqlite::params![item_id, tag_id],
        )?;
    }
    tx.commit()?;
    Ok(count)
}

/// PH-436: 複数アイテムを一括削除 (transaction、item_tags は CASCADE)。
pub fn bulk_delete_items(db: &DbState, item_ids: Vec<String>) -> Result<usize, AppError> {
    if item_ids.is_empty() {
        return Ok(0);
    }
    if item_ids.len() > 1000 {
        return Err(AppError::InvalidInput(
            "bulk operation limit exceeded (>1000 items)".into(),
        ));
    }
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    let mut count = 0usize;
    for item_id in &item_ids {
        // audit 2026-05-13 F3: affected rows 加算 (非存在 id → 0 行)。
        count += tx.execute(
            "DELETE FROM items WHERE id = ?1",
            rusqlite::params![item_id],
        )?;
    }
    tx.commit()?;
    Ok(count)
}

pub fn get_item_tags(db: &DbState, item_id: &str) -> Result<Vec<Tag>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    tag_repository::find_by_item_id(&conn, item_id)
}

pub fn search_items_in_tag(db: &DbState, tag_id: &str, query: &str) -> Result<Vec<Item>, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::search_in_tag(&conn, tag_id, query)
}

pub fn count_hidden_items(db: &DbState) -> Result<i64, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    item_repository::count_hidden_items(&conn)
}

pub fn auto_register_folder_items(
    db: &DbState,
    root_path: &str,
    workspace_id: Option<&str>,
    source_widget_id: Option<&str>,
) -> Result<Vec<Item>, AppError> {
    let root = std::path::Path::new(root_path);
    if !root.is_dir() {
        return Err(AppError::InvalidInput(format!(
            "Not a directory: {}",
            root_path
        )));
    }
    // W-9 (2026-05-19): filesystem walk (read_dir + path.is_dir()) は DB lock を
    // 握る前に完了させる。旧実装は `db.0.lock()` 保持中に walk しており、SMR HDD の
    // cold path で walk が秒級になると他の全 IPC が `Mutex<Connection>` 待ちで
    // freeze する (#524 / W-1 と同型の lock 占有)。
    let mut sub_dirs: Vec<std::path::PathBuf> = Vec::new();
    for entry in std::fs::read_dir(root).map_err(AppError::Io)?.flatten() {
        let path = entry.path();
        if path.is_dir() {
            sub_dirs.push(path);
        }
    }

    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // PH-CF-100: 監視 widget 由来の scan (source_widget_id Some) では、
    // 当該 widget の hide リストを 1 回だけ取得し、 該当 entry は scan 結果から除外する。
    // これで「user が Library から削除した folder は次の scan で復活しない」 が成立。
    let hides: std::collections::HashSet<String> = if let Some(wid) = source_widget_id {
        widget_item_hides_repository::list_by_widget(&conn, wid)?
            .into_iter()
            .collect()
    } else {
        std::collections::HashSet::new()
    };
    // 4/30 user 検収 retrospective: 旧実装は **新規登録分のみ返却** していたため、
    // 2 回目以降の呼び出しで `[]` が返り ProjectsWidget が「サブフォルダがありません」と
    // 誤判定していた。挙動変更: 既存 item も含めて root 直下の全サブフォルダを返す。
    let mut all_items: Vec<Item> = Vec::new();
    for path in sub_dirs {
        let target = path.to_string_lossy().to_string();
        // PH-CF-100: projects widget は item.target = folder path = entry_key で一致。
        // hide 判定は normalize 後の entry_key で行う (path 表現ゆらぎ吸収)。
        let entry_key = normalize_entry_key(&target);
        // PH-CF-100: 監視 widget 由来なら所有関係 (source_widget_id, source_entry_key) で
        // 重複判定。 異なる widget で同じ folder を監視している場合は別 item を作る (独立)。
        // user 経由 (source_widget_id None) の旧呼出は従来通り target パス一致。
        let existing = if let Some(wid) = source_widget_id {
            item_repository::find_by_source(&conn, wid, &entry_key)?
        } else {
            item_repository::find_by_target(&conn, &target)?
        };
        if let Some(existing) = existing {
            all_items.push(existing);
            continue;
        }
        // PH-CF-100: hide に記録されている entry は復活させない (モグラ叩き解消)。
        if source_widget_id.is_some() && hides.contains(&entry_key) {
            continue;
        }
        let default_label = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| target.clone());
        // Phase 1 (2026-05-12 user 承認): path-key snapshot 機構を廃止。
        // 削除 → 再 watch で常に fresh state (default label / is_enabled=true / default_app=None) で新規作成、
        // user 意図 override 問題 (widget 削除 → 再作成で旧設定が勝手に復活) を解消。
        // 個別設定が必要な場合は user が手動で設定し直す前提、 widget 単位の hide は Phase 2 の widget_item_hides で対応。
        let (label, is_enabled, default_app) = (default_label, true, None);
        let id = Uuid::now_v7().to_string();
        let item = Item {
            id: id.clone(),
            item_type: crate::models::item::ItemType::Folder,
            label,
            target: target.clone(),
            args: None,
            working_dir: None,
            icon_path: None,
            icon_type: None,
            aliases: vec![],
            sort_order: 0,
            is_enabled,
            is_tracked: true,
            default_app,
            card_override_json: None,
            // PH-CF-100: source_widget_id 渡されたら両列を埋める (片肺は契約違反)。
            source_widget_id: source_widget_id.map(str::to_string),
            source_entry_key: source_widget_id.map(|_| entry_key.clone()),
            created_at: String::new(),
            updated_at: String::new(),
        };
        item_repository::insert(&conn, &item)?;
        let sys_tag_id =
            crate::models::tag::sys_type_tag_id(&crate::models::item::ItemType::Folder);
        item_repository::add_system_tag(&conn, &id, &sys_tag_id)?;
        // U-7 (2026-05-12): widget 経由登録時、 workspace 名 system tag (sys-ws-<id>) も自動付与。
        if let Some(ws_id) = workspace_id {
            let ws_tag_id = format!("sys-ws-{}", ws_id);
            // tag 存在チェック (workspace 削除済 / migration 適用前等の race を抑制)
            let exists: bool = conn
                .query_row(
                    "SELECT 1 FROM tags WHERE id = ?1",
                    rusqlite::params![ws_tag_id],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            if exists {
                item_repository::add_system_tag(&conn, &id, &ws_tag_id)?;
            }
        }
        // Phase 1 (2026-05-12): widget_item_settings touch_seen は廃止 (snapshot 機構廃止)。
        all_items.push(item_repository::find_by_id(&conn, &id)?);
    }
    Ok(all_items)
}

/// 5/01 user 検収 (C2): EXE/Script ファイルを Library に Item として登録。
/// U-4 (2026-05-12): extension で item_type / sys-type-tag を分岐 (exe/com/msi → Exe、
/// bat/cmd/ps1/sh → Script)。同 target 既存なら既存 item を返す (idempotent)。
/// `label` 未指定時は filename から導出。
pub fn register_exe_item(
    db: &DbState,
    path: &str,
    label: Option<String>,
    workspace_id: Option<&str>,
) -> Result<Item, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    // PH-CF-100: 単発 register_exe_item は user 直接操作 (palette の D&D / library 追加) で
    // 監視非由来。 source は None で固定 → 監視自動登録 item にならない。
    register_exe_item_on_conn(&conn, path, label, workspace_id, None)
}

/// Mutex lock 取得済の `Connection` (or `Transaction`) を共有して 1 件分の exe item 登録処理を行う。
///
/// 直接呼出は `register_exe_items_bulk` のみ (1 回の lock + transaction で N 件処理する目的)。
/// 単発 `register_exe_item` は thin wrapper として lock を取って本 fn に委譲する。
///
/// PH-CF-100: `source` が Some なら監視自動登録経路。 `(widget_id, entry_key)` で重複判定し、
/// `widget_item_hides` に hide 記録があれば None を返す (= 復活させない)。
fn register_exe_item_on_conn(
    conn: &rusqlite::Connection,
    path: &str,
    label: Option<String>,
    workspace_id: Option<&str>,
    source: Option<(&str, &str)>,
) -> Result<Item, AppError> {
    let p = std::path::Path::new(path);
    if !p.is_file() {
        return Err(AppError::InvalidInput(format!("Not a file: {}", path)));
    }
    // PH-CF-100: 監視 widget 由来なら所有関係で重複判定 (exe-folder は entry_key=parent folder
    // ≠ item.target=exe path のため find_by_target は使えない)。 user 直接経路は従来の target 一致。
    if let Some((widget_id, entry_key)) = source {
        if let Some(existing) = item_repository::find_by_source(conn, widget_id, entry_key)? {
            return Ok(existing);
        }
        // hide 済 entry は復活させない。 InvalidInput を返して bulk 側で skip させる
        // (1 件で全体を巻き戻すと意図と外れる)。 user 直接経路 (source None) は影響なし。
        let hides = widget_item_hides_repository::list_by_widget(conn, widget_id)?;
        if hides.iter().any(|h| h == entry_key) {
            return Err(AppError::InvalidInput(format!(
                "entry hidden by widget: widget_id={widget_id} entry_key={entry_key}"
            )));
        }
    } else if let Some(existing) = item_repository::find_by_target(conn, path)? {
        return Ok(existing);
    }
    let derived_label = p
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| path.to_string());
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .unwrap_or_default();
    let item_type = match ext.as_str() {
        "bat" | "cmd" | "ps1" | "sh" => crate::models::item::ItemType::Script,
        _ => crate::models::item::ItemType::Exe,
    };
    let id = Uuid::now_v7().to_string();
    let item = Item {
        id: id.clone(),
        item_type,
        label: label.unwrap_or(derived_label),
        target: path.to_string(),
        args: None,
        working_dir: None,
        icon_path: None,
        icon_type: None,
        aliases: vec![],
        sort_order: 0,
        is_enabled: true,
        // audit batch deferred (2026-05-13) #13: is_tracked=true で watched_path cascade に
        // 載せる。 これで ExeFolder widget 削除 → cascadeRemoveWatchedPath → backend
        // find_tracked_ids_under_path (is_tracked=1 filter) で漏れず Library item も削除される
        // (Projects widget の auto_register_folder_items が is_tracked=true で動作している
        // logic に横展開、 過去 PR の漏れを是正)。
        is_tracked: true,
        default_app: None,
        card_override_json: None,
        // PH-CF-100: source が Some なら back-link 両列を埋める (片肺は契約違反)。
        source_widget_id: source.map(|(w, _)| w.to_string()),
        source_entry_key: source.map(|(_, k)| k.to_string()),
        created_at: String::new(),
        updated_at: String::new(),
    };
    item_repository::insert(conn, &item)?;
    let sys_tag_id = crate::models::tag::sys_type_tag_id(&item_type);
    item_repository::add_system_tag(conn, &id, &sys_tag_id)?;
    // U-7: widget 経由 (workspace_id 指定時) は workspace 名 system tag を自動付与。
    if let Some(ws_id) = workspace_id {
        let ws_tag_id = format!("sys-ws-{}", ws_id);
        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM tags WHERE id = ?1",
                rusqlite::params![ws_tag_id],
                |_| Ok(true),
            )
            .unwrap_or(false);
        if exists {
            item_repository::add_system_tag(conn, &id, &ws_tag_id)?;
        }
    }
    item_repository::find_by_id(conn, &id)
}

/// 5/01 user 検収 (C2): 複数 EXE を一括 Library 登録。1 件ずつ register_exe_item と同等の処理。
/// 戻り値: 各 path に対応する Item (新規 / 既存) のリスト。
///
/// audit batch (2026-05-13) #8: exe-folder widget からの bulk 登録では、
/// label を exe の file stem (例: "Game", "Setup") ではなく **親フォルダ名**
/// (例: "MyGame", "Halo Infinite") にする。 これにより exe-folder watch で
/// 「サブフォルダ単位の作品」 として識別できる。 単発 register_exe_item は影響なし。
pub fn register_exe_items_bulk(
    db: &DbState,
    paths: Vec<String>,
    workspace_id: Option<&str>,
    source_widget_id: Option<&str>,
) -> Result<Vec<Item>, AppError> {
    // K-3 perf fix (2026-05-15): 旧実装は paths を 1 件ずつ register_exe_item で処理し、
    // ループ毎に Mutex<Connection> を取り直し + auto-commit fsync が走っていたため、
    // 500 paths 規模で WAL fsync N 回 + Library 等の並行 IPC との Mutex 競合により
    // 50 秒級の freeze を発生させていた (user 報告 K-3、 EXE folder watch + Library 遷移)。
    // 修正: 1 回の lock + 1 transaction で N 件まとめて処理。Path 単位の InvalidInput は
    // best-effort で skip (scan が stale path を返した場合に bulk 全体を巻き戻さない)。
    //
    // PH-CF-100: source_widget_id Some なら exe-folder 監視 widget 由来 → 各 path の
    // 第1階層フォルダ (= parent folder) を entry_key とし、 hide 記録があれば skip。
    // 既存 (source_widget_id, entry_key) 一致 item は再利用 (find_by_source)。
    let mut conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let tx = conn.transaction()?;
    let mut out = Vec::with_capacity(paths.len());
    for path in &paths {
        let parent_label = std::path::Path::new(path)
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .map(|s| s.to_string());
        let entry_key = source_widget_id.map(|_| {
            let parent = std::path::Path::new(path)
                .parent()
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.clone());
            normalize_entry_key(&parent)
        });
        let source = match (source_widget_id, entry_key.as_deref()) {
            (Some(wid), Some(key)) => Some((wid, key)),
            _ => None,
        };
        match register_exe_item_on_conn(&tx, path, parent_label, workspace_id, source) {
            Ok(item) => out.push(item),
            // 単一 path の「ファイル不在」 等は scan の race で起こりうるため skip。
            // hide 済 entry も InvalidInput で skip される (上記 register_exe_item_on_conn 参照)。
            // それ以外の DB error (lock / SQL) は伝播させ、 transaction Drop で rollback。
            Err(AppError::InvalidInput(_)) => continue,
            Err(e) => return Err(e),
        }
    }
    tx.commit()?;
    Ok(out)
}

/// sys-starred タグを付与または解除する。
pub fn toggle_star(db: &DbState, item_id: &str, starred: bool) -> Result<Item, AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    if starred {
        item_repository::add_system_tag(&conn, item_id, "sys-starred")?;
    } else {
        item_repository::remove_system_tag(&conn, item_id, "sys-starred")?;
    }
    item_repository::find_by_id(&conn, item_id)
}

/// 起動時に必須システムタグを upsert する（べき等）。
pub fn ensure_system_tags(db: &DbState) -> Result<(), AppError> {
    let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
    let starred = Tag {
        id: "sys-starred".to_string(),
        name: "Starred".to_string(),
        is_hidden: false,
        is_system: true,
        prefix: Some("★".to_string()),
        icon: None,
        sort_order: 90,
        created_at: String::new(),
    };
    tag_repository::upsert_system_tag(&conn, &starred)
}

/// 旧 path-only API: cache を経由せずに常に PowerShell 抽出する。
/// 既存呼出 (test 等) との互換のため残置。新規呼出は `extract_item_icon_cached` を使う。
pub fn extract_item_icon(
    app_data_dir: &std::path::Path,
    exe_path: &str,
) -> Result<String, AppError> {
    let icons_dir = app_data_dir.join("icons");
    std::fs::create_dir_all(&icons_dir)?;
    let output_path = icon::build_icon_output_path(&icons_dir);
    icon::extract_icon_from_exe(exe_path, &output_path)
}

/// R9-B: icon_cache 経由の icon 抽出 (Lessons.md C-2 派生対処)。
///
/// canonicalize 後の exe_path をキーに icon_cache を lookup:
///   - hit + 既存 PNG ファイル健在 → cached icon_path をそのまま返す (PowerShell 起動不要)
///   - miss / cached PNG 消失 → 抽出 → cache を upsert → 新 icon_path を返す
///
/// 同じ exe を別 item で登録する 2 件目以降は cache hit となり ~0ms。
/// canonicalize 失敗 (権限不足 / リンク切れ) 時は cache を経由せず素朴抽出にフォールバック。
pub fn extract_item_icon_cached(
    db: &DbState,
    app_data_dir: &std::path::Path,
    exe_path: &str,
) -> Result<String, AppError> {
    let cache_key = std::fs::canonicalize(exe_path)
        .ok()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| exe_path.to_string());

    {
        let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
        if let Some(cached) = icon_cache_repository::find_by_exe_path(&conn, &cache_key)? {
            // PNG ファイル健在チェック (削除されていれば再抽出)
            if std::path::Path::new(&cached).exists() {
                return Ok(cached);
            }
            // 削除済 → cache から drop して再抽出 fallthrough
            icon_cache_repository::delete(&conn, &cache_key)?;
        }
    }

    let new_path = extract_item_icon(app_data_dir, exe_path)?;
    {
        let conn = db.0.lock().map_err(|_| AppError::DbLock)?;
        icon_cache_repository::upsert(&conn, &cache_key, &new_path)?;
    }
    Ok(new_path)
}

/// 見た目設定で選んだアイコン画像が copy 可能な拡張子。
const ICON_ALLOWED_EXTENSIONS: &[&str] =
    &["png", "ico", "jpg", "jpeg", "svg", "webp", "gif", "bmp"];

/// 見た目設定でユーザーが選んだアイコン画像を `<app_data_dir>/icons/<uuid>.<ext>` へ
/// copy し、保存先 path を返す。
///
/// 真因 (2026-05-19): file picker で得た生 path をそのまま `icon_path` に保存すると、
/// asset protocol scope (`$APPDATA/icons/**`) 外のため webview が画像を読めず、
/// fallback アイコンが中央に小さく表示されていた。image-scrap / wallpaper と同じく
/// scope 内 dir へ copy してから保存する。
pub fn save_icon_file(
    app_data_dir: &std::path::Path,
    source_path: &str,
) -> Result<String, AppError> {
    let source = std::path::Path::new(source_path);
    if !source.exists() {
        return Err(AppError::InvalidInput(format!(
            "icon source not found: {source_path}"
        )));
    }
    let ext = source
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| AppError::InvalidInput("icon file has no extension".into()))?;
    if !ICON_ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "unsupported icon format: {ext}. allowed: {}",
            ICON_ALLOWED_EXTENSIONS.join(", ")
        )));
    }
    let icons_dir = app_data_dir.join("icons");
    std::fs::create_dir_all(&icons_dir)?;
    let dest_path = icons_dir.join(format!("{}.{ext}", Uuid::now_v7()));
    std::fs::copy(source, &dest_path)?;
    // Tauri v2 asset:// は Windows backslash path で intermittent load 失敗するため
    // forward slash に正規化して返す (image_scrap_service と同 pattern)。
    Ok(dest_path.to_string_lossy().into_owned().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::initialize_in_memory;
    use crate::models::item::ItemType;
    use crate::utils::icon::build_icon_output_path;

    fn make_input(item_type: ItemType, label: &str) -> CreateItemInput {
        CreateItemInput {
            item_type,
            label: label.to_string(),
            target: "C:/app.exe".to_string(),
            args: None,
            working_dir: None,
            icon_path: None,
            aliases: vec![],
            tag_ids: vec![],
            is_tracked: true,
        }
    }

    #[test]
    fn save_icon_file_copies_into_icons_dir() {
        let app_data = std::env::temp_dir().join(format!("arcagate-icon-{}", Uuid::now_v7()));
        std::fs::create_dir_all(&app_data).unwrap();
        let src = app_data.join("source.png");
        std::fs::write(&src, b"\x89PNG\r\n\x1a\n").unwrap();

        let dest = save_icon_file(&app_data, src.to_str().unwrap()).unwrap();

        assert!(
            dest.contains("icons"),
            "dest must be under icons dir: {dest}"
        );
        assert!(dest.ends_with(".png"));
        assert!(
            !dest.contains('\\'),
            "dest must use forward slashes: {dest}"
        );
        assert!(std::path::Path::new(&dest).exists());
        std::fs::remove_dir_all(&app_data).ok();
    }

    #[test]
    fn save_icon_file_rejects_missing_source() {
        let app_data = std::env::temp_dir().join(format!("arcagate-icon-{}", Uuid::now_v7()));
        std::fs::create_dir_all(&app_data).unwrap();
        let result = save_icon_file(&app_data, "Z:/__never_exists__/x.png");
        assert!(result.is_err());
        std::fs::remove_dir_all(&app_data).ok();
    }

    #[test]
    fn save_icon_file_rejects_unsupported_extension() {
        let app_data = std::env::temp_dir().join(format!("arcagate-icon-{}", Uuid::now_v7()));
        std::fs::create_dir_all(&app_data).unwrap();
        let src = app_data.join("doc.pdf");
        std::fs::write(&src, b"%PDF").unwrap();
        let result = save_icon_file(&app_data, src.to_str().unwrap());
        assert!(result.is_err());
        std::fs::remove_dir_all(&app_data).ok();
    }

    #[test]
    fn test_create_item_all_types() {
        let db = initialize_in_memory();

        let types = [
            ItemType::Exe,
            ItemType::Url,
            ItemType::Folder,
            ItemType::Script,
            ItemType::Command,
        ];
        for item_type in types {
            let label = format!("{:?} App", item_type);
            let result = create_item(&db, make_input(item_type, &label));
            assert!(result.is_ok(), "create_item failed for {:?}", item_type);
            let item = result.unwrap();
            assert_eq!(item.item_type, item_type);
            assert_eq!(item.label, label);
        }
    }

    #[test]
    fn test_create_item_assigns_system_tag() {
        let db = initialize_in_memory();
        let item = create_item(&db, make_input(ItemType::Exe, "TestApp")).unwrap();

        let tags = get_item_tags(&db, &item.id).unwrap();
        assert!(
            tags.iter().any(|t| t.id == "sys-type-exe"),
            "system tag sys-type-exe should be assigned"
        );
    }

    #[test]
    fn test_create_item_empty_label_returns_error() {
        let db = initialize_in_memory();
        let result = create_item(&db, make_input(ItemType::Exe, ""));
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_create_item_whitespace_label_returns_error() {
        let db = initialize_in_memory();
        let result = create_item(&db, make_input(ItemType::Exe, "   "));
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_list_items() {
        let db = initialize_in_memory();
        create_item(&db, make_input(ItemType::Exe, "App1")).unwrap();
        create_item(&db, make_input(ItemType::Url, "Site")).unwrap();

        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 2);
    }

    #[test]
    fn test_get_library_stats() {
        let db = initialize_in_memory();
        create_item(&db, make_input(ItemType::Exe, "App1")).unwrap();
        create_item(&db, make_input(ItemType::Url, "Site")).unwrap();

        let stats = get_library_stats(&db).unwrap();
        assert_eq!(stats.total_items, 2);
        assert_eq!(stats.recent_launch_count, 0);
    }

    #[test]
    fn test_get_tag_counts() {
        let db = initialize_in_memory();

        let tag = create_tag(
            &db,
            CreateTagInput {
                name: "games".to_string(),
                is_hidden: false,
            },
        )
        .unwrap();

        let mut input = make_input(ItemType::Exe, "Game");
        input.tag_ids = vec![tag.id.clone()];
        create_item(&db, input).unwrap();

        let counts = get_tag_counts(&db).unwrap();
        let games = counts.iter().find(|t| t.name == "games");
        assert!(games.is_some());
        assert_eq!(games.unwrap().item_count, 1);
    }

    #[test]
    fn test_search_items_in_tag() {
        let db = initialize_in_memory();

        // Search by system tag
        create_item(&db, make_input(ItemType::Exe, "App1")).unwrap();
        create_item(&db, make_input(ItemType::Url, "Site1")).unwrap();

        let exe_items = search_items_in_tag(&db, "sys-type-exe", "").unwrap();
        assert_eq!(exe_items.len(), 1);
        assert_eq!(exe_items[0].label, "App1");
    }

    #[test]
    fn test_delete_item() {
        let db = initialize_in_memory();
        let item = create_item(&db, make_input(ItemType::Exe, "App")).unwrap();
        delete_item(&db, &item.id).unwrap();

        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 0);
    }

    #[test]
    fn test_build_icon_output_path_has_png_extension() {
        let dir = std::path::Path::new("C:/data/icons");
        let path = build_icon_output_path(dir);
        assert!(
            path.ends_with(".png"),
            "path should end with .png: {}",
            path
        );
        assert!(
            path.starts_with("C:") || path.starts_with("C:\\"),
            "path should start with icons dir: {}",
            path
        );
    }

    #[test]
    fn test_build_icon_output_path_unique() {
        let dir = std::path::Path::new("/tmp/icons");
        let path1 = build_icon_output_path(dir);
        let path2 = build_icon_output_path(dir);
        assert_ne!(path1, path2, "each call should produce unique filename");
    }

    #[test]
    fn test_create_item_transaction_commits_item_and_tags() {
        let db = initialize_in_memory();

        // ユーザータグを先に作成
        let tag = create_tag(
            &db,
            CreateTagInput {
                name: "dev-tools".to_string(),
                is_hidden: false,
            },
        )
        .unwrap();

        let mut input = make_input(ItemType::Exe, "Transactional App");
        input.tag_ids = vec![tag.id.clone()];
        let item = create_item(&db, input).unwrap();

        // トランザクション内でアイテムとタグの両方がコミットされていること
        let tags = get_item_tags(&db, &item.id).unwrap();
        let has_user_tag = tags.iter().any(|t| t.id == tag.id);
        let has_sys_tag = tags.iter().any(|t| t.id == "sys-type-exe");
        assert!(has_user_tag, "user tag should be committed");
        assert!(has_sys_tag, "system tag should be committed");
    }

    #[test]
    fn test_create_item_invalid_tag_rolls_back() {
        let db = initialize_in_memory();

        // 存在しない tag_id を指定 → FK制約違反でトランザクションがロールバックされる
        let mut input = make_input(ItemType::Exe, "Ghost Tag App");
        input.tag_ids = vec!["nonexistent-tag-id".to_string()];
        let result = create_item(&db, input);

        assert!(result.is_err(), "should fail with FK constraint");

        // ロールバックにより items テーブルにレコードが残っていないこと
        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 0, "item should be rolled back");
    }

    #[test]
    fn test_extract_item_icon_creates_icons_dir() {
        let tmp = std::env::temp_dir().join(format!("arcagate_test_{}", uuid::Uuid::now_v7()));
        let icons_dir = tmp.join("icons");
        assert!(!icons_dir.exists());

        // extract_item_icon will create icons/ dir even if PowerShell fails
        // (because dir creation happens before PowerShell call)
        let _ = extract_item_icon(&tmp, "nonexistent.exe");
        assert!(icons_dir.exists(), "icons dir should be created");

        // cleanup
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_auto_register_folder_items() {
        let db = initialize_in_memory();

        // Create temp dir with subdirectories
        let tmp = std::env::temp_dir().join(format!("arcagate_auto_reg_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("project-a")).unwrap();
        std::fs::create_dir_all(tmp.join("project-b")).unwrap();
        // Also create a file (should be skipped)
        std::fs::write(tmp.join("readme.txt"), "hello").unwrap();

        let root_path = tmp.to_string_lossy().to_string();
        let result = auto_register_folder_items(&db, &root_path, None, None).unwrap();
        assert_eq!(result.len(), 2, "should register 2 subdirectories");

        // Verify items are in the database
        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 2);
        let labels: Vec<&str> = items.iter().map(|i| i.label.as_str()).collect();
        assert!(labels.contains(&"project-a"));
        assert!(labels.contains(&"project-b"));

        // Verify system tag is assigned
        for item in &items {
            let tags = get_item_tags(&db, &item.id).unwrap();
            assert!(
                tags.iter().any(|t| t.id == "sys-type-folder"),
                "system tag sys-type-folder should be assigned"
            );
        }

        // 4/30 user 検収: 2 回目以降の呼び出しは **既存 + 新規** をすべて返す
        // (旧仕様の 「新規分のみ」 → ProjectsWidget で空判定される bug 解消)。
        // DB 上の重複作成は依然防止 (find_by_target で skip insert)。
        let result2 = auto_register_folder_items(&db, &root_path, None, None).unwrap();
        assert_eq!(
            result2.len(),
            2,
            "should return all subdirs (existing + new)"
        );
        let items_after = list_items(&db).unwrap();
        assert_eq!(
            items_after.len(),
            2,
            "DB should still have only 2 items (no duplicates)"
        );

        // cleanup
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_auto_register_folder_items_invalid_path() {
        let db = initialize_in_memory();
        let result = auto_register_folder_items(&db, "C:/nonexistent/path/xyz", None, None);
        assert!(
            matches!(result, Err(AppError::InvalidInput(_))),
            "should return InvalidInput for non-directory"
        );
    }

    /// K-3 (2026-05-15) perf regression test: bulk 登録は 1 transaction で完了し、
    /// 単一 path の InvalidInput (= scan が stale path を返した想定) は skip され、
    /// 残りの正常 path は最後まで commit されること (transaction-wrap で巻き戻されない)。
    #[test]
    fn test_register_exe_items_bulk_skips_invalid_paths() {
        let db = initialize_in_memory();
        // tmp に exe 拡張子の dummy file を 2 つ作る (1 つは存在しない path を混ぜる)
        let tmp = std::env::temp_dir().join(format!("arcagate_k3_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("AppA")).unwrap();
        std::fs::create_dir_all(tmp.join("AppB")).unwrap();
        let a_exe = tmp.join("AppA").join("a.exe");
        let b_exe = tmp.join("AppB").join("b.exe");
        std::fs::write(&a_exe, b"MZ").unwrap();
        std::fs::write(&b_exe, b"MZ").unwrap();
        let ghost = tmp.join("AppC").join("ghost.exe"); // 親ディレクトリ無し → is_file()=false

        let paths = vec![
            a_exe.to_string_lossy().to_string(),
            ghost.to_string_lossy().to_string(),
            b_exe.to_string_lossy().to_string(),
        ];
        let registered = register_exe_items_bulk(&db, paths, None, None).unwrap();

        assert_eq!(registered.len(), 2, "valid 2 paths should be registered");
        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 2, "DB should have 2 items (ghost skipped)");
        let labels: Vec<&str> = items.iter().map(|i| i.label.as_str()).collect();
        assert!(labels.contains(&"AppA"));
        assert!(labels.contains(&"AppB"));

        // 2 回目: 既存 paths は find_by_target で skip insert、 結果には同じ Item を返す
        let again = register_exe_items_bulk(
            &db,
            vec![
                a_exe.to_string_lossy().to_string(),
                b_exe.to_string_lossy().to_string(),
            ],
            None,
            None,
        )
        .unwrap();
        assert_eq!(again.len(), 2);
        let items_after = list_items(&db).unwrap();
        assert_eq!(items_after.len(), 2, "no duplicate insertion");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    // PH-444 (batch-101): bulk tag operations のテスト
    #[test]
    fn test_bulk_add_tag_creates_links() {
        let db = initialize_in_memory();
        ensure_system_tags(&db).unwrap();

        let mut ids = Vec::new();
        for i in 0..5 {
            let item = create_item(&db, make_input(ItemType::Url, &format!("item-{}", i))).unwrap();
            ids.push(item.id);
        }

        let count = bulk_add_tag(&db, ids.clone(), "sys-starred".to_string()).unwrap();
        assert_eq!(count, 5);

        // 全件で tag 取得できることを確認
        for id in &ids {
            let tags = get_item_tags(&db, id).unwrap();
            assert!(
                tags.iter().any(|t| t.id == "sys-starred"),
                "item {} should have sys-starred tag",
                id
            );
        }
    }

    #[test]
    fn test_bulk_add_tag_empty_returns_zero() {
        let db = initialize_in_memory();
        let count = bulk_add_tag(&db, vec![], "sys-starred".to_string()).unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_bulk_add_tag_over_limit_returns_invalid_input() {
        let db = initialize_in_memory();
        let ids: Vec<String> = (0..1001).map(|i| format!("id-{}", i)).collect();
        let result = bulk_add_tag(&db, ids, "sys-starred".to_string());
        assert!(matches!(result, Err(AppError::InvalidInput(_))));
    }

    #[test]
    fn test_bulk_remove_tag_removes_links() {
        let db = initialize_in_memory();
        ensure_system_tags(&db).unwrap();

        let mut ids = Vec::new();
        for i in 0..3 {
            let item = create_item(&db, make_input(ItemType::Url, &format!("rm-{}", i))).unwrap();
            ids.push(item.id);
        }
        bulk_add_tag(&db, ids.clone(), "sys-starred".to_string()).unwrap();

        let count = bulk_remove_tag(&db, ids.clone(), "sys-starred".to_string()).unwrap();
        assert_eq!(count, 3);

        for id in &ids {
            let tags = get_item_tags(&db, id).unwrap();
            assert!(
                !tags.iter().any(|t| t.id == "sys-starred"),
                "item {} should NOT have sys-starred tag",
                id
            );
        }
    }

    #[test]
    fn test_bulk_delete_items_removes_all() {
        let db = initialize_in_memory();
        ensure_system_tags(&db).unwrap();

        let mut ids = Vec::new();
        for i in 0..4 {
            let item = create_item(&db, make_input(ItemType::Url, &format!("del-{}", i))).unwrap();
            ids.push(item.id);
        }

        let count = bulk_delete_items(&db, ids.clone()).unwrap();
        assert_eq!(count, 4);

        let remaining = list_items(&db).unwrap();
        for id in &ids {
            assert!(
                !remaining.iter().any(|i| i.id == *id),
                "item {} should be deleted",
                id
            );
        }
    }

    #[test]
    fn test_bulk_delete_empty_returns_zero() {
        let db = initialize_in_memory();
        let count = bulk_delete_items(&db, vec![]).unwrap();
        assert_eq!(count, 0);
    }

    // ==================================================
    // PH-CF-100: 監視アイテムの逆方向ライフサイクル test
    // ==================================================

    /// FK 充足のため projects 監視 widget 相当の row を作って widget_id を返す。
    fn seed_projects_widget(db: &DbState) -> String {
        let conn = db.0.lock().unwrap();
        conn.execute(
            "INSERT INTO workspaces (id, name, sort_order, wallpaper_opacity, wallpaper_blur)
             VALUES ('ws1', 'WS', 0, 0.6, 0)",
            [],
        )
        .ok();
        let wid = "w-projects-1".to_string();
        conn.execute(
            "INSERT INTO workspace_widgets (id, workspace_id, widget_type, position_x, position_y, width, height)
             VALUES (?1, 'ws1', 'projects', 0, 0, 2, 2)",
            rusqlite::params![wid],
        )
        .unwrap();
        wid
    }

    fn seed_exe_folder_widget(db: &DbState) -> String {
        let conn = db.0.lock().unwrap();
        conn.execute(
            "INSERT INTO workspaces (id, name, sort_order, wallpaper_opacity, wallpaper_blur)
             VALUES ('ws1', 'WS', 0, 0.6, 0)",
            [],
        )
        .ok();
        let wid = "w-exe-1".to_string();
        conn.execute(
            "INSERT INTO workspace_widgets (id, workspace_id, widget_type, position_x, position_y, width, height)
             VALUES (?1, 'ws1', 'exe_folder', 0, 0, 2, 2)",
            rusqlite::params![wid],
        )
        .unwrap();
        wid
    }

    /// projects 監視 widget 由来の auto register → Library 削除 → 再 scan で
    /// 復活しないこと (= widget_item_hides 連動でモグラ叩き解消)。
    #[test]
    fn test_projects_auto_register_delete_no_resurrection() {
        let db = initialize_in_memory();
        let widget_id = seed_projects_widget(&db);

        let tmp = std::env::temp_dir().join(format!("arcagate_lc_proj_{}", Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("Sub")).unwrap();
        let root = tmp.to_string_lossy().to_string();

        // 1st scan: subdir 1 件登録 + back-link が埋まる
        let first = auto_register_folder_items(&db, &root, None, Some(&widget_id)).unwrap();
        assert_eq!(first.len(), 1);
        let item = &first[0];
        assert_eq!(item.source_widget_id.as_deref(), Some(widget_id.as_str()));
        assert!(item.source_entry_key.is_some(), "entry_key 必須");

        // user が Library から削除 → widget_item_hides に entry_key が記録される
        delete_item(&db, &item.id).unwrap();
        {
            let conn = db.0.lock().unwrap();
            let hide_count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM widget_item_hides WHERE widget_id = ?1",
                    rusqlite::params![widget_id],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(hide_count, 1, "Library 削除で hide が記録される");
        }

        // 2nd scan: 同 entry は hide で skip され復活しない
        let second = auto_register_folder_items(&db, &root, None, Some(&widget_id)).unwrap();
        assert!(
            second.is_empty(),
            "hide 済 entry は復活しない: got {:?}",
            second
        );
        let items = list_items(&db).unwrap();
        assert_eq!(items.len(), 0, "DB 上にも復活していない");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    /// widget_item_hides から手動で entry を消すと、 次の scan で再登録される
    /// (= 復元 UI = PH-CF-500 の data model 側が機能)。
    #[test]
    fn test_projects_auto_register_unhide_resurrects() {
        let db = initialize_in_memory();
        let widget_id = seed_projects_widget(&db);

        let tmp = std::env::temp_dir().join(format!("arcagate_lc_unhide_{}", Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("Restored")).unwrap();
        let root = tmp.to_string_lossy().to_string();

        let first = auto_register_folder_items(&db, &root, None, Some(&widget_id)).unwrap();
        let item = first[0].clone();
        let entry_key = item.source_entry_key.clone().unwrap();
        delete_item(&db, &item.id).unwrap();

        // 復元: hide から entry を解除 (= PH-CF-500 の UI ボタン相当)
        {
            let conn = db.0.lock().unwrap();
            widget_item_hides_repository::remove(&conn, &widget_id, &entry_key).unwrap();
        }
        // 次の scan で再登録される (新 UUID で復活)
        let second = auto_register_folder_items(&db, &root, None, Some(&widget_id)).unwrap();
        assert_eq!(second.len(), 1, "hide 解除で復活");
        assert_ne!(second[0].id, item.id, "新 UUID で復活");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    /// 自動登録経路の insert で `(source_widget_id, source_entry_key)` 両方が埋まる
    /// (片肺 back-link は契約違反 — audit query が検出する形にする)。
    #[test]
    fn test_back_link_both_columns_filled_on_auto_register() {
        let db = initialize_in_memory();
        let widget_id = seed_projects_widget(&db);
        let tmp = std::env::temp_dir().join(format!("arcagate_lc_both_{}", Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("Sub1")).unwrap();
        std::fs::create_dir_all(tmp.join("Sub2")).unwrap();
        let root = tmp.to_string_lossy().to_string();

        let items = auto_register_folder_items(&db, &root, None, Some(&widget_id)).unwrap();
        assert_eq!(items.len(), 2);
        for it in &items {
            assert!(
                it.source_widget_id.is_some() && it.source_entry_key.is_some(),
                "両列必須: id={} sw={:?} sk={:?}",
                it.id,
                it.source_widget_id,
                it.source_entry_key,
            );
        }

        // 片肺 (一方 NULL) 行を検出する audit query。 期待: 0 violations。
        let conn = db.0.lock().unwrap();
        let half_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items
                 WHERE (source_widget_id IS NULL) <> (source_entry_key IS NULL)",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(half_count, 0, "片肺 back-link なし");

        drop(conn);
        let _ = std::fs::remove_dir_all(&tmp);
    }

    /// 監視 widget を削除 → 該当 widget_item_hides 行が CASCADE で消える / 該当 item の
    /// source_widget_id が SET NULL になり Library に残る (= user 持ち item に降格)。
    #[test]
    fn test_widget_delete_cascades_hides_and_sets_null_source() {
        let db = initialize_in_memory();
        let widget_id = seed_projects_widget(&db);
        let tmp = std::env::temp_dir().join(format!("arcagate_lc_widel_{}", Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("KeepMe")).unwrap();
        let root = tmp.to_string_lossy().to_string();

        let items = auto_register_folder_items(&db, &root, None, Some(&widget_id)).unwrap();
        let item_id = items[0].id.clone();
        // hide も 1 つ仕込んでおく
        {
            let conn = db.0.lock().unwrap();
            widget_item_hides_repository::add(&conn, &widget_id, "C:/other").unwrap();
        }

        // widget 削除 (CASCADE で widget_item_hides 消える / items.source_widget_id SET NULL)
        {
            let conn = db.0.lock().unwrap();
            conn.execute(
                "DELETE FROM workspace_widgets WHERE id = ?1",
                rusqlite::params![widget_id],
            )
            .unwrap();
        }

        let conn = db.0.lock().unwrap();
        let hides: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM widget_item_hides WHERE widget_id = ?1",
                rusqlite::params![widget_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(hides, 0, "widget 削除で hides CASCADE");

        let it_still: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM items WHERE id = ?1",
                rusqlite::params![item_id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(it_still, 1, "item は Library に残る (降格)");
        let sw: Option<String> = conn
            .query_row(
                "SELECT source_widget_id FROM items WHERE id = ?1",
                rusqlite::params![item_id],
                |r| r.get(0),
            )
            .unwrap();
        assert!(sw.is_none(), "source_widget_id は SET NULL");

        drop(conn);
        let _ = std::fs::remove_dir_all(&tmp);
    }

    /// exe-folder 監視 widget は entry_key (= 第1階層フォルダ) と item.target (exe path) が
    /// 異なる key 空間。 削除→再 scan で復活しないことを確認 (key 空間橋渡し)。
    #[test]
    fn test_exe_folder_auto_register_delete_no_resurrection() {
        let db = initialize_in_memory();
        let widget_id = seed_exe_folder_widget(&db);
        let tmp = std::env::temp_dir().join(format!("arcagate_lc_exe_{}", Uuid::now_v7()));
        std::fs::create_dir_all(tmp.join("AppX")).unwrap();
        let exe_path = tmp.join("AppX").join("app.exe");
        std::fs::write(&exe_path, b"MZ").unwrap();

        // bulk 登録: source_widget_id を渡すと parent (AppX) が entry_key になる
        let first = register_exe_items_bulk(
            &db,
            vec![exe_path.to_string_lossy().to_string()],
            None,
            Some(&widget_id),
        )
        .unwrap();
        assert_eq!(first.len(), 1);
        let item = first[0].clone();
        let parent_norm =
            normalize_entry_key(&exe_path.parent().unwrap().to_string_lossy().into_owned());
        assert_eq!(
            item.source_entry_key.as_deref(),
            Some(parent_norm.as_str()),
            "entry_key は親フォルダの正規化済 絶対パス"
        );

        // Library 削除 → hide 記録 → 再 scan で復活しない
        delete_item(&db, &item.id).unwrap();
        let second = register_exe_items_bulk(
            &db,
            vec![exe_path.to_string_lossy().to_string()],
            None,
            Some(&widget_id),
        )
        .unwrap();
        assert!(second.is_empty(), "hide 済 entry は復活しない");
        assert_eq!(list_items(&db).unwrap().len(), 0);

        let _ = std::fs::remove_dir_all(&tmp);
    }

    /// delete_item の back-link 記録は user 作成 (source NULL) item には影響しない。
    /// 通常 item の削除挙動 (cascade_remove_item_from_widgets + DELETE items) は変えない。
    #[test]
    fn test_delete_item_user_owned_no_hide_recorded() {
        let db = initialize_in_memory();
        let item = create_item(
            &db,
            CreateItemInput {
                item_type: crate::models::item::ItemType::Url,
                label: "user-it".to_string(),
                target: "https://example".to_string(),
                args: None,
                working_dir: None,
                icon_path: None,
                aliases: vec![],
                tag_ids: vec![],
                is_tracked: false,
            },
        )
        .unwrap();
        delete_item(&db, &item.id).unwrap();
        let conn = db.0.lock().unwrap();
        let hides: i64 = conn
            .query_row("SELECT COUNT(*) FROM widget_item_hides", [], |r| r.get(0))
            .unwrap();
        assert_eq!(hides, 0, "監視非由来の削除では hide が記録されない");
    }

    /// `normalize_entry_key` は path 表現の揺れ (forward/back slash 混在 / 末尾 / 付き) を
    /// 同一 entry_key に揃える。 同フォルダの異表現で 2 重登録 / hide 不発を起こさない。
    #[test]
    fn test_normalize_entry_key_consolidates_path_variants() {
        assert_eq!(normalize_entry_key("C:\\foo\\bar"), "C:/foo/bar");
        assert_eq!(normalize_entry_key("C:/foo/bar/"), "C:/foo/bar");
        assert_eq!(normalize_entry_key("C:\\foo\\bar\\"), "C:/foo/bar");
        // root-only は trim_end_matches で空にならない
        assert_eq!(normalize_entry_key("/"), "/");
    }
}

/// V1 解消 (A3 PR-A): AppServices 集約パターン用の service struct。
/// 各 method は同 module の free function に delegate (scope 限定のため既存実装は維持)。
pub struct ItemService {
    db: std::sync::Arc<crate::db::DbState>,
}

impl ItemService {
    pub fn new(db: std::sync::Arc<crate::db::DbState>) -> Self {
        Self { db }
    }

    pub fn create_item(&self, input: CreateItemInput) -> Result<Item, AppError> {
        create_item(&self.db, input)
    }

    pub fn list_items(&self) -> Result<Vec<Item>, AppError> {
        list_items(&self.db)
    }

    pub fn search_items(&self, query: &str) -> Result<Vec<Item>, AppError> {
        search_items(&self.db, query)
    }

    pub fn update_item(&self, id: &str, input: UpdateItemInput) -> Result<Item, AppError> {
        update_item(&self.db, id, input)
    }

    pub fn delete_item(&self, id: &str) -> Result<(), AppError> {
        delete_item(&self.db, id)
    }

    pub fn count_item_references(&self, id: &str) -> Result<usize, AppError> {
        count_item_references(&self.db, id)
    }

    pub fn get_tags(&self) -> Result<Vec<Tag>, AppError> {
        get_tags(&self.db)
    }

    pub fn create_tag(&self, input: CreateTagInput) -> Result<Tag, AppError> {
        create_tag(&self.db, input)
    }

    pub fn update_tag(&self, id: &str, name: &str, is_hidden: bool) -> Result<(), AppError> {
        update_tag(&self.db, id, name, is_hidden)
    }

    pub fn update_tag_prefix(&self, id: &str, prefix: Option<&str>) -> Result<(), AppError> {
        update_tag_prefix(&self.db, id, prefix)
    }

    pub fn delete_tag(&self, id: &str) -> Result<(), AppError> {
        delete_tag(&self.db, id)
    }

    pub fn get_library_stats(&self) -> Result<LibraryStats, AppError> {
        get_library_stats(&self.db)
    }

    pub fn get_tag_counts(&self) -> Result<Vec<TagWithCount>, AppError> {
        get_tag_counts(&self.db)
    }

    pub fn bulk_add_tag(&self, item_ids: Vec<String>, tag_id: String) -> Result<usize, AppError> {
        bulk_add_tag(&self.db, item_ids, tag_id)
    }

    pub fn bulk_remove_tag(
        &self,
        item_ids: Vec<String>,
        tag_id: String,
    ) -> Result<usize, AppError> {
        bulk_remove_tag(&self.db, item_ids, tag_id)
    }

    pub fn bulk_delete_items(&self, item_ids: Vec<String>) -> Result<usize, AppError> {
        bulk_delete_items(&self.db, item_ids)
    }

    pub fn get_item_tags(&self, item_id: &str) -> Result<Vec<Tag>, AppError> {
        get_item_tags(&self.db, item_id)
    }

    pub fn search_items_in_tag(&self, tag_id: &str, query: &str) -> Result<Vec<Item>, AppError> {
        search_items_in_tag(&self.db, tag_id, query)
    }

    pub fn count_hidden_items(&self) -> Result<i64, AppError> {
        count_hidden_items(&self.db)
    }

    pub fn auto_register_folder_items(
        &self,
        root_path: &str,
        workspace_id: Option<&str>,
        source_widget_id: Option<&str>,
    ) -> Result<Vec<Item>, AppError> {
        auto_register_folder_items(&self.db, root_path, workspace_id, source_widget_id)
    }

    pub fn register_exe_item(
        &self,
        path: &str,
        label: Option<String>,
        workspace_id: Option<&str>,
    ) -> Result<Item, AppError> {
        register_exe_item(&self.db, path, label, workspace_id)
    }

    pub fn register_exe_items_bulk(
        &self,
        paths: Vec<String>,
        workspace_id: Option<&str>,
        source_widget_id: Option<&str>,
    ) -> Result<Vec<Item>, AppError> {
        register_exe_items_bulk(&self.db, paths, workspace_id, source_widget_id)
    }

    pub fn toggle_star(&self, item_id: &str, starred: bool) -> Result<Item, AppError> {
        toggle_star(&self.db, item_id, starred)
    }

    pub fn ensure_system_tags(&self) -> Result<(), AppError> {
        ensure_system_tags(&self.db)
    }

    pub fn extract_item_icon_cached(
        &self,
        app_data_dir: &std::path::Path,
        exe_path: &str,
    ) -> Result<String, AppError> {
        extract_item_icon_cached(&self.db, app_data_dir, exe_path)
    }
}
