import { useState, useEffect } from "react";
import { Search, X, User, UserPlus, ChevronLeft, Phone, Mail, CheckCircle2 } from "lucide-react";
import { searchCustomers, createCustomer } from "@/lib/tauri";
import type { Customer } from "@/types";

interface CustomerSearchModalProps {
  onSelect: (customer: Customer | null) => void;
  onClose: () => void;
}

export function CustomerSearchModal({ onSelect, onClose }: CustomerSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick-add form state
  const [addMode, setAddMode] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchCustomers(query);
        setResults(data);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const newCustomer = await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      // Auto-select the newly created customer
      onSelect(newCustomer as Customer);
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  };

  /* ――― Quick-Add Form ――― */
  if (addMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAddMode(false); setSaveError(""); }}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Add New Customer
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Customer name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="Mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Email (optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-red-400 px-1">{saveError}</p>
            )}

            <button
              onClick={handleAdd}
              disabled={saving || !form.name.trim()}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50
                         text-white font-bold rounded-xl flex items-center justify-center gap-2
                         transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Saving..." : "Add & Select Customer"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ――― Search Mode ――― */
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Select Customer</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setAddMode(true); setForm({ name: query, phone: "", email: "" }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20
                         text-primary text-xs font-semibold border border-primary/20 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add New
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Search input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name, phone, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {/* Walk-in option */}
            <button
              onClick={() => onSelect(null)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Walk-in Customer</p>
                <p className="text-xs text-muted-foreground">Default selection</p>
              </div>
            </button>

            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-4">Searching...</p>
            ) : results.length > 0 ? (
              results.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onSelect(customer)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 border border-transparent hover:border-border transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{customer.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-foreground truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.phone || customer.email || "No contact info"}
                    </p>
                  </div>
                </button>
              ))
            ) : query.trim() ? (
              /* No results — quick-add prompt */
              <div className="text-center py-5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  No customer found for <span className="text-foreground font-medium">"{query}"</span>
                </p>
                <button
                  onClick={() => { setAddMode(true); setForm({ name: query, phone: "", email: "" }); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20
                             text-primary text-sm font-semibold border border-primary/20 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add "{query}" as new customer
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
