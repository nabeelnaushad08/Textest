import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, FileText, TrendingUp, Users, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalOrders: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [products, orders, invoices, customers, suppliers] = await Promise.all([
        supabase.from("products").select("id, current_stock, reorder_level", { count: "exact" }),
        supabase.from("orders").select("id", { count: "exact" }),
        supabase.from("invoices").select("id").eq("payment_status", "pending"),
        supabase.from("customers").select("id", { count: "exact" }),
        supabase.from("suppliers").select("id", { count: "exact" }),
      ]);

      const lowStockCount = products.data?.filter(
        (p) => p.current_stock <= p.reorder_level
      ).length || 0;

      setStats({
        totalProducts: products.count || 0,
        lowStock: lowStockCount,
        totalOrders: orders.count || 0,
        pendingInvoices: invoices.data?.length || 0,
        totalCustomers: customers.count || 0,
        totalSuppliers: suppliers.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const statCards = [
    { title: "Total Products", value: stats.totalProducts, icon: Package, color: "text-blue-600" },
    { title: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, color: "text-warning" },
    { title: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-primary" },
    { title: "Pending Invoices", value: stats.pendingInvoices, icon: FileText, color: "text-destructive" },
    { title: "Customers", value: stats.totalCustomers, icon: Users, color: "text-success" },
    { title: "Suppliers", value: stats.totalSuppliers, icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to TEXPRO Marketing Inventory System</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a href="/products" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent">
              <Package className="h-8 w-8 text-primary" />
              <span className="font-medium">Manage Products</span>
            </a>
            <a href="/orders" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <span className="font-medium">Create Order</span>
            </a>
            <a href="/invoices" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent">
              <FileText className="h-8 w-8 text-primary" />
              <span className="font-medium">Generate Invoice</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
