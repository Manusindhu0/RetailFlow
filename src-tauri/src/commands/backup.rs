use tauri::State;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use crate::db::connection::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub size: u64,
    pub created_at: String,
}

#[tauri::command]
pub fn create_backup(state: State<DbState>, backup_dir: String) -> Result<String, String> {
    // We need access to the db path. We use VACUUM INTO to create a clean backup.
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let backup_path = PathBuf::from(&backup_dir);
    std::fs::create_dir_all(&backup_path).map_err(|e| e.to_string())?;

    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("retailflow_backup_{}.db", timestamp);
    let full_path = backup_path.join(&filename);

    conn.execute(
        &format!("VACUUM INTO '{}'", full_path.to_string_lossy()),
        [],
    ).map_err(|e| e.to_string())?;

    Ok(filename)
}

#[tauri::command]
pub fn list_backups(backup_dir: String) -> Result<Vec<BackupInfo>, String> {
    let backup_path = PathBuf::from(&backup_dir);
    if !backup_path.exists() {
        return Ok(vec![]);
    }

    let mut backups: Vec<BackupInfo> = std::fs::read_dir(&backup_path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter(|e| {
            e.file_name().to_string_lossy().ends_with(".db")
        })
        .map(|e| {
            let meta = e.metadata().ok();
            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            let created_at = meta
                .and_then(|m| m.created().ok())
                .map(|t| {
                    let dt: chrono::DateTime<chrono::Local> = t.into();
                    dt.format("%Y-%m-%d %H:%M:%S").to_string()
                })
                .unwrap_or_default();
            BackupInfo {
                filename: e.file_name().to_string_lossy().to_string(),
                size,
                created_at,
            }
        })
        .collect();

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}
