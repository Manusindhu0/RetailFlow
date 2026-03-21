import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, BookOpen, Plus, ArrowDownCircle, ArrowUpCircle,
  IndianRupee, Loader2, Calendar
} from "lucide-react";
import { getCustomerLedger, addLedgerEntry, getTransactions } from "@/lib/tauri";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer } from "@/types";

interface Props {
  customer: Customer;
  onClose: () => void;
}

type EntryType = "credit" | "debit" | "payment";

export function CustomerLedgerModal({ customer, onClose }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"ledger" | "history">("ledger");
  const [showAdd, setShowAdd] = useState(false);
  const [entryType, setEntryType] = useState<EntryType>("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data: ledger = [] } = useQuery({
    queryKey: ["ledger", customer.id],
    queryFn: () => getCustomerLedger(customer.id, 50),
  });

  const { data: txns } = useQuery({
    queryKey: ["customer-txns", customer.id],
    queryFn: () => getTransactions(1, 50),
    enabled: tab === "history",
  });

  const customerTxns = txns?.items.filter(t => t.customer_id === customer.id) ?? [];

  const addEntry = useMutation({
    mutationFn: () => addLedgerEntry({
      customer_id: customer.id,
      entry_type: entryType,
      amount: parseFloat(amount),
      note: note || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", customer.id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setAmount(""); setNote(""); setShowAdd(false);
    },
  });

  const balance = customer.credit_balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-foreground">{customer.name}</h2>
              <p className="text-xs text-muted-foreground">{customer.phone ?? "No phone"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Balance bar */}
        <div className={`flex items-center justify-between px-6 py-3 flex-shrink-0 ${
          balance > 0 ? "bg-red-500/10 border-b border-red-500/20" : "bg-green-500/10 border-b border-green-500/20"
        }`}>
          <div className="flex items-center gap-2">
            <IndianRupee className={`w-4 h-4 ${balance > 0 ? "text-red-400" : "text-green-400"}`} />
            <span className="text-sm font-semibold">
              {balance > 0 ? "Outstanding Balance (Baki)" : "No Outstanding Dues"}
            </span>
          </div>
          <span className={`text-xl font-black ${balance > 0 ? "text-red-400" : "text-green-400"}`}>
            {formatCurrency(Math.abs(balance))}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(["ledger", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "ledger" ? "📒 Khata / Ledger" : "🧾 Purchase History"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "ledger" && (
            <div>
              {/* Add Entry form */}
              {showAdd ? (
                <div className="p-5 border-b border-border bg-secondary/20 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { type: "credit",  label: "Give Credit",    color: "border-red-500    bg-red-500/10    text-red-400"    },
                      { type: "payment", label: "Receive Payment", color: "border-green-500  bg-green-500/10  text-green-400"  },
                      { type: "debit",   label: "Debit Entry",     color: "border-blue-500   bg-blue-500/10   text-blue-400"   },
                    ] as { type: EntryType; label: string; color: string }[]).map(e => (
                      <button
                        key={e.type}
                        onClick={() => setEntryType(e.type)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          entryType === e.type ? e.color : "border-border bg-secondary/40 text-muted-foreground"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number" min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-3 bg-secondary border border-border rounded-xl text-xl font-bold text-center focus:outline-none focus:border-primary/60 transition-colors"
                    placeholder="Amount ₹"
                  />
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors"
                    placeholder="Note (optional)"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl border border-border bg-secondary text-sm font-medium">Cancel</button>
                    <button
                      disabled={!amount || parseFloat(amount) <= 0 || addEntry.isPending}
                      onClick={() => addEntry.mutate()}
                      className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2"
                    >
                      {addEntry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Save Entry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-b border-border/50">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-sm font-medium text-muted-foreground hover:text-primary transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Entry
                  </button>
                </div>
              )}

              {/* Ledger entries */}
              <div className="divide-y divide-border/50">
                {ledger.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <BookOpen className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No ledger entries yet</p>
                  </div>
                ) : ledger.map(entry => (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.entry_type === "credit"  ? "bg-red-500/10"   :
                      entry.entry_type === "payment" ? "bg-green-500/10" : "bg-blue-500/10"
                    }`}>
                      {entry.entry_type === "credit"
                        ? <ArrowUpCircle   className="w-4 h-4 text-red-400"   />
                        : entry.entry_type === "payment"
                        ? <ArrowDownCircle className="w-4 h-4 text-green-400" />
                        : <IndianRupee    className="w-4 h-4 text-blue-400"   />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground capitalize">{entry.entry_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.note ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${
                        entry.entry_type === "credit" ? "text-red-400" :
                        entry.entry_type === "payment" ? "text-green-400" : "text-blue-400"
                      }`}>
                        {entry.entry_type === "payment" ? "-" : "+"}{formatCurrency(entry.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {entry.created_at ? formatDate(entry.created_at) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="divide-y divide-border/50">
              {customerTxns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <p className="text-sm">No purchase history found</p>
                </div>
              ) : customerTxns.map(txn => (
                <div key={txn.id} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">#{txn.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{txn.created_at ? formatDate(txn.created_at) : "—"} · {txn.status}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-bold text-primary">{formatCurrency(txn.total_amount)}</p>
                     <p className="text-xs text-muted-foreground">Bill #{txn.invoice_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
