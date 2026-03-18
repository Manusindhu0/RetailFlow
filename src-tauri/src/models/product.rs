use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: i64,
    pub barcode: Option<String>,
    pub name: String,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub description: Option<String>,
    // Pricing
    pub sale_price: f64,
    pub cost_price: f64,
    pub mrp: f64,
    // Tax
    pub gst_rate: f64,
    // Stock
    pub stock_quantity: i64,
    pub low_stock_alert: i64,
    pub unit: String,
    // Batch / Expiry
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    // Flags
    pub is_active: bool,
    pub track_inventory: bool,
    pub allow_negative: bool,
    // Timestamps
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductInput {
    pub name: String,
    pub barcode: Option<String>,
    pub category_id: Option<i64>,
    pub description: Option<String>,
    pub sale_price: f64,
    pub cost_price: Option<f64>,
    pub mrp: Option<f64>,
    pub gst_rate: Option<f64>,
    pub stock_quantity: Option<i64>,
    pub low_stock_alert: Option<i64>,
    pub unit: Option<String>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub track_inventory: Option<bool>,
    pub allow_negative: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductInput {
    pub id: i64,
    pub name: Option<String>,
    pub barcode: Option<String>,
    pub category_id: Option<i64>,
    pub description: Option<String>,
    pub sale_price: Option<f64>,
    pub cost_price: Option<f64>,
    pub mrp: Option<f64>,
    pub gst_rate: Option<f64>,
    pub stock_quantity: Option<i64>,
    pub low_stock_alert: Option<i64>,
    pub unit: Option<String>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<String>,
    pub is_active: Option<bool>,
    pub track_inventory: Option<bool>,
    pub allow_negative: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryInput {
    pub name: String,
    pub description: Option<String>,
}

/// Lightweight product row for pagination list responses
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductRow {
    pub id: i64,
    pub barcode: Option<String>,
    pub name: String,
    pub category_name: Option<String>,
    pub sale_price: f64,
    pub cost_price: f64,
    pub gst_rate: f64,
    pub stock_quantity: i64,
    pub low_stock_alert: i64,
    pub unit: String,
    pub expiry_date: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductListResponse {
    pub items: Vec<ProductRow>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
