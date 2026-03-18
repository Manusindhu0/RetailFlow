use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SalesReportRow {
    pub date: String,
    pub total_sales: f64,
    pub invoice_count: i64,
    pub total_tax: f64,
    pub total_discount: f64,
    pub net_sales: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TopProduct {
    pub product_id: Option<i64>,
    pub product_name: String,
    pub total_qty: f64,
    pub total_revenue: f64,
    pub total_tax: f64,
    pub total_discount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategorySalesRow {
    pub category_name: String,
    pub total_qty: f64,
    pub total_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GstSummaryRow {
    pub gst_rate: f64,
    pub taxable_amount: f64,
    pub tax_amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfitRow {
    pub date: String,
    pub revenue: f64,
    pub cost: f64,
    pub gross_profit: f64,
    pub gross_margin_pct: f64,
}

pub struct ReportService;

impl ReportService {
    /// Daily sales summary
    pub fn daily_sales(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<SalesReportRow>> {
        let mut stmt = conn.prepare(
            "SELECT DATE(created_at) AS day,
                    COALESCE(SUM(total_amount), 0),
                    COUNT(*),
                    COALESCE(SUM(tax_amount), 0),
                    COALESCE(SUM(discount_amount), 0),
                    COALESCE(SUM(total_amount) - SUM(tax_amount), 0)
             FROM transactions
             WHERE status = 'completed'
               AND DATE(created_at) BETWEEN ?1 AND ?2
             GROUP BY day
             ORDER BY day",
        )?;
        let rows = stmt.query_map(params![from, to], |r| {
            Ok(SalesReportRow {
                date:           r.get(0)?,
                total_sales:    r.get(1)?,
                invoice_count:  r.get(2)?,
                total_tax:      r.get(3)?,
                total_discount: r.get(4)?,
                net_sales:      r.get(5)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// Top N products by revenue
    pub fn top_products(conn: &Connection, from: &str, to: &str, limit: i64) -> AppResult<Vec<TopProduct>> {
        let mut stmt = conn.prepare(
            "SELECT ti.product_id, ti.product_name,
                    SUM(ti.quantity)        AS total_qty,
                    SUM(ti.line_total)      AS total_revenue,
                    SUM(ti.tax_amount)      AS total_tax,
                    SUM(ti.discount_amount) AS total_discount
             FROM transaction_items ti
             JOIN transactions t ON ti.transaction_id = t.id
             WHERE t.status = 'completed'
               AND DATE(t.created_at) BETWEEN ?1 AND ?2
             GROUP BY ti.product_id, ti.product_name
             ORDER BY total_revenue DESC
             LIMIT ?3",
        )?;
        let rows = stmt.query_map(params![from, to, limit], |r| {
            Ok(TopProduct {
                product_id:     r.get(0)?,
                product_name:   r.get(1)?,
                total_qty:      r.get(2)?,
                total_revenue:  r.get(3)?,
                total_tax:      r.get(4)?,
                total_discount: r.get(5)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// GST breakup report
    pub fn gst_summary(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<GstSummaryRow>> {
        let mut stmt = conn.prepare(
            "SELECT ti.gst_rate,
                    SUM(ti.line_subtotal) AS taxable_amount,
                    SUM(ti.tax_amount)    AS tax_amount
             FROM transaction_items ti
             JOIN transactions t ON ti.transaction_id = t.id
             WHERE t.status = 'completed'
               AND DATE(t.created_at) BETWEEN ?1 AND ?2
             GROUP BY ti.gst_rate
             ORDER BY ti.gst_rate",
        )?;
        let rows = stmt.query_map(params![from, to], |r| {
            Ok(GstSummaryRow {
                gst_rate:      r.get(0)?,
                taxable_amount: r.get(1)?,
                tax_amount:    r.get(2)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// Gross profit report
    pub fn profit_report(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<ProfitRow>> {
        let mut stmt = conn.prepare(
            "SELECT DATE(t.created_at) AS day,
                    SUM(ti.line_total)              AS revenue,
                    SUM(ti.cost_price * ti.quantity) AS cost
             FROM transaction_items ti
             JOIN transactions t ON ti.transaction_id = t.id
             WHERE t.status = 'completed'
               AND DATE(t.created_at) BETWEEN ?1 AND ?2
             GROUP BY day
             ORDER BY day",
        )?;
        let rows = stmt.query_map(params![from, to], |r| {
            let revenue: f64 = r.get(1)?;
            let cost: f64    = r.get(2)?;
            let gross_profit = revenue - cost;
            let gross_margin_pct = if revenue > 0.0 {
                (gross_profit / revenue) * 100.0
            } else { 0.0 };
            Ok(ProfitRow {
                date: r.get(0)?,
                revenue,
                cost,
                gross_profit,
                gross_margin_pct,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// Category sales breakdown
    pub fn category_sales(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<CategorySalesRow>> {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(c.name, 'Uncategorized') AS category,
                    SUM(ti.quantity)   AS total_qty,
                    SUM(ti.line_total) AS total_revenue
             FROM transaction_items ti
             JOIN transactions t  ON ti.transaction_id = t.id
             LEFT JOIN products p ON ti.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE t.status = 'completed'
               AND DATE(t.created_at) BETWEEN ?1 AND ?2
             GROUP BY category
             ORDER BY total_revenue DESC",
        )?;
        let rows = stmt.query_map(params![from, to], |r| {
            Ok(CategorySalesRow {
                category_name: r.get(0)?,
                total_qty:     r.get(1)?,
                total_revenue: r.get(2)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }
}
