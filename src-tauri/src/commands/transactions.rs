use tauri::State;
use rusqlite::params;
use crate::db::connection::DbState;
use crate::models::transaction::{
    CreateTransactionInput, Transaction, TransactionListResponse, TodaySummary,
};
use crate::pagination::PaginationParams;
use crate::services::transaction_service::TransactionService;

#[tauri::command]
pub fn create_transaction(state: State<DbState>, input: CreateTransactionInput) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    TransactionService::create(&conn, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_transaction_by_id(state: State<DbState>, id: i64) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    TransactionService::get_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_transactions(
    state: State<DbState>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<TransactionListResponse, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pg = PaginationParams {
        page: page.unwrap_or(1),
        page_size: page_size.unwrap_or(50),
    };
    TransactionService::list_paginated(&conn, &pg).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_today_summary(state: State<DbState>) -> Result<TodaySummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    TransactionService::today_summary(&conn).map_err(|e| e.to_string())
}

/// Accept a full or partial Udhar payment against an existing bill.
///
/// - Inserts a new payment row
/// - Updates `paid_amount` and `balance_due` on the transaction
/// - Reduces `credit_balance` on the customer
/// - Returns the refreshed Transaction
#[tauri::command]
pub fn collect_payment(
    state: State<DbState>,
    transaction_id: i64,
    amount: f64,
    payment_mode: String,
) -> Result<Transaction, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Fetch current state
    let (current_paid, current_balance, customer_id): (f64, f64, i64) = conn
        .query_row(
            "SELECT paid_amount, balance_due, customer_id FROM transactions WHERE id = ?1",
            [transaction_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    if current_balance <= 0.0 {
        return Err("This bill has no outstanding balance.".into());
    }
    if amount <= 0.0 || amount > current_balance + 0.01 {
        return Err(format!("Amount must be between ₹1 and ₹{:.2}", current_balance));
    }

    let collect_amount = amount.min(current_balance);
    let new_paid    = current_paid + collect_amount;
    let new_balance = (current_balance - collect_amount).max(0.0);

    conn.execute("BEGIN IMMEDIATE", []).map_err(|e| e.to_string())?;

    let result: Result<(), String> = (|| {
        // Insert payment record
        conn.execute(
            "INSERT INTO payments (transaction_id, payment_mode, amount, status)
             VALUES (?1, ?2, ?3, 'success')",
            params![transaction_id, payment_mode, collect_amount],
        ).map_err(|e| e.to_string())?;

        // Update transaction totals
        conn.execute(
            "UPDATE transactions SET
                paid_amount = ?2,
                balance_due = ?3,
                updated_at  = datetime('now','utc')
             WHERE id = ?1",
            params![transaction_id, new_paid, new_balance],
        ).map_err(|e| e.to_string())?;

        // Reduce customer outstanding balance
        conn.execute(
            "UPDATE customers SET
                credit_balance = MAX(0.0, credit_balance - ?2),
                updated_at     = datetime('now','utc')
             WHERE id = ?1",
            params![customer_id, collect_amount],
        ).map_err(|e| e.to_string())?;

        Ok(())
    })();

    match result {
        Ok(_) => {
            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
            TransactionService::get_by_id(&conn, transaction_id).map_err(|e| e.to_string())
        }
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            Err(e)
        }
    }
}
