use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub credit_limit: f64,
    pub credit_balance: f64,
    pub loyalty_points: i64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerInput {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub credit_limit: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomerInput {
    pub id: i64,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub gstin: Option<String>,
    pub credit_limit: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomerListResponse {
    pub items: Vec<Customer>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
