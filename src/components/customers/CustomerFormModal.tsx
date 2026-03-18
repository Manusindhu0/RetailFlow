import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, User, Save, Loader2 } from "lucide-react";
import { createCustomer, updateCustomer } from "@/lib/tauri";
import type { Customer } from "@/types";

interface Props {
  customer?: Customer | null;
  onClose: () => void;
}

const EMPTY = {
  name: "", phone: "", email: "", address: "",
  gstin: "", credit_limit: "",
};

const cls = "w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors";

export function CustomerFormModal({ customer, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!customer;
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    if (customer) {
      setForm({
        name:         customer.name ?? "",
        phone:        customer.phone ?? "",
        email:        customer.email ?? "",
        address:      customer.address ?? "",
        gstin:        customer.gstin ?? "",
        credit_limit: String(customer.credit_limit ?? ""),
      });
    }
  }, [customer]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isEdit ? { id: customer!.id } : {}),
        name:        form.name,
        phone:       form.phone   || null,
        email:       form.email   || null,
        address:     form.address || null,
        gstin:       form.gstin   || null,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : 0,
      };
      return isEdit ? updateCustomer(payload) : createCustomer(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">{isEdit ? "Edit Customer" : "Add Customer"}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Full Name *</label>
            <input className={cls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Ramesh Kumar" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Mobile Number</label>
              <input className={cls} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Credit Limit ₹</label>
              <input className={cls} type="number" min="0" value={form.credit_limit} onChange={e => set("credit_limit", e.target.value)} placeholder="0 = no limit" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Address</label>
            <textarea className={cls + " resize-none h-20"} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Shop / house address..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
              <input className={cls} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">GSTIN (Optional)</label>
              <input className={cls} value={form.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>

          {mutation.isError && <p className="text-xs text-red-400">{String(mutation.error)}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors">
              Cancel
            </button>
            <button
              disabled={!form.name || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
