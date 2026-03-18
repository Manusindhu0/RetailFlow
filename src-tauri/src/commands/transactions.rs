use tauri::State;
use crate::db::connection::DbState;
use crate::models::transaction::{
    CreateTransactionInput, Transaction, TransactionListResponse, TodaySummary,
};
use crate::pagination::PaginationParams;
use crate::services::transaction_service::TransactionService;

#[tauri::command]
pub fn create_transaction(state: State<DbState>, input: CreateTransactionInput) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    TransactionService::create(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_transaction_by_id(state: State<DbState>, id: i64) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    TransactionService::get_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_transactions(
    state: State<DbState>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<TransactionListResponse, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pg = PaginationParams {
        page: page.unwrap_or(1),
        page_size: page_size.unwrap_or(50),
    };
    TransactionService::list_paginated(&conn, &pg).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_today_summary(state: State<DbState>) -> Result<TodaySummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    TransactionService::today_summary(&conn).map_err(|e| e.to_string())
}
