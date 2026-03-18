use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub full_name: String,
    pub role: String, // "admin" | "manager" | "cashier"
    pub is_active: bool,
    pub last_login: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
