use tauri::State;
use crate::db::connection::DbState;
use crate::services::inventory_service::{
    InventoryService, InventoryAdjustment, CreateAdjustmentInput,
};

#[tauri::command]
pub fn adjust_inventory(
    state: State<DbState>,
    input: CreateAdjustmentInput,
) -> Result<InventoryAdjustment, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    InventoryService::adjust(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_inventory_history(
    state: State<DbState>,
    product_id: i64,
    limit: Option<i64>,
) -> Result<Vec<InventoryAdjustment>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    InventoryService::get_history(&conn, product_id, limit.unwrap_or(50)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn bulk_inventory_count(
    state: State<DbState>,
    adjustments: Vec<CreateAdjustmentInput>,
) -> Result<Vec<InventoryAdjustment>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    InventoryService::bulk_count(&conn, adjustments).map_err(|e| e.to_string())
}
