import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Search, ChevronLeft, ChevronRight,
  IndianRupee, User, CalendarDays, CreditCard,
  CheckCircle2, Clock, AlertTriangle, X, ChevronDown,
  Banknote, Smartphone, BookUser, RefreshCw, HandCoins,
} from "lucide-react";
import { getTransactions, getTransactionById, collectPayment } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";
import type { TransactionRow, Transaction } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAY_MODE_ICON: Record<string, React.ReactNode> = {
  cash:   <Banknote className="w-3 h-3" />,
  upi:    <Smartphone className="w-3 h-3" />,
  card:   <CreditCard className="w-3 h-3" />,
  credit: <BookUser className="w-3 h-3" />,
};

const PAY_MODE_COLOR: Record<string, string> = {
  cash:   "text-green-400 bg-green-500/10 border-green-500/20",
  upi:    "text-violet-400 bg-violet-500/10 border-violet-500/20",
  card:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  credit: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function StatusBadge({ row }: { row: TransactionRow }) {
  if (row.balance_due > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
        <Clock className="w-2.5 h-2.5" />
        Udhar ₹{row.balance_due.toFixed(0)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 border border-green-500/30 text-green-400">
      <CheckCircle2 className="w-2.5 h-2.5" />
      Paid
    </span>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function BillDetailDrawer({ txnId, onClose }: { txnId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [collectAmt, setCollectAmt] = useState("");
  const [collectMode, setCollectMode] = useState("cash");
  const [collectError, setCollectError] = useState("");

  const { data: txn, isLoading, refetch } = useQuery({
    queryKey: ["txn-detail", txnId],
    queryFn: () => getTransactionById(txnId),
  });

  const collectMutation = useMutation({
    mutationFn: ({ amount, mode }: { amount: number; mode: string }) =>
      collectPayment(txnId, amount, mode),
    onSuccess: () => {
      setCollectAmt("");
      setCollectError("");
      refetch();
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err: unknown) => {
      setCollectError(String(err));
    },
  });

  const handleCollect = () => {
    const amount = parseFloat(collectAmt);
    if (!amount || amount <= 0) {
      setCollectError("Please enter a valid amount.");
      return;
    }
    setCollectError("");
    collectMutation.mutate({ amount, mode: collectMode });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-[420px] bg-card border-l border-border flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground">
              {isLoading ? "Loading..." : txn?.invoice_number ?? "Bill Detail"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : txn ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Meta */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="text-foreground font-medium">{formatDate(txn.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="text-foreground font-medium">
                  {txn.customer_name ?? "Walk-in Customer"}
                </span>
              </div>
              {txn.balance_due > 0 && (
                <div className="flex justify-between">
                  <span className="text-amber-400 font-semibold">Outstanding (Udhar)</span>
                  <span className="text-amber-400 font-bold">{formatCurrency(txn.balance_due)}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Items ({txn.items.length})
              </h3>
              <div className="space-y-2">
                {txn.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.sale_price)} × {item.quantity} {item.unit}
                        {item.discount_amount > 0 && (
                          <span className="text-green-400 ml-1">(-₹{item.discount_amount.toFixed(0)})</span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary flex-shrink-0 ml-3">
                      {formatCurrency(item.line_total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-secondary/30 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(txn.subtotal)}</span>
              </div>
              {txn.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-400">Discount</span>
                  <span className="text-green-400">-{formatCurrency(txn.discount_amount)}</span>
                </div>
              )}
              {txn.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-amber-400">GST</span>
                  <span className="text-amber-400">{formatCurrency(txn.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-bold">
                <span>Total</span>
                <span className="text-primary text-base">{formatCurrency(txn.total_amount)}</span>
              </div>
              {txn.balance_due > 0 && (
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Outstanding (Udhar)</span>
                  <span>{formatCurrency(txn.balance_due)}</span>
                </div>
              )}
            </div>

            {/* Collect Payment */}
            {txn.balance_due > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HandCoins className="w-3.5 h-3.5" />
                  Collect Udhar Payment
                </h3>
                <p className="text-xs text-muted-foreground">
                  Outstanding: <span className="text-amber-400 font-bold">{formatCurrency(txn.balance_due)}</span>
                </p>
                {/* Mode selector */}
                <div className="flex gap-1">
                  {(["cash", "upi", "card"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setCollectMode(m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                        collectMode === m
                          ? "bg-primary text-white border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                {/* Amount input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={txn.balance_due}
                    placeholder={`Max ₹${txn.balance_due.toFixed(0)}`}
                    value={collectAmt}
                    onChange={(e) => setCollectAmt(e.target.value)}
                    className="flex-1 px-3 py-2 bg-secondary border border-border rounded-xl text-sm
                               focus:outline-none focus:border-primary/60 transition-colors"
                  />
                  <button
                    onClick={() => setCollectAmt(String(txn.balance_due.toFixed(2)))}
                    className="px-3 py-2 bg-secondary border border-border rounded-xl text-xs hover:bg-secondary/80 transition-colors whitespace-nowrap"
                  >
                    Full
                  </button>
                </div>
                {collectError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{collectError}
                  </p>
                )}
                <button
                  onClick={handleCollect}
                  disabled={collectMutation.isPending}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {collectMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <HandCoins className="w-3.5 h-3.5" />
                  )}
                  Mark Payment Received
                </button>
              </div>
            )}

            {/* Payments */}
            {txn.payments.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Payments
                </h3>
                <div className="space-y-1.5">
                  {txn.payments.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold ${PAY_MODE_COLOR[p.payment_mode] ?? "text-muted-foreground bg-secondary/30 border-border"}`}
                    >
                      <span className="flex items-center gap-1.5 capitalize">
                        {PAY_MODE_ICON[p.payment_mode]}
                        {p.payment_mode === "credit" ? "Udhar" : p.payment_mode.toUpperCase()}
                      </span>
                      <span>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-sm">Could not load bill</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
type FilterStatus = "all" | "paid" | "udhar";

export function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["transactions", page, PAGE_SIZE],
    queryFn: () => getTransactions(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  const rows: TransactionRow[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Client-side filter on the current page
  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.customer_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "paid" && r.balance_due === 0) ||
      (filterStatus === "udhar" && r.balance_due > 0);
    return matchSearch && matchStatus;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">All Bills</h1>
            <p className="text-xs text-muted-foreground">{total} total transactions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter pills */}
          {(["all", "paid", "udhar"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                filterStatus === f
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "udhar" ? "Udhar Only" : f === "paid" ? "Paid Only" : "All"}
            </button>
          ))}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-xl text-xs
                         focus:outline-none focus:border-primary/60 transition-colors w-52"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <button
            onClick={() => refetch()}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading transactions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Receipt className="w-12 h-12 opacity-20" />
            <p className="text-sm">No transactions found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Date & Time</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> Customer</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1 justify-end"><IndianRupee className="w-3 h-3" /> Amount</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className="hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-bold text-primary group-hover:underline">
                      {row.invoice_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground text-xs font-medium">
                      {row.customer_name ?? <span className="text-muted-foreground italic">Walk-in</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {/* We reconstruct payment modes from paid/balance amounts as a heuristic */}
                      {row.balance_due > 0 && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PAY_MODE_COLOR["credit"]}`}>
                          {PAY_MODE_ICON["credit"]} Udhar
                        </span>
                      )}
                      {row.paid_amount > 0 && row.balance_due === 0 && (
                        <span className="text-xs text-muted-foreground italic">Paid</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge row={row} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-foreground">{formatCurrency(row.total_amount)}</span>
                    {row.balance_due > 0 && (
                      <span className="block text-[10px] text-amber-400 font-semibold">
                        Due: {formatCurrency(row.balance_due)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="border-t border-border px-5 py-3 flex-shrink-0 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} bills
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = page <= 3 ? i + 1 : page - 2 + i;
            if (pg < 1 || pg > totalPages) return null;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                  pg === page ? "bg-primary text-white" : "hover:bg-secondary text-muted-foreground"
                }`}
              >
                {pg}
              </button>
            );
          })}
          {totalPages > 5 && (
            <span className="text-xs text-muted-foreground px-1"><ChevronDown className="w-3 h-3 rotate-[-90deg]" /></span>
          )}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedId != null && (
        <BillDetailDrawer txnId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
