use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Backup {
    pub id: i64,
    pub filename: String,
    pub file_path: String,
    pub size_bytes: i64,
    pub backup_type: String, // "manual" | "auto" | "pre_update"
    pub status: String,      // "success" | "failed" | "uploading"
    pub checksum: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}
