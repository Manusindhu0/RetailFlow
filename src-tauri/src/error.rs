use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Insufficient stock for product '{0}': available {1}, requested {2}")]
    InsufficientStock(String, i64, i64),

    #[error("Credit limit exceeded for customer '{0}'")]
    CreditLimitExceeded(String),

    #[error("Transaction error: {0}")]
    Transaction(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Other(e.to_string())
    }
}

/// Converts AppError → String for Tauri's command boundary
impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

pub type AppResult<T> = Result<T, AppError>;
