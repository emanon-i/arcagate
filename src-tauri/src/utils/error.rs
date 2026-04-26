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

impl AppError {
    /// PH-422: フロント側構造化判定用の error code 文字列。
    /// serialize 形式は当面 string 維持 (互換性) だが、
    /// code() で取得すれば error code でカテゴリ判定可能 (将来 IPC serialize 形式変更に備える)。
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Database(_) => "db.error",
            AppError::NotFound(_) => "not_found",
            AppError::LaunchFailed(_) => "launch.failed",
            AppError::LaunchFileNotFound(_) => "launch.file_not_found",
            AppError::LaunchPermissionDenied(_) => "launch.permission_denied",
            AppError::LaunchNotExecutable(_) => "launch.not_executable",
            AppError::Validation(_) => "validation",
            AppError::Io(_) => "io.error",
            AppError::DbLock => "db.lock",
            AppError::Zip(_) => "zip",
            AppError::Permission(_) => "permission",
            AppError::InvalidInput(_) => "invalid_input",
            AppError::Cancelled => "cancelled",
            AppError::WatchFailed(_) => "watch.failed",
        }
    }
}

impl serde::Serialize for AppError {
    /// PH-429: 構造化 serialize 形式 `{ code, message }`。
    /// フロント側 catch で `e.code` / `e.message` でアクセス可能。
    /// 旧 string 形式から移行 (PH-417/422 で AppError::code() 準備済)。
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("code", self.code())?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_returns_distinct_codes_for_each_variant() {
        assert_eq!(AppError::NotFound("x".into()).code(), "not_found");
        assert_eq!(AppError::LaunchFailed("x".into()).code(), "launch.failed");
        assert_eq!(
            AppError::LaunchFileNotFound("x".into()).code(),
            "launch.file_not_found"
        );
        assert_eq!(
            AppError::LaunchPermissionDenied("x".into()).code(),
            "launch.permission_denied"
        );
        assert_eq!(
            AppError::LaunchNotExecutable("x".into()).code(),
            "launch.not_executable"
        );
        assert_eq!(AppError::Cancelled.code(), "cancelled");
        assert_eq!(AppError::WatchFailed("x".into()).code(), "watch.failed");
        assert_eq!(AppError::DbLock.code(), "db.lock");
    }
}
