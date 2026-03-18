use rusqlite::{Connection, params};
use crate::error::AppResult;
use crate::models::payment::{Payment, PaymentSummary, DailyPaymentBreakdown};

pub struct PaymentService;

impl PaymentService {
    pub fn get_by_transaction(conn: &Connection, transaction_id: i64) -> AppResult<Vec<Payment>> {
        let mut stmt = conn.prepare(
            "SELECT p.id, p.transaction_id, t.invoice_number,
                    p.payment_mode, p.amount, p.reference_no, p.bank_name,
                    p.status, p.paid_at
             FROM payments p
             JOIN transactions t ON p.transaction_id = t.id
             WHERE p.transaction_id = ?1
             ORDER BY p.paid_at",
        )?;
        let rows = stmt.query_map([transaction_id], |r| {
            Ok(Payment {
                id:             r.get(0)?,
                transaction_id: r.get(1)?,
                invoice_number: r.get(2)?,
                payment_mode:   r.get(3)?,
                amount:         r.get(4)?,
                reference_no:   r.get(5)?,
                bank_name:      r.get(6)?,
                status:         r.get(7)?,
                paid_at:        r.get(8)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// Payment mode breakdown for a date range
    pub fn mode_summary(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<PaymentSummary>> {
        let mut stmt = conn.prepare(
            "SELECT p.payment_mode, SUM(p.amount) AS total, COUNT(*) AS cnt
             FROM payments p
             JOIN transactions t ON p.transaction_id = t.id
             WHERE p.status = 'success' AND t.status = 'completed'
               AND DATE(t.created_at) BETWEEN ?1 AND ?2
             GROUP BY p.payment_mode
             ORDER BY total DESC",
        )?;
        let rows = stmt.query_map(params![from, to], |r| {
            Ok(PaymentSummary {
                payment_mode: r.get(0)?,
                total_amount: r.get(1)?,
                count:        r.get(2)?,
            })
        })?.filter_map(|r| r.ok()).collect();
        Ok(rows)
    }

    /// Daily payment breakdown for charting
    pub fn daily_breakdown(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<DailyPaymentBreakdown>> {
        let mode_col = |mode: &str| -> f64 {
            conn.query_row(
                &format!(
                    "SELECT COALESCE(SUM(p.amount),0) FROM payments p
                     JOIN transactions t ON p.transaction_id = t.id
                     WHERE p.payment_mode = '{}' AND p.status = 'success'
                       AND t.status = 'completed'
                       AND DATE(t.created_at) = ?1",
                    mode
                ),
                [from],
                |r| r.get(0),
            ).unwrap_or(0.0)
        };

        // Build one row per day
        let mut stmt = conn.prepare(
            "SELECT DISTINCT DATE(t.created_at) AS day
             FROM transactions t
             WHERE DATE(t.created_at) BETWEEN ?1 AND ?2 AND t.status = 'completed'
             ORDER BY day",
        )?;
        let days: Vec<String> = stmt
            .query_map(params![from, to], |r| r.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        let mut breakdown = Vec::new();
        for day in days {
            let cash   = mode_col("cash");
            let upi    = mode_col("upi");
            let card   = mode_col("card");
            let credit = mode_col("credit");
            let cheque = mode_col("cheque");
            let other  = mode_col("other");
            breakdown.push(DailyPaymentBreakdown {
                date: day,
                cash,
                upi,
                card,
                credit,
                cheque,
                other,
                total: cash + upi + card + credit + cheque + other,
            });
        }
        Ok(breakdown)
    }
}
