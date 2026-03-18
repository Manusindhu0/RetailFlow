use rusqlite::{Connection, params};
use crate::error::{AppError, AppResult};
use crate::models::customer::{
    Customer, CreateCustomerInput, CustomerListResponse, UpdateCustomerInput,
};
use crate::models::ledger::LedgerEntry;
use crate::pagination::PaginationParams;

fn map_customer(row: &rusqlite::Row<'_>) -> rusqlite::Result<Customer> {
    Ok(Customer {
        id:             row.get(0)?,
        name:           row.get(1)?,
        phone:          row.get(2)?,
        email:          row.get(3)?,
        address:        row.get(4)?,
        gstin:          row.get(5)?,
        credit_limit:   row.get(6)?,
        credit_balance: row.get(7)?,
        loyalty_points: row.get(8)?,
        is_active:      row.get::<_, i64>(9)? == 1,
        created_at:     row.get(10)?,
        updated_at:     row.get(11)?,
    })
}

const CUSTOMER_SELECT: &str = "
    SELECT id, name, phone, email, address, gstin,
           credit_limit, credit_balance, loyalty_points,
           is_active, created_at, updated_at
    FROM customers
";

pub struct CustomerService;

impl CustomerService {
    pub fn get_by_id(conn: &Connection, id: i64) -> AppResult<Customer> {
        let sql = format!("{} WHERE id = ?1", CUSTOMER_SELECT);
        conn.query_row(&sql, [id], map_customer)
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows =>
                    AppError::NotFound(format!("Customer id={}", id)),
                other => AppError::Database(other),
            })
    }

    pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<Customer>> {
        let pattern = format!("%{}%", query);
        let sql = format!(
            "{} WHERE is_active = 1 AND (name LIKE ?1 OR phone LIKE ?1) ORDER BY name LIMIT 30",
            CUSTOMER_SELECT
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map([pattern], map_customer)?
            .filter_map(|r| r.ok())
            .collect();
        Ok(rows)
    }

    pub fn list_paginated(conn: &Connection, pg: &PaginationParams) -> AppResult<CustomerListResponse> {
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM customers WHERE is_active = 1", [], |r| r.get(0)
        )?;
        let offset = (pg.page - 1) * pg.page_size;
        let sql = format!(
            "{} WHERE is_active = 1 ORDER BY name LIMIT ?1 OFFSET ?2",
            CUSTOMER_SELECT
        );
        let mut stmt = conn.prepare(&sql)?;
        let items = stmt.query_map(params![pg.page_size, offset], map_customer)?
            .filter_map(|r| r.ok())
            .collect();
        Ok(CustomerListResponse { items, total, page: pg.page, page_size: pg.page_size })
    }

    pub fn create(conn: &Connection, input: CreateCustomerInput) -> AppResult<Customer> {
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Customer name cannot be empty".into()));
        }
        conn.execute(
            "INSERT INTO customers (name, phone, email, address, gstin, credit_limit)
             VALUES (?1,?2,?3,?4,?5,?6)",
            params![
                input.name.trim(),
                input.phone,
                input.email,
                input.address,
                input.gstin,
                input.credit_limit.unwrap_or(0.0),
            ],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_by_id(conn, id)
    }

    pub fn update(conn: &Connection, input: UpdateCustomerInput) -> AppResult<Customer> {
        Self::get_by_id(conn, input.id)?;
        if let Some(ref name) = input.name {
            if name.trim().is_empty() {
                return Err(AppError::Validation("Customer name cannot be empty".into()));
            }
        }
        conn.execute(
            "UPDATE customers SET
                name         = COALESCE(?2, name),
                phone        = COALESCE(?3, phone),
                email        = COALESCE(?4, email),
                address      = COALESCE(?5, address),
                gstin        = COALESCE(?6, gstin),
                credit_limit = COALESCE(?7, credit_limit),
                is_active    = COALESCE(?8, is_active),
                updated_at   = datetime('now','utc')
             WHERE id = ?1",
            params![
                input.id,
                input.name,
                input.phone,
                input.email,
                input.address,
                input.gstin,
                input.credit_limit,
                input.is_active.map(|b| b as i64),
            ],
        )?;
        Self::get_by_id(conn, input.id)
    }

    pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
        if id == 1 {
            return Err(AppError::Validation("Cannot delete the Walk-in Customer".into()));
        }
        Self::get_by_id(conn, id)?;
        conn.execute(
            "UPDATE customers SET is_active = 0, updated_at = datetime('now','utc') WHERE id = ?1",
            [id],
        )?;
        Ok(())
    }

    // ── Ledger ────────────────────────────────────────────────────────────

    pub fn get_ledger(conn: &Connection, customer_id: i64, limit: i64) -> AppResult<Vec<LedgerEntry>> {
        Self::get_by_id(conn, customer_id)?;
        let mut stmt = conn.prepare(
            "SELECT id, customer_id, invoice_id, entry_type, amount, note, created_at
             FROM customer_ledger
             WHERE customer_id = ?1
             ORDER BY created_at DESC
             LIMIT ?2",
        )?;
        let entries = stmt.query_map(params![customer_id, limit], |r| {
            Ok(LedgerEntry {
                id:          r.get(0)?,
                customer_id: r.get(1)?,
                invoice_id:  r.get(2)?,
                entry_type:  r.get(3)?,
                amount:      r.get(4)?,
                note:        r.get(5)?,
                created_at:  r.get(6)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(entries)
    }

    pub fn add_ledger_entry(
        conn: &Connection,
        customer_id: i64,
        entry_type: &str,
        amount: f64,
        note: Option<String>,
        invoice_id: Option<i64>,
    ) -> AppResult<LedgerEntry> {
        Self::get_by_id(conn, customer_id)?;
        conn.execute(
            "INSERT INTO customer_ledger (customer_id, invoice_id, entry_type, amount, note)
             VALUES (?1,?2,?3,?4,?5)",
            params![customer_id, invoice_id, entry_type, amount, note],
        )?;
        // Update credit_balance: payment reduces, credit increases
        let delta: f64 = if entry_type == "payment" { -amount } else { amount };
        conn.execute(
            "UPDATE customers SET credit_balance = credit_balance + ?2,
             updated_at = datetime('now','utc') WHERE id = ?1",
            params![customer_id, delta],
        )?;
        let id = conn.last_insert_rowid();
        let created_at: String = conn.query_row(
            "SELECT created_at FROM customer_ledger WHERE id = ?1", [id], |r| r.get(0)
        )?;
        Ok(LedgerEntry { id, customer_id, invoice_id, entry_type: entry_type.to_string(), amount, note, created_at })
    }
}
