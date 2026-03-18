use serde::{Deserialize, Serialize};

// ─── Transaction ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub id: i64,
    pub invoice_number: String,
    pub transaction_type: String, // "sale" | "return" | "quote"
    pub customer_id: i64,
    pub customer_name: Option<String>,
    pub user_id: Option<i64>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub round_off: f64,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub change_amount: f64,
    pub balance_due: f64,
    pub status: String, // "draft" | "completed" | "cancelled" | "returned"
    pub notes: Option<String>,
    pub ref_transaction_id: Option<i64>,
    pub items: Vec<TransactionItem>,
    pub payments: Vec<PaymentRecord>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionRow {
    pub id: i64,
    pub invoice_number: String,
    pub transaction_type: String,
    pub customer_id: i64,
    pub customer_name: Option<String>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub balance_due: f64,
    pub status: String,
    pub created_at: String,
}

// ─── Transaction Item ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionItem {
    pub id: Option<i64>,
    pub transaction_id: Option<i64>,
    pub product_id: Option<i64>,
    pub product_name: String,
    pub barcode: Option<String>,
    pub hsn_code: Option<String>,
    pub quantity: f64,
    pub unit: String,
    pub sale_price: f64,
    pub cost_price: f64,
    pub mrp: f64,
    pub discount_type: String, // "flat" | "percent"
    pub discount_value: f64,
    pub discount_amount: f64,
    pub gst_rate: f64,
    pub tax_amount: f64,
    pub line_subtotal: f64,
    pub line_total: f64,
    pub returned_qty: f64,
}

// ─── Payment Record ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentRecord {
    pub id: Option<i64>,
    pub transaction_id: Option<i64>,
    pub payment_mode: String, // "cash"|"upi"|"card"|"credit"|"cheque"|"other"
    pub amount: f64,
    pub reference_no: Option<String>,
    pub bank_name: Option<String>,
    pub status: String, // "pending"|"success"|"failed"|"refunded"
    pub paid_at: String,
}

// ─── Input Types ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransactionInput {
    pub transaction_type: Option<String>,
    pub customer_id: Option<i64>,
    pub items: Vec<CreateTransactionItemInput>,
    pub discount_amount: Option<f64>,
    pub round_off: Option<f64>,
    pub payments: Vec<CreatePaymentInput>,
    pub notes: Option<String>,
    pub ref_transaction_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTransactionItemInput {
    pub product_id: Option<i64>,
    pub product_name: String,
    pub barcode: Option<String>,
    pub hsn_code: Option<String>,
    pub quantity: f64,
    pub unit: Option<String>,
    pub sale_price: f64,
    pub cost_price: Option<f64>,
    pub mrp: Option<f64>,
    pub discount_type: Option<String>,
    pub discount_value: Option<f64>,
    pub gst_rate: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentInput {
    pub payment_mode: String,
    pub amount: f64,
    pub reference_no: Option<String>,
    pub bank_name: Option<String>,
}

// ─── Summary Types ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodaySummary {
    pub total_sales: f64,
    pub invoice_count: i64,
    pub items_sold: i64,
    pub cash_sales: f64,
    pub upi_sales: f64,
    pub card_sales: f64,
    pub credit_sales: f64,
    pub total_tax: f64,
    pub total_discount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionListResponse {
    pub items: Vec<TransactionRow>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
