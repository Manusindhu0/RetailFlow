// TypeScript types matching Rust models for RetailFlow POS

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Product ───────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  barcode?: string;
  name: string;
  category_id?: number;
  category_name?: string;
  description?: string;
  // Pricing
  sale_price: number;
  cost_price: number;
  mrp: number;
  // Tax
  gst_rate: 0 | 5 | 12 | 18 | 28;
  // Stock
  stock_quantity: number;
  low_stock_alert: number;
  unit: string;
  // Batch / Expiry
  batch_number?: string;
  expiry_date?: string;
  // Flags
  is_active: boolean;
  track_inventory: boolean;
  allow_negative: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: number;
  barcode?: string;
  name: string;
  category_name?: string;
  sale_price: number;
  cost_price: number;
  gst_rate: number;
  stock_quantity: number;
  low_stock_alert: number;
  unit: string;
  expiry_date?: string;
  is_active: boolean;
}

export type ProductListResponse = PaginatedResponse<ProductRow>;

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateProductInput {
  name: string;
  barcode?: string;
  category_id?: number;
  description?: string;
  sale_price: number;
  cost_price?: number;
  mrp?: number;
  gst_rate?: 0 | 5 | 12 | 18 | 28;
  stock_quantity?: number;
  low_stock_alert?: number;
  unit?: string;
  batch_number?: string;
  expiry_date?: string;
  track_inventory?: boolean;
  allow_negative?: boolean;
}

export interface UpdateProductInput extends Partial<Omit<CreateProductInput, 'name'>> {
  id: number;
  name?: string;
  is_active?: boolean;
}

// ─── Customer ──────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  credit_limit: number;
  credit_balance: number;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CustomerListResponse = PaginatedResponse<Customer>;

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  credit_limit?: number;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: number;
  is_active?: boolean;
}

// ─── Ledger ────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: number;
  customer_id: number;
  invoice_id?: number;
  entry_type: 'credit' | 'payment' | 'adjustment';
  amount: number;
  note?: string;
  created_at: string;
}

// ─── Transaction ───────────────────────────────────────────────────────────

export interface TransactionItem {
  id?: number;
  transaction_id?: number;
  product_id?: number;
  product_name: string;
  barcode?: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  sale_price: number;
  cost_price: number;
  mrp: number;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  discount_amount: number;
  gst_rate: number;
  tax_amount: number;
  line_subtotal: number;
  line_total: number;
  returned_qty: number;
}

export type PaymentMode = 'cash' | 'upi' | 'card' | 'credit' | 'cheque' | 'other';

export interface PaymentRecord {
  id?: number;
  transaction_id?: number;
  payment_mode: PaymentMode;
  amount: number;
  reference_no?: string;
  bank_name?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paid_at: string;
}

export interface Transaction {
  id: number;
  invoice_number: string;
  transaction_type: 'sale' | 'return' | 'quote';
  customer_id: number;
  customer_name?: string;
  user_id?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  round_off: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  balance_due: number;
  status: 'draft' | 'completed' | 'cancelled' | 'returned';
  notes?: string;
  ref_transaction_id?: number;
  items: TransactionItem[];
  payments: PaymentRecord[];
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: number;
  invoice_number: string;
  transaction_type: string;
  customer_id: number;
  customer_name?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  created_at: string;
}

export type TransactionListResponse = PaginatedResponse<TransactionRow>;

export interface CreateTransactionItemInput {
  product_id?: number;
  product_name: string;
  barcode?: string;
  hsn_code?: string;
  quantity: number;
  unit?: string;
  sale_price: number;
  cost_price?: number;
  mrp?: number;
  discount_type?: 'flat' | 'percent';
  discount_value?: number;
  gst_rate?: number;
}

export interface CreatePaymentInput {
  payment_mode: PaymentMode;
  amount: number;
  reference_no?: string;
  bank_name?: string;
}

export interface CreateTransactionInput {
  transaction_type?: 'sale' | 'return' | 'quote';
  customer_id?: number;
  items: CreateTransactionItemInput[];
  discount_amount?: number;
  round_off?: number;
  payments: CreatePaymentInput[];
  notes?: string;
  ref_transaction_id?: number;
}

// ─── Summary ───────────────────────────────────────────────────────────────

export interface TodaySummary {
  total_sales: number;
  invoice_count: number;
  items_sold: number;
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  credit_sales: number;
  total_tax: number;
  total_discount: number;
}

// ─── Reports ───────────────────────────────────────────────────────────────

export interface SalesReportRow {
  date: string;
  total_sales: number;
  invoice_count: number;
  total_tax: number;
  total_discount: number;
  net_sales: number;
}

export interface TopProduct {
  product_id?: number;
  product_name: string;
  total_qty: number;
  total_revenue: number;
  total_tax: number;
  total_discount: number;
}

export interface GstSummaryRow {
  gst_rate: number;
  taxable_amount: number;
  tax_amount: number;
}

export interface ProfitRow {
  date: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  gross_margin_pct: number;
}

export interface CategorySalesRow {
  category_name: string;
  total_qty: number;
  total_revenue: number;
}

export interface PaymentSummary {
  payment_mode: PaymentMode;
  total_amount: number;
  count: number;
}

export interface DailyPaymentBreakdown {
  date: string;
  cash: number;
  upi: number;
  card: number;
  credit: number;
  cheque: number;
  other: number;
  total: number;
}

// ─── Inventory ─────────────────────────────────────────────────────────────

export type InventoryAdjustmentType =
  | 'purchase' | 'sale' | 'return_in' | 'return_out'
  | 'damage' | 'theft' | 'expiry' | 'count'
  | 'transfer_in' | 'transfer_out';

export interface InventoryAdjustment {
  id: number;
  product_id: number;
  product_name: string;
  user_id?: number;
  adjustment_type: InventoryAdjustmentType;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  unit_cost: number;
  reference_id?: number;
  reference_type?: string;
  notes?: string;
  created_at: string;
}

export interface CreateAdjustmentInput {
  product_id: number;
  user_id?: number;
  adjustment_type: InventoryAdjustmentType;
  quantity_change: number;
  unit_cost?: number;
  reference_id?: number;
  reference_type?: string;
  notes?: string;
}

// ─── Cart (UI only) ────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  /** Per-unit flat discount */
  discount_type: 'flat' | 'percent';
  discount_value: number;
  /** discount_value × quantity */
  discount_amount: number;
  /** GST amount for this line */
  tax_amount: number;
  /** (sale_price - discount_value) × quantity — excludes tax */
  line_total: number;
}
