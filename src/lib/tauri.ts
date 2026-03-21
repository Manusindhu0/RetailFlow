import { invoke as _tauriInvoke } from "@tauri-apps/api/core";

// Safe wrapper — returns empty mock data when Tauri is not available (plain browser preview)
const MOCK: Record<string, unknown> = {
  get_products:          { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
  get_categories:        [],
  get_low_stock_products:[],
  get_customers:         { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
  get_customer_ledger:   [],
  get_transactions:      { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 },
  get_today_summary:     { total_sales: 0, invoice_count: 0, avg_order: 0 },
  get_daily_sales:       [],
  get_top_products:      [],
  get_payment_summary:   [],
  get_all_settings:      {},
  list_backups:          [],
};

function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof _tauriInvoke !== "function") {
    console.warn(`[Tauri mock] "${cmd}" — Tauri unavailable, returning mock data.`);
    return Promise.resolve((MOCK[cmd] ?? null) as T);
  }
  return _tauriInvoke<T>(cmd, args);
}
import type {
  Product, ProductRow, ProductListResponse, Category,
  Customer, CustomerListResponse, LedgerEntry,
  Transaction, TransactionRow, TransactionListResponse, CreateTransactionInput,
  TodaySummary, SalesReportRow, TopProduct, GstSummaryRow, ProfitRow,
  CategorySalesRow, PaymentSummary, DailyPaymentBreakdown,
  InventoryAdjustment, CreateAdjustmentInput,
} from "@/types";

// ─── Products ────────────────────────────────────────────────────────────────
export const getProducts = (page?: number, pageSize?: number) =>
  invoke<ProductListResponse>("get_products", { page, pageSize });
export const getProductById = (id: number) =>
  invoke<Product>("get_product_by_id", { id });
export const searchProducts = (query: string, limit?: number) =>
  invoke<Product[]>("search_products", { query, limit });
export const createProduct = (input: Record<string, unknown>) =>
  invoke<Product>("create_product", { input });
export const updateProduct = (input: Record<string, unknown>) =>
  invoke<Product>("update_product", { input });
export const deleteProduct = (id: number) =>
  invoke<void>("delete_product", { id });
export const getLowStockProducts = () =>
  invoke<ProductRow[]>("get_low_stock_products");
export const getCategories = () =>
  invoke<Category[]>("get_categories");
export const createCategory = (input: { name: string; description?: string }) =>
  invoke<Category>("create_category", { input });

// ─── Inventory ───────────────────────────────────────────────────────────────
export const adjustInventory = (input: CreateAdjustmentInput) =>
  invoke<InventoryAdjustment>("adjust_inventory", { input });
export const getInventoryHistory = (productId: number, limit?: number) =>
  invoke<InventoryAdjustment[]>("get_inventory_history", { productId, limit });
export const bulkInventoryCount = (adjustments: CreateAdjustmentInput[]) =>
  invoke<InventoryAdjustment[]>("bulk_inventory_count", { adjustments });

// ─── Transactions ─────────────────────────────────────────────────────────────
export const createTransaction = (input: CreateTransactionInput) =>
  invoke<Transaction>("create_transaction", { input });
export const getTransactionById = (id: number) =>
  invoke<Transaction>("get_transaction_by_id", { id });
export const getTransactions = (page?: number, pageSize?: number) =>
  invoke<TransactionListResponse>("get_transactions", { page, pageSize });
export const collectPayment = (transactionId: number, amount: number, paymentMode: string) =>
  invoke<Transaction>("collect_payment", { transactionId, amount, paymentMode });
export const getTodaySummary = () =>
  invoke<TodaySummary>("get_today_summary");

// ─── Customers ────────────────────────────────────────────────────────────────
export const getCustomers = (page?: number, pageSize?: number) =>
  invoke<CustomerListResponse>("get_customers", { page, pageSize });
export const searchCustomers = (query: string) =>
  invoke<Customer[]>("search_customers", { query });
export const getCustomerById = (id: number) =>
  invoke<Customer>("get_customer_by_id", { id });
export const createCustomer = (input: Record<string, unknown>) =>
  invoke<Customer>("create_customer", { input });
export const updateCustomer = (input: Record<string, unknown>) =>
  invoke<Customer>("update_customer", { input });
export const deleteCustomer = (id: number) =>
  invoke<void>("delete_customer", { id });
export const getCustomerLedger = (customerId: number, limit?: number) =>
  invoke<LedgerEntry[]>("get_customer_ledger", { customerId, limit });
export const addLedgerEntry = (input: Record<string, unknown>) =>
  invoke<LedgerEntry>("add_ledger_entry", { input });

// ─── Reports ─────────────────────────────────────────────────────────────────
export const getSalesReport = (from: string, to: string) =>
  invoke<SalesReportRow[]>("get_sales_report", { from, to });
export const getDailySales = (from: string, to: string) =>
  invoke<SalesReportRow[]>("get_daily_sales", { from, to });
export const getTopProducts = (from: string, to: string, limit?: number) =>
  invoke<TopProduct[]>("get_top_products", { from, to, limit });
export const getGstSummary = (from: string, to: string) =>
  invoke<GstSummaryRow[]>("get_gst_summary", { from, to });
export const getProfitReport = (from: string, to: string) =>
  invoke<ProfitRow[]>("get_profit_report", { from, to });
export const getCategorySales = (from: string, to: string) =>
  invoke<CategorySalesRow[]>("get_category_sales", { from, to });
export const getPaymentSummary = (from: string, to: string) =>
  invoke<PaymentSummary[]>("get_payment_summary", { from, to });
export const getDailyPaymentBreakdown = (from: string, to: string) =>
  invoke<DailyPaymentBreakdown[]>("get_daily_payment_breakdown", { from, to });

// ─── Settings ────────────────────────────────────────────────────────────────
export const getSetting = (key: string) =>
  invoke<string | null>("get_setting", { key });
export const setSetting = (key: string, value: string) =>
  invoke<void>("set_setting", { key, value });
export const getAllSettings = () =>
  invoke<Record<string, string>>("get_all_settings");

// ─── Backup ──────────────────────────────────────────────────────────────────
export const createBackup = (backupDir: string) =>
  invoke<string>("create_backup", { backupDir });
export const listBackups = (backupDir: string) =>
  invoke<Array<{ filename: string; size: number; created_at: string }>>("list_backups", { backupDir });
