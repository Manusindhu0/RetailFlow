use rusqlite::{Connection, params};
use crate::error::{AppError, AppResult};
use crate::models::transaction::{
    CreateTransactionInput, Transaction, TransactionItem, TransactionListResponse,
    TransactionRow, PaymentRecord, TodaySummary,
};
use crate::services::inventory_service::{InventoryService, CreateAdjustmentInput};
use crate::pagination::PaginationParams;

// ─── Helpers ──────────────────────────────────────────────────────────────

fn next_invoice_number(conn: &Connection) -> AppResult<String> {
    let prefix: String = conn
        .query_row("SELECT value FROM settings WHERE key = 'invoice_prefix'", [], |r| r.get(0))
        .unwrap_or_else(|_| "INV".to_string());
    let counter: i64 = conn
        .query_row("SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'invoice_counter'", [], |r| r.get(0))
        .unwrap_or(1);
    // Increment counter
    conn.execute(
        "UPDATE settings SET value = CAST(value AS INTEGER) + 1 WHERE key = 'invoice_counter'",
        [],
    )?;
    Ok(format!("{}-{:06}", prefix, counter))
}

fn compute_item(item: &CreateTransactionInput, input_item: &crate::models::transaction::CreateTransactionItemInput) -> (f64, f64, f64, f64) {
    // Returns (discount_amount, tax_amount, line_subtotal, line_total)
    let _ = item; // silence unused
    let qty = input_item.quantity;
    let price = input_item.sale_price;
    let disc_value = input_item.discount_value.unwrap_or(0.0);
    let discount_amount = match input_item.discount_type.as_deref().unwrap_or("flat") {
        "percent" => price * qty * disc_value / 100.0,
        _ => disc_value,
    };
    let line_subtotal = price * qty - discount_amount;
    let gst = input_item.gst_rate.unwrap_or(0.0);
    let tax_amount = line_subtotal * gst / 100.0;
    let line_total = line_subtotal + tax_amount;
    (discount_amount, tax_amount, line_subtotal, line_total)
}

pub struct TransactionService;

impl TransactionService {
    // ── Create Sale (atomic) ───────────────────────────────────────────────

    pub fn create(conn: &Connection, input: CreateTransactionInput) -> AppResult<Transaction> {
        if input.items.is_empty() {
            return Err(AppError::Validation("Transaction must have at least one item".into()));
        }
        if input.payments.is_empty() {
            return Err(AppError::Validation("Transaction must have at least one payment".into()));
        }

        let invoice_number = next_invoice_number(conn)?;
        let txn_type = input.transaction_type.as_deref().unwrap_or("sale");
        let customer_id = input.customer_id.unwrap_or(1);

        // ── Compute totals ──
        let mut subtotal = 0.0_f64;
        let mut total_discount = input.discount_amount.unwrap_or(0.0);
        let mut total_tax = 0.0_f64;
        let mut computed_items = Vec::new();

        for it in &input.items {
            let (disc_amt, tax_amt, line_sub, line_total) = compute_item(&input, it);
            subtotal += it.sale_price * it.quantity;
            total_discount += disc_amt;
            total_tax += tax_amt;
            computed_items.push((disc_amt, tax_amt, line_sub, line_total));
        }

        let round_off = input.round_off.unwrap_or(0.0);
        let total_amount = subtotal - total_discount + total_tax + round_off;
        
        // Exclude credit (Udhar) from actual paid_amount so balance_due is correctly calculated
        let paid_amount: f64 = input.payments.iter()
            .filter(|p| p.payment_mode != "credit")
            .map(|p| p.amount)
            .sum();
            
        let change_amount = (paid_amount - total_amount).max(0.0);
        let balance_due = (total_amount - paid_amount).max(0.0);

        // ── Check credit limit if paying by credit ──
        if input.payments.iter().any(|p| p.payment_mode == "credit") || balance_due > 0.0 {
            if customer_id == 1 {
                return Err(AppError::Validation("Walk-in customers cannot have outstanding balances (Udhar). Please select a registered customer.".into()));
            }
            let (credit_limit, credit_balance): (f64, f64) = conn.query_row(
                "SELECT credit_limit, credit_balance FROM customers WHERE id = ?1",
                [customer_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).unwrap_or((0.0, 0.0));
            
            // Treat credit limit of 0.0 as "Unlimited"
            if credit_limit > 0.0 && credit_balance + balance_due > credit_limit {
                let cust_name: String = conn.query_row(
                    "SELECT name FROM customers WHERE id = ?1", [customer_id], |r| r.get(0)
                ).unwrap_or_default();
                return Err(AppError::CreditLimitExceeded(cust_name));
            }
        }

        // ── Begin transaction ──
        conn.execute("BEGIN IMMEDIATE", [])?;

        let result = (|| -> AppResult<i64> {
            // Insert transaction header
            conn.execute(
                "INSERT INTO transactions
                 (invoice_number, transaction_type, customer_id,
                  subtotal, discount_amount, tax_amount, round_off,
                  total_amount, paid_amount, change_amount, balance_due,
                  status, notes, ref_transaction_id)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
                params![
                    invoice_number,
                    txn_type,
                    customer_id,
                    subtotal,
                    total_discount,
                    total_tax,
                    round_off,
                    total_amount,
                    paid_amount,
                    change_amount,
                    balance_due,
                    "completed",
                    input.notes,
                    input.ref_transaction_id,
                ],
            )?;
            let txn_id = conn.last_insert_rowid();

            // Insert items + adjust stock
            for (i, it) in input.items.iter().enumerate() {
                let (disc_amt, tax_amt, line_sub, line_total) = computed_items[i];
                conn.execute(
                    "INSERT INTO transaction_items
                     (transaction_id, product_id, product_name, barcode, hsn_code,
                      quantity, unit, sale_price, cost_price, mrp,
                      discount_type, discount_value, discount_amount,
                      gst_rate, tax_amount, line_subtotal, line_total)
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
                    params![
                        txn_id,
                        it.product_id,
                        it.product_name,
                        it.barcode,
                        it.hsn_code,
                        it.quantity,
                        it.unit.as_deref().unwrap_or("pcs"),
                        it.sale_price,
                        it.cost_price.unwrap_or(0.0),
                        it.mrp.unwrap_or(0.0),
                        it.discount_type.as_deref().unwrap_or("flat"),
                        it.discount_value.unwrap_or(0.0),
                        disc_amt,
                        it.gst_rate.unwrap_or(0.0),
                        tax_amt,
                        line_sub,
                        line_total,
                    ],
                )?;

                // Deduct stock for tracked products
                if let Some(pid) = it.product_id {
                    let tracks: i64 = conn.query_row(
                        "SELECT track_inventory FROM products WHERE id = ?1", [pid],
                        |r| r.get(0)
                    ).unwrap_or(1);
                    if tracks == 1 {
                        InventoryService::adjust(conn, CreateAdjustmentInput {
                            product_id: pid,
                            user_id: None,
                            adjustment_type: if txn_type == "return" {
                                "return_in".to_string()
                            } else {
                                "sale".to_string()
                            },
                            quantity_change: if txn_type == "return" {
                                it.quantity as i64
                            } else {
                                -(it.quantity as i64)
                            },
                            unit_cost: it.cost_price,
                            reference_id: Some(txn_id),
                            reference_type: Some("transaction".to_string()),
                            notes: None,
                        })?;
                    }
                }
            }

            // Insert payments
            for pay in &input.payments {
                conn.execute(
                    "INSERT INTO payments (transaction_id, payment_mode, amount, reference_no, bank_name, status)
                     VALUES (?1,?2,?3,?4,?5,'success')",
                    params![txn_id, pay.payment_mode, pay.amount, pay.reference_no, pay.bank_name],
                )?;
            }

            // Update customer credit balance if any credit payment
            let credit_paid: f64 = input.payments
                .iter()
                .filter(|p| p.payment_mode == "credit")
                .map(|p| p.amount)
                .sum();
            if credit_paid > 0.0 || balance_due > 0.0 {
                conn.execute(
                    "UPDATE customers SET
                         credit_balance = credit_balance + ?2,
                         updated_at     = datetime('now','utc')
                     WHERE id = ?1",
                    params![customer_id, balance_due],
                )?;
            }

            Ok(txn_id)
        })();

        match result {
            Ok(txn_id) => {
                conn.execute("COMMIT", [])?;
                Self::get_by_id(conn, txn_id)
            }
            Err(e) => {
                let _ = conn.execute("ROLLBACK", []);
                Err(e)
            }
        }
    }

    // ── Get by ID ──────────────────────────────────────────────────────────

    pub fn get_by_id(conn: &Connection, id: i64) -> AppResult<Transaction> {
        let txn: Transaction = conn.query_row(
            "SELECT t.id, t.invoice_number, t.transaction_type,
                    t.customer_id, c.name,
                    t.user_id,
                    t.subtotal, t.discount_amount, t.tax_amount, t.round_off,
                    t.total_amount, t.paid_amount, t.change_amount, t.balance_due,
                    t.status, t.notes, t.ref_transaction_id,
                    t.created_at, t.updated_at
             FROM transactions t
             LEFT JOIN customers c ON t.customer_id = c.id
             WHERE t.id = ?1",
            [id],
            |row| {
                Ok(Transaction {
                    id:                 row.get(0)?,
                    invoice_number:     row.get(1)?,
                    transaction_type:   row.get(2)?,
                    customer_id:        row.get(3)?,
                    customer_name:      row.get(4)?,
                    user_id:            row.get(5)?,
                    subtotal:           row.get(6)?,
                    discount_amount:    row.get(7)?,
                    tax_amount:         row.get(8)?,
                    round_off:          row.get(9)?,
                    total_amount:       row.get(10)?,
                    paid_amount:        row.get(11)?,
                    change_amount:      row.get(12)?,
                    balance_due:        row.get(13)?,
                    status:             row.get(14)?,
                    notes:              row.get(15)?,
                    ref_transaction_id: row.get(16)?,
                    items:              vec![],
                    payments:           vec![],
                    created_at:         row.get(17)?,
                    updated_at:         row.get(18)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows =>
                AppError::NotFound(format!("Transaction id={}", id)),
            other => AppError::Database(other),
        })?;

        // Load items
        let items = Self::load_items(conn, txn.id)?;
        let payments = Self::load_payments(conn, txn.id)?;
        Ok(Transaction { items, payments, ..txn })
    }

    fn load_items(conn: &Connection, txn_id: i64) -> AppResult<Vec<TransactionItem>> {
        let mut stmt = conn.prepare(
            "SELECT id, transaction_id, product_id, product_name, barcode, hsn_code,
                    quantity, unit, sale_price, cost_price, mrp,
                    discount_type, discount_value, discount_amount,
                    gst_rate, tax_amount, line_subtotal, line_total, returned_qty
             FROM transaction_items WHERE transaction_id = ?1",
        )?;
        let items = stmt.query_map([txn_id], |r| {
            Ok(TransactionItem {
                id:              r.get(0)?,
                transaction_id:  r.get(1)?,
                product_id:      r.get(2)?,
                product_name:    r.get(3)?,
                barcode:         r.get(4)?,
                hsn_code:        r.get(5)?,
                quantity:        r.get(6)?,
                unit:            r.get(7)?,
                sale_price:      r.get(8)?,
                cost_price:      r.get(9)?,
                mrp:             r.get(10)?,
                discount_type:   r.get(11)?,
                discount_value:  r.get(12)?,
                discount_amount: r.get(13)?,
                gst_rate:        r.get(14)?,
                tax_amount:      r.get(15)?,
                line_subtotal:   r.get(16)?,
                line_total:      r.get(17)?,
                returned_qty:    r.get(18)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(items)
    }

    fn load_payments(conn: &Connection, txn_id: i64) -> AppResult<Vec<PaymentRecord>> {
        let mut stmt = conn.prepare(
            "SELECT id, transaction_id, payment_mode, amount,
                    reference_no, bank_name, status, paid_at
             FROM payments WHERE transaction_id = ?1",
        )?;
        let pays = stmt.query_map([txn_id], |r| {
            Ok(PaymentRecord {
                id:            r.get(0)?,
                transaction_id: r.get(1)?,
                payment_mode:  r.get(2)?,
                amount:        r.get(3)?,
                reference_no:  r.get(4)?,
                bank_name:     r.get(5)?,
                status:        r.get(6)?,
                paid_at:       r.get(7)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(pays)
    }

    // ── List (paginated) ──────────────────────────────────────────────────

    pub fn list_paginated(conn: &Connection, pg: &PaginationParams) -> AppResult<TransactionListResponse> {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM transactions", [], |r| r.get(0)
        )?;
        let offset = (pg.page - 1) * pg.page_size;
        let mut stmt = conn.prepare(
            "SELECT t.id, t.invoice_number, t.transaction_type,
                    t.customer_id, c.name,
                    t.subtotal, t.discount_amount, t.tax_amount,
                    t.total_amount, t.paid_amount, t.balance_due,
                    t.status, t.created_at
             FROM transactions t
             LEFT JOIN customers c ON t.customer_id = c.id
             ORDER BY t.created_at DESC
             LIMIT ?1 OFFSET ?2",
        )?;
        let items = stmt.query_map(params![pg.page_size, offset], |r| {
            Ok(TransactionRow {
                id:               r.get(0)?,
                invoice_number:   r.get(1)?,
                transaction_type: r.get(2)?,
                customer_id:      r.get(3)?,
                customer_name:    r.get(4)?,
                subtotal:         r.get(5)?,
                discount_amount:  r.get(6)?,
                tax_amount:       r.get(7)?,
                total_amount:     r.get(8)?,
                paid_amount:      r.get(9)?,
                balance_due:      r.get(10)?,
                status:           r.get(11)?,
                created_at:       r.get(12)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(TransactionListResponse { items, total, page: pg.page, page_size: pg.page_size })
    }

    // ── Today summary ─────────────────────────────────────────────────────

    pub fn today_summary(conn: &Connection) -> AppResult<TodaySummary> {
        let total_sales: f64 = conn.query_row(
            "SELECT COALESCE(SUM(total_amount), 0) FROM transactions
             WHERE status = 'completed' AND DATE(created_at) = DATE('now','utc')",
            [], |r| r.get(0),
        ).unwrap_or(0.0);

        let invoice_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM transactions
             WHERE status = 'completed' AND DATE(created_at) = DATE('now','utc')",
            [], |r| r.get(0),
        ).unwrap_or(0);

        let items_sold: i64 = conn.query_row(
            "SELECT COALESCE(SUM(ti.quantity), 0)
             FROM transaction_items ti
             JOIN transactions t ON ti.transaction_id = t.id
             WHERE t.status = 'completed' AND DATE(t.created_at) = DATE('now','utc')",
            [], |r| r.get(0),
        ).unwrap_or(0);

        let total_tax: f64 = conn.query_row(
            "SELECT COALESCE(SUM(tax_amount), 0) FROM transactions
             WHERE status = 'completed' AND DATE(created_at) = DATE('now','utc')",
            [], |r| r.get(0),
        ).unwrap_or(0.0);

        let total_discount: f64 = conn.query_row(
            "SELECT COALESCE(SUM(discount_amount), 0) FROM transactions
             WHERE status = 'completed' AND DATE(created_at) = DATE('now','utc')",
            [], |r| r.get(0),
        ).unwrap_or(0.0);

        // Per-mode sums
        let mode_sum = |mode: &str| -> f64 {
            conn.query_row(
                "SELECT COALESCE(SUM(p.amount), 0)
                 FROM payments p
                 JOIN transactions t ON p.transaction_id = t.id
                 WHERE p.payment_mode = ?1 AND p.status = 'success'
                   AND DATE(t.created_at) = DATE('now','utc')
                   AND t.status = 'completed'",
                [mode],
                |r| r.get(0),
            ).unwrap_or(0.0)
        };

        Ok(TodaySummary {
            total_sales,
            invoice_count,
            items_sold,
            cash_sales: mode_sum("cash"),
            upi_sales: mode_sum("upi"),
            card_sales: mode_sum("card"),
            credit_sales: mode_sum("credit"),
            total_tax,
            total_discount,
        })
    }
}
