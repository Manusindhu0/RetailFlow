use rusqlite::{Connection, params};
use crate::error::{AppError, AppResult};
use crate::models::product::{
    Category, CreateCategoryInput, CreateProductInput, Product,
    ProductListResponse, ProductRow, UpdateProductInput,
};
use crate::pagination::PaginationParams;

// ─── Helper: map a row into Product ──────────────────────────────────────

fn map_product(row: &rusqlite::Row<'_>) -> rusqlite::Result<Product> {
    Ok(Product {
        id:             row.get(0)?,
        barcode:        row.get(1)?,
        name:           row.get(2)?,
        category_id:    row.get(3)?,
        category_name:  row.get(4)?,
        description:    row.get(5)?,
        sale_price:     row.get(6)?,
        cost_price:     row.get(7)?,
        mrp:            row.get::<_, Option<f64>>(8)?.unwrap_or(0.0),
        gst_rate:       row.get::<_, Option<f64>>(9)?.unwrap_or(0.0),
        stock_quantity: row.get::<_, Option<i64>>(10)?.unwrap_or(0),
        low_stock_alert:row.get::<_, Option<i64>>(11)?.unwrap_or(5),
        unit:           row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "pcs".into()),
        batch_number:   row.get(13)?,
        expiry_date:    row.get(14)?,
        is_active:      row.get::<_, i64>(15)? == 1,
        track_inventory:row.get::<_, i64>(16)? == 1,
        allow_negative: row.get::<_, i64>(17)? == 1,
        created_at:     row.get(18)?,
        updated_at:     row.get(19)?,
    })
}

fn map_product_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProductRow> {
    Ok(ProductRow {
        id:             row.get(0)?,
        barcode:        row.get(1)?,
        name:           row.get(2)?,
        category_name:  row.get(3)?,
        sale_price:     row.get(4)?,
        cost_price:     row.get(5)?,
        gst_rate:       row.get::<_, Option<f64>>(6)?.unwrap_or(0.0),
        stock_quantity: row.get::<_, Option<i64>>(7)?.unwrap_or(0),
        low_stock_alert:row.get::<_, Option<i64>>(8)?.unwrap_or(5),
        unit:           row.get::<_, Option<String>>(9)?.unwrap_or_else(|| "pcs".into()),
        expiry_date:    row.get(10)?,
        is_active:      row.get::<_, i64>(11)? == 1,
    })
}

const PRODUCT_SELECT: &str = "
    SELECT p.id, p.barcode, p.name, p.category_id, c.name AS category_name,
           p.description, p.sale_price, p.cost_price, p.mrp, p.gst_rate,
           p.stock_quantity, p.low_stock_alert, p.unit,
           p.batch_number, p.expiry_date,
           p.is_active, p.track_inventory, p.allow_negative,
           p.created_at, p.updated_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
";

pub struct ProductService;

impl ProductService {
    // ── Get by ID ──────────────────────────────────────────────────────────

    pub fn get_by_id(conn: &Connection, id: i64) -> AppResult<Product> {
        let sql = format!("{} WHERE p.id = ?1", PRODUCT_SELECT);
        conn.query_row(&sql, [id], map_product)
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows =>
                    AppError::NotFound(format!("Product id={}", id)),
                other => AppError::Database(other),
            })
    }

    // ── Search / list ──────────────────────────────────────────────────────

    pub fn search(conn: &Connection, query: &str, limit: i64) -> AppResult<Vec<Product>> {
        let pattern = format!("%{}%", query);
        let sql = format!(
            "{} WHERE p.is_active = 1 AND (p.name LIKE ?1 OR p.barcode = ?2)
             ORDER BY p.name LIMIT ?3",
            PRODUCT_SELECT
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params![pattern, query, limit], map_product)?
            .filter_map(|r| r.ok())
            .collect();
        Ok(rows)
    }

    pub fn list_paginated(
        conn: &Connection,
        pg: &PaginationParams,
        active_only: bool,
    ) -> AppResult<ProductListResponse> {
        let where_clause = if active_only { "WHERE p.is_active = 1" } else { "" };
        let count_sql = format!(
            "SELECT COUNT(*) FROM products p {}",
            where_clause
        );
        let total: i64 = conn.query_row(&count_sql, [], |r| r.get(0))?;

        let list_sql = format!(
            "SELECT p.id, p.barcode, p.name, c.name, p.sale_price, p.cost_price,
                    p.gst_rate, p.stock_quantity, p.low_stock_alert, p.unit,
                    p.expiry_date, p.is_active
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             {}
             ORDER BY p.name
             LIMIT ?1 OFFSET ?2",
            where_clause
        );
        let offset = (pg.page - 1) * pg.page_size;
        let mut stmt = conn.prepare(&list_sql)?;
        let items = stmt
            .query_map(params![pg.page_size, offset], map_product_row)?
            .filter_map(|r| r.ok())
            .collect();

        Ok(ProductListResponse {
            items,
            total,
            page: pg.page,
            page_size: pg.page_size,
        })
    }

    pub fn get_low_stock(conn: &Connection) -> AppResult<Vec<ProductRow>> {
        let sql = "
            SELECT p.id, p.barcode, p.name, c.name, p.sale_price, p.cost_price,
                   p.gst_rate, p.stock_quantity, p.low_stock_alert, p.unit,
                   p.expiry_date, p.is_active
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1 AND p.track_inventory = 1
              AND p.stock_quantity <= p.low_stock_alert
            ORDER BY p.stock_quantity ASC
        ";
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([], map_product_row)?
            .filter_map(|r| r.ok())
            .collect();
        Ok(rows)
    }

    // ── Create ─────────────────────────────────────────────────────────────

    pub fn create(conn: &Connection, input: CreateProductInput) -> AppResult<Product> {
        // Validate
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Product name cannot be empty".into()));
        }
        if input.sale_price < 0.0 {
            return Err(AppError::Validation("Sale price cannot be negative".into()));
        }
        let gst_rate = input.gst_rate.unwrap_or(0.0);
        let allowed = [0.0_f64, 5.0, 12.0, 18.0, 28.0];
        if !allowed.iter().any(|&r| (r - gst_rate).abs() < f64::EPSILON) {
            return Err(AppError::Validation(format!(
                "Invalid GST rate {}. Must be one of 0, 5, 12, 18, 28", gst_rate
            )));
        }

        conn.execute(
            "INSERT INTO products
             (barcode, name, category_id, description,
              sale_price, cost_price, mrp, gst_rate,
              stock_quantity, low_stock_alert, unit,
              batch_number, expiry_date,
              track_inventory, allow_negative)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)",
            params![
                input.barcode,
                input.name.trim(),
                input.category_id,
                input.description,
                input.sale_price,
                input.cost_price.unwrap_or(0.0),
                input.mrp.unwrap_or(0.0),
                gst_rate,
                input.stock_quantity.unwrap_or(0),
                input.low_stock_alert.unwrap_or(5),
                input.unit.as_deref().unwrap_or("pcs"),
                input.batch_number,
                input.expiry_date,
                input.track_inventory.unwrap_or(true) as i64,
                input.allow_negative.unwrap_or(false) as i64,
            ],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_by_id(conn, id)
    }

    // ── Update ─────────────────────────────────────────────────────────────

    pub fn update(conn: &Connection, input: UpdateProductInput) -> AppResult<Product> {
        // Ensure it exists first
        Self::get_by_id(conn, input.id)?;

        if let Some(ref name) = input.name {
            if name.trim().is_empty() {
                return Err(AppError::Validation("Product name cannot be empty".into()));
            }
        }
        if let Some(price) = input.sale_price {
            if price < 0.0 {
                return Err(AppError::Validation("Sale price cannot be negative".into()));
            }
        }
        if let Some(gst) = input.gst_rate {
            let allowed = [0.0_f64, 5.0, 12.0, 18.0, 28.0];
            if !allowed.iter().any(|&r| (r - gst).abs() < f64::EPSILON) {
                return Err(AppError::Validation(format!(
                    "Invalid GST rate {}. Must be one of 0, 5, 12, 18, 28", gst
                )));
            }
        }

        conn.execute(
            "UPDATE products SET
                name            = COALESCE(?2, name),
                barcode         = COALESCE(?3, barcode),
                category_id     = COALESCE(?4, category_id),
                description     = COALESCE(?5, description),
                sale_price      = COALESCE(?6, sale_price),
                cost_price      = COALESCE(?7, cost_price),
                mrp             = COALESCE(?8, mrp),
                gst_rate        = COALESCE(?9, gst_rate),
                stock_quantity  = COALESCE(?10, stock_quantity),
                low_stock_alert = COALESCE(?11, low_stock_alert),
                unit            = COALESCE(?12, unit),
                batch_number    = COALESCE(?13, batch_number),
                expiry_date     = COALESCE(?14, expiry_date),
                is_active       = COALESCE(?15, is_active),
                track_inventory = COALESCE(?16, track_inventory),
                allow_negative  = COALESCE(?17, allow_negative),
                updated_at      = datetime('now','utc')
             WHERE id = ?1",
            params![
                input.id,
                input.name,
                input.barcode,
                input.category_id,
                input.description,
                input.sale_price,
                input.cost_price,
                input.mrp,
                input.gst_rate,
                input.stock_quantity,
                input.low_stock_alert,
                input.unit,
                input.batch_number,
                input.expiry_date,
                input.is_active.map(|b| b as i64),
                input.track_inventory.map(|b| b as i64),
                input.allow_negative.map(|b| b as i64),
            ],
        )?;
        Self::get_by_id(conn, input.id)
    }

    // ── Delete (soft) ──────────────────────────────────────────────────────

    pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
        Self::get_by_id(conn, id)?;
        conn.execute(
            "UPDATE products SET is_active = 0, updated_at = datetime('now','utc') WHERE id = ?1",
            [id],
        )?;
        Ok(())
    }

    // ── Categories ─────────────────────────────────────────────────────────

    pub fn get_categories(conn: &Connection) -> AppResult<Vec<Category>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, is_active, created_at FROM categories ORDER BY name",
        )?;
        let cats = stmt
            .query_map([], |row| {
                Ok(Category {
                    id:          row.get(0)?,
                    name:        row.get(1)?,
                    description: row.get(2)?,
                    is_active:   row.get::<_, i64>(3)? == 1,
                    created_at:  row.get(4)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();
        Ok(cats)
    }

    pub fn create_category(conn: &Connection, input: CreateCategoryInput) -> AppResult<Category> {
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Category name cannot be empty".into()));
        }
        conn.execute(
            "INSERT INTO categories (name, description) VALUES (?1, ?2)",
            params![input.name.trim(), input.description],
        )?;
        let id = conn.last_insert_rowid();
        let created_at: String = conn.query_row(
            "SELECT created_at FROM categories WHERE id = ?1", [id], |r| r.get(0)
        )?;
        Ok(Category {
            id,
            name: input.name,
            description: input.description,
            is_active: true,
            created_at,
        })
    }
}
