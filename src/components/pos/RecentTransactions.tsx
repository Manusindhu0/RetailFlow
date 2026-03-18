import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { getTransactions } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";

export function RecentTransactions() {
  const [expanded, setExpanded] = useState(true);

  const { data } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: () => getTransactions(1, 6),
    refetchInterval: 15000,
  });

  const items = data?.items ?? [];

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Recent Bills</span>
          {items.length > 0 && (
            <span className="bg-primary/15 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
              {items.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> :
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/50">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No transactions today
            </div>
          ) : (
            <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
              {items.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">#{txn.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {txn.customer_name || "Walk-in"} · {new Date(txn.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-primary">{formatCurrency(txn.total_amount)}</p>
                    <span className={`text-[10px] ${
                      txn.status === "completed" ? "text-green-400" :
                      txn.status === "cancelled" ? "text-red-400" : "text-yellow-400"
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
