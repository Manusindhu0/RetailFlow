import { Outlet, NavLink } from "react-router-dom";
import {
  ShoppingCart, Package, Users, BarChart3,
  Settings, Zap, Bell, Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/pos",          icon: ShoppingCart, label: "POS Billing" },
  { to: "/inventory",    icon: Package,      label: "Inventory" },
  { to: "/customers",    icon: Users,        label: "Customers" },
  { to: "/transactions", icon: Receipt,      label: "All Bills" },
  { to: "/reports",      icon: BarChart3,    label: "Reports" },
  { to: "/settings",     icon: Settings,     label: "Settings" },
];

export function Layout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">RetailFlow</h1>
              <p className="text-[10px] text-muted-foreground">POS System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn("sidebar-link", isActive && "active")
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground">RetailFlow v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric"
            })}
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
