use std::path::Path;

use crate::utils::error::AppError;

pub enum FileEvent {
    Created(String),
    Modified(String),
    Deleted(String),
}

pub trait FileWatcher: Send + Sync {
    fn watch(&mut self, path: &Path) -> Result<(), AppError>;
    fn unwatch(&mut self, path: &Path) -> Result<(), AppError>;
}
