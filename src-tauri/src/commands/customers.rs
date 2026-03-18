use tauri::State;
use crate::db::connection::DbState;
use crate::models::customer::{
    CreateCustomerInput, UpdateCustomerInput,
    Customer, CustomerListResponse,
};
use crate::models::ledger::{LedgerEntry, AddLedgerEntryInput};
use crate::pagination::PaginationParams;
use crate::services::customer_service::CustomerService;

#[tauri::command]
pub fn get_customers(
    state: State<DbState>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<CustomerListResponse, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pg = PaginationParams {
        page: page.unwrap_or(1),
        page_size: page_size.unwrap_or(50),
    };
    CustomerService::list_paginated(&conn, &pg).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_customers(state: State<DbState>, query: String) -> Result<Vec<Customer>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::search(&conn, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_customer_by_id(state: State<DbState>, id: i64) -> Result<Customer, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::get_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_customer(state: State<DbState>, input: CreateCustomerInput) -> Result<Customer, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::create(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_customer(state: State<DbState>, input: UpdateCustomerInput) -> Result<Customer, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::update(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_customer(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::delete(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_customer_ledger(
    state: State<DbState>,
    customer_id: i64,
    limit: Option<i64>,
) -> Result<Vec<LedgerEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::get_ledger(&conn, customer_id, limit.unwrap_or(100)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_ledger_entry(state: State<DbState>, input: AddLedgerEntryInput) -> Result<LedgerEntry, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    CustomerService::add_ledger_entry(
        &conn,
        input.customer_id,
        &input.entry_type,
        input.amount,
        input.note,
        input.invoice_id,
    ).map_err(|e| e.to_string())
}
