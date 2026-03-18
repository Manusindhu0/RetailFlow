use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Invoice {
    pub id: i64,
    pub invoice_number: String,
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub subtotal: f64,
    pub discount: f64,
    pub tax: f64,
    pub total: f64,
    pub payment_mode: String,
    pub paid_amount: f64,
    pub notes: Option<String>,
    pub items: Vec<InvoiceItem>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvoiceItem {
    pub id: Option<i64>,
    pub invoice_id: Option<i64>,
    pub product_id: Option<i64>,
    pub product_name: String,
    pub quantity: i64,
    pub sale_price: f64,
    pub discount: f64,
    pub tax_percent: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInvoiceInput {
    pub customer_id: Option<i64>,
    pub customer_name: Option<String>,
    pub items: Vec<InvoiceItemInput>,
    pub discount: Option<f64>,
    pub payment_mode: String,
    pub paid_amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceItemInput {
    pub product_id: Option<i64>,
    pub product_name: String,
    pub quantity: i64,
    pub sale_price: f64,
    pub discount: Option<f64>,
    pub tax_percent: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TodaySummary {
    pub total_sales: f64,
    pub invoice_count: i64,
    pub cash_sales: f64,
    pub upi_sales: f64,
    pub credit_sales: f64,
}
