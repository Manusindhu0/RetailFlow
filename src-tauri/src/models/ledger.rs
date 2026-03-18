use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LedgerEntry {
    pub id: i64,
    pub customer_id: i64,
    pub invoice_id: Option<i64>,
    pub entry_type: String,
    pub amount: f64,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddLedgerEntryInput {
    pub customer_id: i64,
    pub invoice_id: Option<i64>,
    pub entry_type: String,
    pub amount: f64,
    pub note: Option<String>,
}
