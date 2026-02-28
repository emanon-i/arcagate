use crate::utils::error::AppError;

pub struct ProvidedItem {
    pub label: String,
    pub target: String,
    pub item_type: String,
}

pub enum LaunchAction {
    Default,
    Custom(String),
}

pub trait ItemProvider: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn provide_items(&self) -> Result<Vec<ProvidedItem>, AppError>;
    fn on_item_launch(&self, item_id: &str) -> Result<LaunchAction, AppError>;
}
