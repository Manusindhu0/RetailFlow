use tauri::State;
use crate::db::connection::DbState;
use crate::models::invoice::{Invoice, InvoiceItem, CreateInvoiceInput, TodaySummary};

fn next_invoice_number(conn: &rusqlite::Connection) -> Result<String, String> {
    let prefix: String = conn.query_row(
        "SELECT value FROM settings WHERE key = 'invoice_prefix'", [],
        |r| r.get(0)
    ).unwrap_or_else(|_| "INV".to_string());

    let counter: i64 = conn.query_row(
        "SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'invoice_counter'", [],
        |r| r.get(0)
    ).unwrap_or(1);

    conn.execute(
        "UPDATE settings SET value = CAST(?1 AS TEXT) WHERE key = 'invoice_counter'",
        [counter + 1],
    ).map_err(|e| e.to_string())?;

    Ok(format!("{}-{:05}", prefix, counter))
}

#[tauri::command]
pub fn create_invoice(state: State<DbState>, input: CreateInvoiceInput) -> Result<Invoice, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let invoice_number = next_invoice_number(&conn)?;

    // Calculate totals
    let subtotal: f64 = input.items.iter().map(|item| {
        let price = item.sale_price;
        let qty = item.quantity as f64;
        let disc = item.discount.unwrap_or(0.0);
        (price - disc) * qty
    }).sum();

    let discount = input.discount.unwrap_or(0.0);
    let taxable = subtotal - discount;
    let tax: f64 = input.items.iter().map(|item| {
        let price = item.sale_price;
        let qty = item.quantity as f64;
        let disc = item.discount.unwrap_or(0.0);
        let line = (price - disc) * qty;
        line * (item.tax_percent.unwrap_or(0.0) / 100.0)
    }).sum();
    let total = taxable + tax;

    conn.execute("
        INSERT INTO invoices (invoice_number, customer_id, customer_name, subtotal, discount, tax, total, payment_mode, paid_amount, notes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
    ", rusqlite::params![
        invoice_number,
        input.customer_id,
        input.customer_name,
        subtotal,
        discount,
        tax,
        total,
        input.payment_mode,
        input.paid_amount,
        input.notes,
    ]).map_err(|e| e.to_string())?;

    let invoice_id = conn.last_insert_rowid();

    // Insert items and update stock
    for item in &input.items {
        let disc = item.discount.unwrap_or(0.0);
        let tax_pct = item.tax_percent.unwrap_or(0.0);
        let line_subtotal = (item.sale_price - disc) * item.quantity as f64;
        let line_total = line_subtotal + line_subtotal * (tax_pct / 100.0);

        conn.execute("
            INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, sale_price, discount, tax_percent, line_total)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ", rusqlite::params![
            invoice_id,
            item.product_id,
            item.product_name,
            item.quantity,
            item.sale_price,
            disc,
            tax_pct,
            line_total,
        ]).map_err(|e| e.to_string())?;

        // Deduct stock
        if let Some(pid) = item.product_id {
            conn.execute(
                "UPDATE products SET stock = MAX(0, stock - ?1) WHERE id = ?2",
                rusqlite::params![item.quantity, pid],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Add ledger entry for credit
    if input.payment_mode == "credit" {
        if let Some(cid) = input.customer_id {
            conn.execute("
                INSERT INTO ledger (customer_id, invoice_id, entry_type, amount, note)
                VALUES (?1, ?2, 'credit', ?3, 'Invoice credit')
            ", rusqlite::params![cid, invoice_id, total]).map_err(|e| e.to_string())?;
        }
    }

    let id = invoice_id;
    drop(conn);
    get_invoice_by_id(state, id)?.ok_or("Invoice not found after insert".to_string())
}

#[tauri::command]
pub fn get_invoices(state: State<DbState>, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<Invoice>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let mut stmt = conn.prepare("
        SELECT id, invoice_number, customer_id, customer_name, subtotal, discount, tax, total,
               payment_mode, paid_amount, notes, created_at
        FROM invoices
        ORDER BY created_at DESC
        LIMIT ?1 OFFSET ?2
    ").map_err(|e| e.to_string())?;

    let invoices = stmt.query_map([limit, offset], |row| {
        Ok(Invoice {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            customer_id: row.get(2)?,
            customer_name: row.get(3)?,
            subtotal: row.get(4)?,
            discount: row.get(5)?,
            tax: row.get(6)?,
            total: row.get(7)?,
            payment_mode: row.get(8)?,
            paid_amount: row.get(9)?,
            notes: row.get(10)?,
            items: vec![],
            created_at: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(invoices)
}

#[tauri::command]
pub fn get_invoice_by_id(state: State<DbState>, id: i64) -> Result<Option<Invoice>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let result = conn.query_row("
        SELECT id, invoice_number, customer_id, customer_name, subtotal, discount, tax, total,
               payment_mode, paid_amount, notes, created_at
        FROM invoices WHERE id = ?1
    ", [id], |row| {
        Ok(Invoice {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            customer_id: row.get(2)?,
            customer_name: row.get(3)?,
            subtotal: row.get(4)?,
            discount: row.get(5)?,
            tax: row.get(6)?,
            total: row.get(7)?,
            payment_mode: row.get(8)?,
            paid_amount: row.get(9)?,
            notes: row.get(10)?,
            items: vec![],
            created_at: row.get(11)?,
        })
    });

    match result {
        Ok(mut invoice) => {
            // Load items
            let mut stmt = conn.prepare("
                SELECT id, invoice_id, product_id, product_name, quantity, sale_price, discount, tax_percent, line_total
                FROM invoice_items WHERE invoice_id = ?1
            ").map_err(|e| e.to_string())?;

            invoice.items = stmt.query_map([id], |row| {
                Ok(InvoiceItem {
                    id: Some(row.get(0)?),
                    invoice_id: Some(row.get(1)?),
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    quantity: row.get(4)?,
                    sale_price: row.get(5)?,
                    discount: row.get(6)?,
                    tax_percent: row.get(7)?,
                    line_total: row.get(8)?,
                })
            }).map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

            Ok(Some(invoice))
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_today_summary(state: State<DbState>) -> Result<TodaySummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let result = conn.query_row("
        SELECT
            COALESCE(SUM(total), 0),
            COUNT(*),
            COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN total ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN payment_mode = 'credit' THEN total ELSE 0 END), 0)
        FROM invoices
        WHERE date(created_at) = date('now')
    ", [], |row| {
        Ok(TodaySummary {
            total_sales: row.get(0)?,
            invoice_count: row.get(1)?,
            cash_sales: row.get(2)?,
            upi_sales: row.get(3)?,
            credit_sales: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(result)
}
