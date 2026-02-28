use crate::utils::error::AppError;

pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
}

pub struct PluginContext {
    pub data_dir: String,
}

pub trait Plugin: Send + Sync {
    fn manifest(&self) -> PluginManifest;
    fn initialize(&mut self, ctx: PluginContext) -> Result<(), AppError>;
    fn shutdown(&mut self) -> Result<(), AppError>;
}
