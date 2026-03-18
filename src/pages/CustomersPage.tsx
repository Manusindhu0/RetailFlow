import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Users, Edit2, Trash2, BookOpen,
  RefreshCw, Phone, IndianRupee, TrendingUp
} from "lucide-react";
import { getCustomers, deleteCustomer } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { CustomerLedgerModal } from "@/components/customers/CustomerLedgerModal";
import type { Customer } from "@/types";

export function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState<Customer | null | undefined>(undefined);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomers(1, 200),
  });

  const del = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });

  const customers = (data?.items ?? []).filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  const totalOutstanding = customers.reduce((s, c) => s + (c.credit_balance ?? 0), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">Customers</h1>
            <p className="text-xs text-muted-foreground">
              {data?.total ?? 0} customers · Baki: {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditCustomer(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all active:scale-95 glow-primary"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Stats strip */}
      {data && data.total > 0 && (
        <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-border/50 flex-shrink-0">
          <div className="bg-card border border-border/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="font-bold text-foreground">{data.total}</p>
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <IndianRupee className="w-4 h-4 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Total Outstanding</p>
              <p className="font-bold text-red-400">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">With Dues</p>
              <p className="font-bold text-foreground">{customers.filter(c => (c.credit_balance ?? 0) > 0).length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["customers"] })}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary border border-border/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No customers found</p>
            {!search && <button onClick={() => setEditCustomer(null)} className="text-xs text-primary hover:underline">+ Add your first customer</button>}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loyalty Pts</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outstanding (Baki)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const balance = c.credit_balance ?? 0;
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-border/50 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/5"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{c.name}</p>
                            {c.gstin && <p className="text-xs text-muted-foreground font-mono">{c.gstin}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-amber-400 font-medium">{c.loyalty_points ?? 0} pts</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {balance > 0 ? (
                          <span className="text-sm font-bold text-red-400">{formatCurrency(balance)}</span>
                        ) : (
                          <span className="text-xs text-green-400">✓ Clear</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setLedgerCustomer(c)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                            title="Open Khata"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Khata
                          </button>
                          <button
                            onClick={() => setEditCustomer(c)}
                            className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${c.name}"? This cannot be undone.`))
                                del.mutate(c.id);
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {editCustomer !== undefined && (
        <CustomerFormModal
          customer={editCustomer}
          onClose={() => setEditCustomer(undefined)}
        />
      )}
      {ledgerCustomer && (
        <CustomerLedgerModal
          customer={ledgerCustomer}
          onClose={() => setLedgerCustomer(null)}
        />
      )}
    </div>
  );
}
