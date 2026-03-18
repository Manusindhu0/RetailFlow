use tauri::State;
use crate::db::connection::DbState;
use crate::models::product::{
    CreateCategoryInput, CreateProductInput, UpdateProductInput,
    Product, ProductRow, ProductListResponse, Category,
};
use crate::pagination::PaginationParams;
use crate::services::product_service::ProductService;

#[tauri::command]
pub fn get_products(
    state: State<DbState>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<ProductListResponse, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pg = PaginationParams {
        page: page.unwrap_or(1),
        page_size: page_size.unwrap_or(50),
    };
    ProductService::list_paginated(&conn, &pg, true).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_product_by_id(state: State<DbState>, id: i64) -> Result<Product, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::get_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_products(state: State<DbState>, query: String, limit: Option<i64>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::search(&conn, &query, limit.unwrap_or(20)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_product(state: State<DbState>, input: CreateProductInput) -> Result<Product, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::create(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_product(state: State<DbState>, input: UpdateProductInput) -> Result<Product, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::update(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_product(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::delete(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_low_stock_products(state: State<DbState>) -> Result<Vec<ProductRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::get_low_stock(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::get_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(state: State<DbState>, input: CreateCategoryInput) -> Result<Category, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ProductService::create_category(&conn, input).map_err(|e| e.to_string())
}
