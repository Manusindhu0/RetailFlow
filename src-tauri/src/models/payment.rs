use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Payment {
    pub id: i64,
    pub transaction_id: i64,
    pub invoice_number: Option<String>,
    pub payment_mode: String,
    pub amount: f64,
    pub reference_no: Option<String>,
    pub bank_name: Option<String>,
    pub status: String,
    pub paid_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentSummary {
    pub payment_mode: String,
    pub total_amount: f64,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyPaymentBreakdown {
    pub date: String,
    pub cash: f64,
    pub upi: f64,
    pub card: f64,
    pub credit: f64,
    pub cheque: f64,
    pub other: f64,
    pub total: f64,
}
