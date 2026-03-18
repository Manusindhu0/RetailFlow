use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryAdjustment {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub user_id: Option<i64>,
    pub adjustment_type: String,
    pub quantity_change: i64,
    pub stock_before: i64,
    pub stock_after: i64,
    pub unit_cost: f64,
    pub reference_id: Option<i64>,
    pub reference_type: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAdjustmentInput {
    pub product_id: i64,
    pub user_id: Option<i64>,
    pub adjustment_type: String,
    pub quantity_change: i64,
    pub unit_cost: Option<f64>,
    pub reference_id: Option<i64>,
    pub reference_type: Option<String>,
    pub notes: Option<String>,
}

pub struct InventoryService;

impl InventoryService {
    /// Apply a stock adjustment atomically.
    /// Returns `Err(InsufficientStock)` if the new stock would go negative
    /// on a product that does not allow negative stock.
    pub fn adjust(conn: &Connection, input: CreateAdjustmentInput) -> AppResult<InventoryAdjustment> {
        // Validate type
        let valid_types = [
            "purchase", "sale", "return_in", "return_out",
            "damage", "theft", "expiry", "count", "transfer_in", "transfer_out",
        ];
        if !valid_types.contains(&input.adjustment_type.as_str()) {
            return Err(AppError::Validation(format!(
                "Invalid adjustment_type '{}'", input.adjustment_type
            )));
        }

        // Read current stock + allow_negative flag
        let (stock_before, allow_negative, product_name): (i64, bool, String) = conn.query_row(
            "SELECT stock_quantity, allow_negative, name FROM products WHERE id = ?1 AND is_active = 1",
            [input.product_id],
            |r| Ok((r.get(0)?, r.get::<_, i64>(1)? == 1, r.get(2)?)),
        ).map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows =>
                AppError::NotFound(format!("Product id={}", input.product_id)),
            other => AppError::Database(other),
        })?;

        let stock_after = stock_before + input.quantity_change;
        if stock_after < 0 && !allow_negative {
            return Err(AppError::InsufficientStock(
                product_name.clone(),
                stock_before,
                -input.quantity_change,
            ));
        }

        // Apply
        conn.execute(
            "UPDATE products SET stock_quantity = ?1, updated_at = datetime('now','utc') WHERE id = ?2",
            params![stock_after, input.product_id],
        )?;

        // Audit
        conn.execute(
            "INSERT INTO inventory_adjustments
             (product_id, user_id, adjustment_type,
              quantity_change, stock_before, stock_after,
              unit_cost, reference_id, reference_type, notes)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![
                input.product_id,
                input.user_id,
                input.adjustment_type,
                input.quantity_change,
                stock_before,
                stock_after,
                input.unit_cost.unwrap_or(0.0),
                input.reference_id,
                input.reference_type,
                input.notes,
            ],
        )?;

        let adj_id = conn.last_insert_rowid();
        let created_at: String = conn.query_row(
            "SELECT created_at FROM inventory_adjustments WHERE id = ?1",
            [adj_id], |r| r.get(0),
        )?;

        Ok(InventoryAdjustment {
            id: adj_id,
            product_id: input.product_id,
            product_name,
            user_id: input.user_id,
            adjustment_type: input.adjustment_type,
            quantity_change: input.quantity_change,
            stock_before,
            stock_after,
            unit_cost: input.unit_cost.unwrap_or(0.0),
            reference_id: input.reference_id,
            reference_type: input.reference_type,
            notes: input.notes,
            created_at,
        })
    }

    /// Fetch adjustment history for a product
    pub fn get_history(conn: &Connection, product_id: i64, limit: i64) -> AppResult<Vec<InventoryAdjustment>> {
        let mut stmt = conn.prepare(
            "SELECT ia.id, ia.product_id, p.name, ia.user_id,
                    ia.adjustment_type, ia.quantity_change,
                    ia.stock_before, ia.stock_after, ia.unit_cost,
                    ia.reference_id, ia.reference_type, ia.notes, ia.created_at
             FROM inventory_adjustments ia
             JOIN products p ON ia.product_id = p.id
             WHERE ia.product_id = ?1
             ORDER BY ia.created_at DESC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![product_id, limit], |row| {
            Ok(InventoryAdjustment {
                id:              row.get(0)?,
                product_id:      row.get(1)?,
                product_name:    row.get(2)?,
                user_id:         row.get(3)?,
                adjustment_type: row.get(4)?,
                quantity_change: row.get(5)?,
                stock_before:    row.get(6)?,
                stock_after:     row.get(7)?,
                unit_cost:       row.get::<_, Option<f64>>(8)?.unwrap_or(0.0),
                reference_id:    row.get(9)?,
                reference_type:  row.get(10)?,
                notes:           row.get(11)?,
                created_at:      row.get(12)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// Bulk count adjustment (stock-take / physical count)
    pub fn bulk_count(
        conn: &Connection,
        adjustments: Vec<CreateAdjustmentInput>,
    ) -> AppResult<Vec<InventoryAdjustment>> {
        let mut results = Vec::with_capacity(adjustments.len());
        for adj in adjustments {
            results.push(Self::adjust(conn, adj)?);
        }
        Ok(results)
    }
}
