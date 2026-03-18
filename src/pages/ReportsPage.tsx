import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Package, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getDailySales, getTopProducts, getSalesReport } from "@/lib/tauri";
import { formatCurrency, today, daysAgo } from "@/lib/utils";

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(today());

  const { data: dailySales = [] } = useQuery({
    queryKey: ["daily-sales"],
    queryFn: () => getDailySales(30),
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ["top-products", fromDate, toDate],
    queryFn: () => getTopProducts(fromDate, toDate, 10),
  });

  const { data: salesReport = [] } = useQuery({
    queryKey: ["sales-report", fromDate, toDate],
    queryFn: () => getSalesReport(fromDate, toDate),
  });

  const totalRevenue = salesReport.reduce((a, r) => a + r.total_sales, 0);
  const totalInvoices = salesReport.reduce((a, r) => a + r.invoice_count, 0);

  const chartData = dailySales.map((r) => ({
    date: r.date.slice(5),
    sales: r.total_sales,
    invoices: r.invoice_count,
  }));

  return (
    <div className="p-5 h-full overflow-y-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Sales performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none" />
            <span className="text-muted-foreground text-xs">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-4 h-4" /> Total Revenue
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">Selected period</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <BarChart3 className="w-4 h-4" /> Total Invoices
          </div>
          <p className="text-2xl font-bold text-foreground">{totalInvoices}</p>
          <p className="text-xs text-muted-foreground">Bills generated</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-4 h-4" /> Average Bill
          </div>
          <p className="text-2xl font-bold text-foreground">
            {totalInvoices > 0 ? formatCurrency(totalRevenue / totalInvoices) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Per invoice</p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Daily Sales (Last 30 Days)</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,47%,22%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215,20%,55%)" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(222,47%,15%)", border: "1px solid hsl(222,47%,22%)", borderRadius: "8px", fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), "Sales"]}
              />
              <Bar dataKey="sales" fill="hsl(220,75%,58%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Top Selling Products</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No sales data for this period</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.product_name} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.product_name}</p>
                  <p className="text-xs text-muted-foreground">{p.total_qty} units sold</p>
                </div>
                <span className="text-sm font-semibold text-primary">{formatCurrency(p.total_revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sales Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold">Daily Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Invoices</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {salesReport.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground text-sm">No data</td></tr>
            ) : (
              salesReport.map((r) => (
                <tr key={r.date} className="table-row">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.invoice_count}</td>
                  <td className="px-4 py-3 text-right font-medium text-primary">{formatCurrency(r.total_sales)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
