use crate::utils::error::AppError;

pub struct CommandDefinition {
    pub id: String,
    pub label: String,
    pub description: String,
}

pub enum CommandResult {
    Success(String),
    Error(String),
}

pub trait CommandProvider: Send + Sync {
    fn id(&self) -> &str;
    fn commands(&self) -> Vec<CommandDefinition>;
    fn execute(&self, command_id: &str, args: &[String]) -> Result<CommandResult, AppError>;
}
