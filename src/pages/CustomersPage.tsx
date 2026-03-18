import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, TrendingUp, TrendingDown, MessageCircle } from "lucide-react";
import { getCustomers, createCustomer, updateCustomer, getCustomerLedger, addLedgerEntry } from "@/lib/tauri";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Customer } from "@/types";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", credit_limit: "" });
  const [paymentAmount, setPaymentAmount] = useState("");
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: getCustomers });
  const { data: ledger = [] } = useQuery({
    queryKey: ["ledger", selected?.id],
    queryFn: () => getCustomerLedger(selected!.id),
    enabled: !!selected,
  });

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); setShowForm(false); setForm({ name: "", phone: "", address: "", credit_limit: "" }); },
  });

  const paymentMut = useMutation({
    mutationFn: addLedgerEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); qc.invalidateQueries({ queryKey: ["ledger", selected?.id] }); setPaymentAmount(""); },
  });

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const handleWhatsApp = (customer: Customer) => {
    const msg = encodeURIComponent(`Hello ${customer.name}, your outstanding balance is ${formatCurrency(customer.balance)}. Please clear at your earliest convenience.`);
    const phone = customer.phone?.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="flex h-full">
      {/* Customer List */}
      <div className="flex-1 p-5 flex flex-col gap-4 min-w-0 border-r border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground">{customers.length} total</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No customers found</p>
            </div>
          ) : (
            filtered.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left
                  ${selected?.id === c.id ? "bg-primary/10 border-primary/30" : "bg-card border-border hover:border-primary/30"}`}>
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone || "No phone"}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${c.balance > 0 ? "text-red-400" : "text-green-400"}`}>
                    {c.balance > 0 ? `Due: ${formatCurrency(c.balance)}` : "Clear"}
                  </p>
                  {c.credit_limit > 0 && (
                    <p className="text-xs text-muted-foreground">Limit: {formatCurrency(c.credit_limit)}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ledger View */}
      <div className="w-80 flex flex-col bg-card">
        {selected ? (
          <>
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-foreground">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                </div>
                {selected.phone && (
                  <button onClick={() => handleWhatsApp(selected)}
                    className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-0.5">Outstanding Balance</p>
                <p className={`text-xl font-bold ${selected.balance > 0 ? "text-red-400" : "text-green-400"}`}>
                  {formatCurrency(Math.abs(selected.balance))}
                  <span className="text-xs ml-1">{selected.balance > 0 ? "due" : "advance"}</span>
                </p>
              </div>

              {/* Payment input */}
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Payment amount"
                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  onClick={() => {
                    if (!paymentAmount || !selected) return;
                    paymentMut.mutate({
                      customer_id: selected.id,
                      entry_type: "payment",
                      amount: parseFloat(paymentAmount),
                      note: "Manual payment",
                    });
                  }}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Pay
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">Transaction History</p>
              {ledger.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                ledger.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    {entry.entry_type === "credit" ? (
                      <TrendingUp className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize">{entry.entry_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.note || "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${entry.entry_type === "credit" ? "text-red-400" : "text-green-400"}`}>
                      {entry.entry_type === "payment" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a customer to view ledger
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-5">Add Customer</h2>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate({ name: form.name, phone: form.phone || undefined, address: form.address || undefined, credit_limit: parseFloat(form.credit_limit) || 0 }); }} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Credit Limit (₹)</label>
                <input type="number" min="0" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground text-sm hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" disabled={createMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
