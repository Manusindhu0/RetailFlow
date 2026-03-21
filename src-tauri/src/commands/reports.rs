use tauri::State;
use crate::db::connection::DbState;
use crate::services::report_service::{
    ReportService, SalesReportRow, TopProduct, GstSummaryRow, ProfitRow, CategorySalesRow,
};
use crate::services::payment_service::PaymentService;
use crate::models::payment::{PaymentSummary, DailyPaymentBreakdown};

#[tauri::command]
pub fn get_daily_sales(
    state: State<DbState>,
    from: String,
    to: String,
) -> Result<Vec<SalesReportRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ReportService::daily_sales(&conn, &from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_top_products(
    state: State<DbState>,
    from: String,
    to: String,
    limit: Option<i64>,
) -> Result<Vec<TopProduct>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ReportService::top_products(&conn, &from, &to, limit.unwrap_or(10)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_sales_report(state: State<DbState>, from: String, to: String) -> Result<Vec<SalesReportRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ReportService::daily_sales(&conn, &from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_gst_summary(state: State<DbState>, from: String, to: String) -> Result<Vec<GstSummaryRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ReportService::gst_summary(&conn, &from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_profit_report(state: State<DbState>, from: String, to: String) -> Result<Vec<ProfitRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ReportService::profit_report(&conn, &from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_category_sales(state: State<DbState>, from: String, to: String) -> Result<Vec<CategorySalesRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    ReportService::category_sales(&conn, &from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_payment_summary(
    state: State<DbState>,
    from: String,
    to: String,
) -> Result<Vec<PaymentSummary>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    PaymentService::mode_summary(&conn, &from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_daily_payment_breakdown(
    state: State<DbState>,
    from: String,
    to: String,
) -> Result<Vec<DailyPaymentBreakdown>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    PaymentService::daily_breakdown(&conn, &from, &to).map_err(|e| e.to_string())
}
