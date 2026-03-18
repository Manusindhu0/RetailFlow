use rusqlite::Connection;
use crate::error::AppResult;

pub fn run_migrations(conn: &Connection) -> AppResult<()> {
    // ─── Performance PRAGMAs ───────────────────────────────────────────────
    conn.execute_batch("
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 536870912;
        PRAGMA cache_size = -131072;
        PRAGMA page_size = 4096;
        PRAGMA auto_vacuum = INCREMENTAL;
    ")?;

    // ─── USERS ────────────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
            full_name   TEXT    NOT NULL,
            role        TEXT    NOT NULL DEFAULT 'cashier'
                                CHECK(role IN ('admin','manager','cashier')),
            pin_hash    TEXT,
            is_active   INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            last_login  TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','utc')),
            updated_at  TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

        INSERT OR IGNORE INTO users (username, full_name, role)
        VALUES ('admin', 'Administrator', 'admin');
    ")?;

    // ─── CATEGORIES ───────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS categories (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
            description TEXT,
            is_active   INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            created_at  TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

        INSERT OR IGNORE INTO categories (name) VALUES
            ('General'), ('Food & Beverages'), ('Medicines'),
            ('Electronics'), ('Clothing'), ('Personal Care');
    ")?;

    // ─── PRODUCTS ─────────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS products (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode           TEXT UNIQUE,
            name              TEXT    NOT NULL COLLATE NOCASE,
            category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            description       TEXT,
            -- Pricing
            sale_price        REAL    NOT NULL DEFAULT 0 CHECK(sale_price >= 0),
            cost_price        REAL    NOT NULL DEFAULT 0 CHECK(cost_price >= 0),
            mrp               REAL    DEFAULT 0 CHECK(mrp >= 0),
            -- Tax
            gst_rate          REAL    NOT NULL DEFAULT 0
                              CHECK(gst_rate IN (0, 5, 12, 18, 28)),
            -- Stock
            stock_quantity    INTEGER NOT NULL DEFAULT 0,
            low_stock_alert   INTEGER NOT NULL DEFAULT 5 CHECK(low_stock_alert >= 0),
            unit              TEXT    NOT NULL DEFAULT 'pcs',
            -- Batch / Expiry (pharma & FMCG support)
            batch_number      TEXT,
            expiry_date       TEXT,
            -- Flags
            is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            track_inventory   INTEGER NOT NULL DEFAULT 1 CHECK(track_inventory IN (0,1)),
            allow_negative    INTEGER NOT NULL DEFAULT 0 CHECK(allow_negative IN (0,1)),
            -- Timestamps
            created_at        TEXT    NOT NULL DEFAULT (datetime('now','utc')),
            updated_at        TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_products_barcode    ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_products_name       ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
        CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active);
        CREATE INDEX IF NOT EXISTS idx_products_low_stock  ON products(stock_quantity, low_stock_alert)
            WHERE is_active = 1;
        CREATE INDEX IF NOT EXISTS idx_products_expiry     ON products(expiry_date)
            WHERE expiry_date IS NOT NULL;
    ")?;

    // ─── CUSTOMERS ────────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS customers (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT    NOT NULL COLLATE NOCASE,
            phone           TEXT UNIQUE,
            email           TEXT UNIQUE COLLATE NOCASE,
            address         TEXT,
            gstin           TEXT,
            -- Credit
            credit_limit    REAL    NOT NULL DEFAULT 0 CHECK(credit_limit >= 0),
            credit_balance  REAL    NOT NULL DEFAULT 0,
            -- Loyalty
            loyalty_points  INTEGER NOT NULL DEFAULT 0 CHECK(loyalty_points >= 0),
            -- Flags
            is_active       INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
            -- Timestamps
            created_at      TEXT    NOT NULL DEFAULT (datetime('now','utc')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_customers_name   ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_customers_phone  ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_customers_email  ON customers(email);
        CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

        -- Walk-in customer (id = 1) always exists
        INSERT OR IGNORE INTO customers (id, name, phone)
        VALUES (1, 'Walk-in Customer', NULL);
    ")?;

    // ─── TRANSACTIONS ─────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS transactions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number  TEXT    NOT NULL UNIQUE,
            transaction_type TEXT   NOT NULL DEFAULT 'sale'
                            CHECK(transaction_type IN ('sale','return','quote')),
            -- Relations
            customer_id     INTEGER NOT NULL DEFAULT 1
                            REFERENCES customers(id) ON DELETE RESTRICT,
            user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
            -- Totals (denormalized for fast reporting)
            subtotal        REAL    NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
            discount_amount REAL    NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
            tax_amount      REAL    NOT NULL DEFAULT 0 CHECK(tax_amount >= 0),
            round_off       REAL    NOT NULL DEFAULT 0,
            total_amount    REAL    NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
            paid_amount     REAL    NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
            change_amount   REAL    NOT NULL DEFAULT 0,
            balance_due     REAL    NOT NULL DEFAULT 0,
            -- Status
            status          TEXT    NOT NULL DEFAULT 'completed'
                            CHECK(status IN ('draft','completed','cancelled','returned')),
            notes           TEXT,
            -- Reference for returns
            ref_transaction_id INTEGER REFERENCES transactions(id),
            -- Timestamps
            created_at      TEXT    NOT NULL DEFAULT (datetime('now','utc')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_txn_invoice      ON transactions(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_txn_customer     ON transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_txn_date         ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_txn_status       ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_txn_user         ON transactions(user_id);
        -- Composite for date-range reporting
        CREATE INDEX IF NOT EXISTS idx_txn_date_status  ON transactions(created_at, status);
    ")?;

    // ─── TRANSACTION ITEMS ────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS transaction_items (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id  INTEGER NOT NULL
                            REFERENCES transactions(id) ON DELETE CASCADE,
            product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
            -- Snapshot of product at time of sale (denormalized)
            product_name    TEXT    NOT NULL,
            barcode         TEXT,
            hsn_code        TEXT,
            -- Quantity & Pricing
            quantity        REAL    NOT NULL CHECK(quantity > 0),
            unit            TEXT    NOT NULL DEFAULT 'pcs',
            sale_price      REAL    NOT NULL CHECK(sale_price >= 0),
            cost_price      REAL    NOT NULL DEFAULT 0,
            mrp             REAL    NOT NULL DEFAULT 0,
            -- Discount
            discount_type   TEXT    NOT NULL DEFAULT 'flat'
                            CHECK(discount_type IN ('flat','percent')),
            discount_value  REAL    NOT NULL DEFAULT 0 CHECK(discount_value >= 0),
            discount_amount REAL    NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
            -- Tax
            gst_rate        REAL    NOT NULL DEFAULT 0,
            tax_amount      REAL    NOT NULL DEFAULT 0,
            -- Totals
            line_subtotal   REAL    NOT NULL DEFAULT 0,
            line_total      REAL    NOT NULL DEFAULT 0,
            -- Return tracking
            returned_qty    REAL    NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_txn_items_txn        ON transaction_items(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_txn_items_product    ON transaction_items(product_id);
        CREATE INDEX IF NOT EXISTS idx_txn_items_product_dt ON transaction_items(product_id, transaction_id);
    ")?;

    // ─── PAYMENTS ─────────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS payments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id  INTEGER NOT NULL
                            REFERENCES transactions(id) ON DELETE CASCADE,
            payment_mode    TEXT    NOT NULL
                            CHECK(payment_mode IN ('cash','upi','card','credit','cheque','other')),
            amount          REAL    NOT NULL CHECK(amount > 0),
            reference_no    TEXT,
            bank_name       TEXT,
            status          TEXT    NOT NULL DEFAULT 'success'
                            CHECK(status IN ('pending','success','failed','refunded')),
            paid_at         TEXT    NOT NULL DEFAULT (datetime('now','utc')),
            created_at      TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_payments_txn     ON payments(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_payments_mode    ON payments(payment_mode);
        CREATE INDEX IF NOT EXISTS idx_payments_date    ON payments(paid_at);
        CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
    ")?;

    // ─── INVENTORY ADJUSTMENTS ────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS inventory_adjustments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id      INTEGER NOT NULL
                            REFERENCES products(id) ON DELETE CASCADE,
            user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
            adjustment_type TEXT    NOT NULL
                            CHECK(adjustment_type IN (
                                'purchase','sale','return_in','return_out',
                                'damage','theft','expiry','count','transfer_in','transfer_out'
                            )),
            -- Signed quantity: positive = stock in, negative = stock out
            quantity_change INTEGER NOT NULL,
            stock_before    INTEGER NOT NULL,
            stock_after     INTEGER NOT NULL,
            unit_cost       REAL    DEFAULT 0,
            reference_id    INTEGER,
            reference_type  TEXT,
            notes           TEXT,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_inv_adj_product  ON inventory_adjustments(product_id);
        CREATE INDEX IF NOT EXISTS idx_inv_adj_type     ON inventory_adjustments(adjustment_type);
        CREATE INDEX IF NOT EXISTS idx_inv_adj_date     ON inventory_adjustments(created_at);
        CREATE INDEX IF NOT EXISTS idx_inv_adj_ref      ON inventory_adjustments(reference_id, reference_type);
    ")?;

    // ─── SETTINGS ─────────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS settings (
            key         TEXT PRIMARY KEY,
            value       TEXT,
            description TEXT,
            updated_at  TEXT NOT NULL DEFAULT (datetime('now','utc'))
        );

        INSERT OR IGNORE INTO settings (key, value, description) VALUES
            ('shop_name',              'My Shop',     'Store display name'),
            ('shop_phone',             '',            'Primary contact'),
            ('shop_address',           '',            'Store address'),
            ('shop_gstin',             '',            'GST registration number'),
            ('shop_email',             '',            'Store email'),
            ('shop_logo',              '',            'Logo file path'),
            ('currency_symbol',        '₹',           'Currency display symbol'),
            ('invoice_prefix',         'INV',         'Invoice number prefix'),
            ('invoice_counter',        '1',           'Next invoice number'),
            ('gst_enabled',            'true',        'Enable GST calculation'),
            ('thermal_print',          'false',       'Use 80mm thermal receipt'),
            ('low_stock_notifications','true',        'Alert on low stock'),
            ('backup_frequency',       'daily',       'Auto backup: daily/weekly/off'),
            ('backup_dir',             './backups',   'Backup destination folder'),
            ('loyalty_enabled',        'false',       'Enable loyalty points'),
            ('loyalty_rate',           '1',           'Points per ₹100 spent');
    ")?;

    // ─── BACKUPS ──────────────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS backups (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            filename        TEXT    NOT NULL UNIQUE,
            file_path       TEXT    NOT NULL,
            size_bytes      INTEGER DEFAULT 0,
            backup_type     TEXT    NOT NULL DEFAULT 'manual'
                            CHECK(backup_type IN ('manual','auto','pre_update')),
            status          TEXT    NOT NULL DEFAULT 'success'
                            CHECK(status IN ('success','failed','uploading')),
            checksum        TEXT,
            notes           TEXT,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_backups_date ON backups(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(backup_type);
    ")?;

    // ─── CUSTOMER LEDGER ──────────────────────────────────────────────────
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS customer_ledger (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id     INTEGER NOT NULL
                            REFERENCES customers(id) ON DELETE CASCADE,
            invoice_id      INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
            entry_type      TEXT    NOT NULL
                            CHECK(entry_type IN ('credit','payment','adjustment')),
            amount          REAL    NOT NULL,
            note            TEXT,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now','utc'))
        );

        CREATE INDEX IF NOT EXISTS idx_ledger_customer ON customer_ledger(customer_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_date     ON customer_ledger(created_at);
        CREATE INDEX IF NOT EXISTS idx_ledger_invoice  ON customer_ledger(invoice_id);
    ")?;

    // ─── TRIGGERS ─────────────────────────────────────────────────────────
    // Auto-update updated_at on write
    conn.execute_batch("
        CREATE TRIGGER IF NOT EXISTS trg_products_updated
        AFTER UPDATE ON products BEGIN
            UPDATE products SET updated_at = datetime('now','utc') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_customers_updated
        AFTER UPDATE ON customers BEGIN
            UPDATE customers SET updated_at = datetime('now','utc') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_transactions_updated
        AFTER UPDATE ON transactions BEGIN
            UPDATE transactions SET updated_at = datetime('now','utc') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_settings_updated
        AFTER UPDATE ON settings BEGIN
            UPDATE settings SET updated_at = datetime('now','utc') WHERE key = NEW.key;
        END;
    ")?;

    Ok(())
}
