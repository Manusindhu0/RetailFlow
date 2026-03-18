import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, TrendingUp, Package, IndianRupee,
  Users, ShoppingBag, RefreshCw, Calendar
} from "lucide-react";
import {
  getDailySales, getTopProducts, getPaymentSummary,
  getProducts, getCustomers, getTodaySummary
} from "@/lib/tauri";
import { formatCurrency, daysAgo, today } from "@/lib/utils";
import { SimpleBarChart } from "@/components/reports/SimpleBarChart";
import { SimplePieChart } from "@/components/reports/SimplePieChart";

type Range = "7d" | "30d" | "90d";

const RANGES: { label: string; value: Range; days: number }[] = [
  { label: "7 Days",  value: "7d",  days: 7  },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "90 Days", value: "90d", days: 90 },
];

const PAYMENT_COLORS: Record<string, string> = {
  cash:   "#22c55e",
  upi:    "#8b5cf6",
  card:   "#3b82f6",
  credit: "#f59e0b",
};

function KPICard({ icon, label, value, sub, color = "text-primary" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-xl font-black ${color} truncate`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const days  = RANGES.find(r => r.value === range)!.days;
  const from  = daysAgo(days);
  const to    = today();

  const { data: todaySummary } = useQuery({ queryKey: ["today-summary"],           queryFn: getTodaySummary });
  const { data: dailySales  } = useQuery({ queryKey: ["daily-sales",  from, to],   queryFn: () => getDailySales(from, to) });
  const { data: topProducts } = useQuery({ queryKey: ["top-products", from, to],   queryFn: () => getTopProducts(from, to, 8) });
  const { data: paymentData } = useQuery({ queryKey: ["payment-summary", from, to],queryFn: () => getPaymentSummary(from, to) });
  const { data: productsData} = useQuery({ queryKey: ["products"],                 queryFn: () => getProducts(1, 1) });
  const { data: customersData}= useQuery({ queryKey: ["customers"],                queryFn: () => getCustomers(1, 1) });

  // Bar chart data — last N days of sales
  const barData = (dailySales ?? []).map(row => ({
    label: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    value: row.total_sales,
  }));

  // Payment pie data
  const pieData = (paymentData ?? []).map(p => ({
    label: p.payment_mode.charAt(0).toUpperCase() + p.payment_mode.slice(1),
    value: p.total_amount,
    color: PAYMENT_COLORS[p.payment_mode] ?? "#6b7280",
  }));

  // Total revenue in range
  const totalRevenue = (dailySales ?? []).reduce((s, d) => s + d.total_sales, 0);
  const totalBills   = (dailySales ?? []).reduce((s, d) => s + d.invoice_count, 0);

  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-4 space-y-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg">Reports</h1>
              <p className="text-xs text-muted-foreground">Sales & business overview</p>
            </div>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border/50">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Today's Sales"
            value={formatCurrency(todaySummary?.total_sales ?? 0)}
            sub={`${todaySummary?.invoice_count ?? 0} bills today`}
            color="text-primary"
          />
          <KPICard
            icon={<ShoppingBag className="w-5 h-5" />}
            label={`Revenue (${RANGES.find(r=>r.value===range)?.label})`}
            value={formatCurrency(totalRevenue)}
            sub={`${totalBills} bills`}
            color="text-green-400"
          />
          <KPICard
            icon={<Package className="w-5 h-5" />}
            label="Total Products"
            value={String(productsData?.total ?? 0)}
            sub="In inventory"
            color="text-amber-400"
          />
          <KPICard
            icon={<Users className="w-5 h-5" />}
            label="Total Customers"
            value={String(customersData?.total ?? 0)}
            color="text-violet-400"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-5">
          {/* Daily Revenue Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-sm">Daily Revenue</h3>
              <span className="text-xs text-muted-foreground">{RANGES.find(r=>r.value===range)?.label}</span>
            </div>
            {barData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading...
              </div>
            ) : (
              <SimpleBarChart
                data={barData}
                formatValue={v => formatCurrency(v)}
                height={180}
              />
            )}
          </div>

          {/* Payment Method Pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground text-sm">Payment Breakdown</h3>
              <span className="text-xs text-muted-foreground">{RANGES.find(r=>r.value===range)?.label}</span>
            </div>
            {pieData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No payment data yet</div>
            ) : (
              <div className="flex items-center justify-center">
                <SimplePieChart
                  data={pieData}
                  formatValue={v => formatCurrency(v)}
                  size={130}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-5">
          {/* Top Selling Products */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Top Selling Products
            </h3>
            {!topProducts || topProducts.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No sales data yet</div>
            ) : (
              <div className="space-y-2.5">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0].total_quantity;
                  const pct = (p.total_quantity / maxQty) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 text-xs font-bold text-primary/70 flex-shrink-0 text-center">
                            #{i + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">{p.product_name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{formatCurrency(p.total_revenue)}</span>
                          <span className="text-xs text-muted-foreground ml-2">×{p.total_quantity}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Summary Table */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Daily Summary
            </h3>
            {!dailySales || dailySales.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No sales data yet</div>
            ) : (
              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left pb-2 text-xs text-muted-foreground font-semibold">Date</th>
                      <th className="text-right pb-2 text-xs text-muted-foreground font-semibold">Bills</th>
                      <th className="text-right pb-2 text-xs text-muted-foreground font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[...dailySales].reverse().slice(0, 14).map((row, i) => (
                      <tr key={i} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-2 text-muted-foreground text-xs">
                          {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                        <td className="py-2 text-right text-xs">{row.invoice_count}</td>
                        <td className="py-2 text-right font-semibold text-primary text-xs">{formatCurrency(row.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
