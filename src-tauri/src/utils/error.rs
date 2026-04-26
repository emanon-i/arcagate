use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Item not found: {0}")]
    NotFound(String),

    #[error("Launch failed: {0}")]
    LaunchFailed(String),

    #[error("File not found: {0}")]
    LaunchFileNotFound(String),

    #[error("Permission denied: {0}")]
    LaunchPermissionDenied(String),

    #[error("Not executable: {0}")]
    LaunchNotExecutable(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database lock error")]
    DbLock,

    #[error("Zip error: {0}")]
    Zip(String),

    #[error("Permission error: {0}")]
    Permission(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Cancelled")]
    Cancelled,

    #[error("Watch failed: {0}")]
    WatchFailed(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
