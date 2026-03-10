use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub has_changes: bool,
    pub changed_count: usize,
}
