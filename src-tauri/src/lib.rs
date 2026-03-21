pub mod db;
pub mod commands;
pub mod models;
pub mod services;
pub mod pagination;
pub mod error;

use db::connection::DbState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir)
                .expect("Failed to create app data dir");

            let db_path = app_dir.join("retailflow.db");
            let db_state = DbState::new(&db_path)
                .expect("Failed to initialize database");

            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ── Products ─────────────────────────────────────────────────────
            commands::products::get_products,
            commands::products::get_product_by_id,
            commands::products::search_products,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::get_low_stock_products,
            commands::products::get_categories,
            commands::products::create_category,
            // ── Inventory ────────────────────────────────────────────────────
            commands::inventory::adjust_inventory,
            commands::inventory::get_inventory_history,
            commands::inventory::bulk_inventory_count,
            // ── Transactions ─────────────────────────────────────────────────
            commands::transactions::create_transaction,
            commands::transactions::get_transaction_by_id,
            commands::transactions::get_transactions,
            commands::transactions::get_today_summary,
            commands::transactions::collect_payment,
            // ── Customers ────────────────────────────────────────────────────
            commands::customers::get_customers,
            commands::customers::search_customers,
            commands::customers::get_customer_by_id,
            commands::customers::create_customer,
            commands::customers::update_customer,
            commands::customers::delete_customer,
            commands::customers::get_customer_ledger,
            commands::customers::add_ledger_entry,
            // ── Reports ──────────────────────────────────────────────────────
            commands::reports::get_sales_report,
            commands::reports::get_daily_sales,
            commands::reports::get_top_products,
            commands::reports::get_gst_summary,
            commands::reports::get_profit_report,
            commands::reports::get_category_sales,
            commands::reports::get_payment_summary,
            commands::reports::get_daily_payment_breakdown,
            // ── Settings ─────────────────────────────────────────────────────
            commands::settings::get_setting,
            commands::settings::set_setting,
            commands::settings::get_all_settings,
            // ── Backup ───────────────────────────────────────────────────────
            commands::backup::create_backup,
            commands::backup::list_backups,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RetailFlow");
}
