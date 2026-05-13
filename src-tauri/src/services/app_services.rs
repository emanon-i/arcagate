use std::sync::Arc;

use crate::db::DbState;

use super::config_service::ConfigService;
use super::export_service::ExportService;
use super::item_service::ItemService;
use super::launch_service::LaunchService;
use super::metadata_service::MetadataService;
use super::opener_service::OpenerService;
use super::theme_service::ThemeService;
use super::watched_path_service::WatchedPathService;
use super::widget_item_hides_service::WidgetItemHidesService;
use super::workspace_service::WorkspaceService;

/// V1 解消 (A3 PR-A、B1 対処): 全 DB 系 service struct を集約。
/// command は `State<'_, AppServices>` で受け、`services.item.create_item(...)` 形式で呼ぶ。
/// `db: Arc<DbState>` も保持し、setup 段階や DB 直アクセスが必要な箇所 (lib.rs / watcher) で使う。
pub struct AppServices {
    pub db: Arc<DbState>,
    pub item: ItemService,
    pub workspace: WorkspaceService,
    pub theme: ThemeService,
    pub config: ConfigService,
    pub metadata: MetadataService,
    pub launch: LaunchService,
    pub export: ExportService,
    pub opener: OpenerService,
    pub watched_path: WatchedPathService,
    pub widget_item_hides: WidgetItemHidesService,
}

impl AppServices {
    pub fn new(db: Arc<DbState>) -> Self {
        Self {
            item: ItemService::new(db.clone()),
            workspace: WorkspaceService::new(db.clone()),
            theme: ThemeService::new(db.clone()),
            config: ConfigService::new(db.clone()),
            metadata: MetadataService::new(db.clone()),
            launch: LaunchService::new(db.clone()),
            export: ExportService::new(db.clone()),
            opener: OpenerService::new(db.clone()),
            watched_path: WatchedPathService::new(db.clone()),
            widget_item_hides: WidgetItemHidesService::new(db.clone()),
            db,
        }
    }
}
