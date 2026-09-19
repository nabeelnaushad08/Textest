import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, ShoppingCart, FileText, TrendingUp, Users, AlertTriangle, 
  Search, DollarSign, Clock, CheckCircle, XCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EnhancedDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalOrders: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [products, orders, invoices, customersData, suppliersData, purchases] = await Promise.all([
        supabase.from("products").select("id, name, sku, current_stock, reorder_level, category").order("name"),
        supabase.from("orders").select("*, customers(name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("invoices").select("*, customers(name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("customers").select("*").order("name"),
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("supplier_purchases").select("*, suppliers(name)").order("created_at", { ascending: false }),
      ]);

      const lowStockItems = products.data?.filter(p => (p.current_stock || 0) <= (p.reorder_level || 0)) || [];
      const pendingInvs = invoices.data?.filter(i => i.payment_status === "pending") || [];

      setStats({
        totalProducts: products.data?.length || 0,
        lowStock: lowStockItems.length,
        totalOrders: orders.data?.length || 0,
        pendingInvoices: pendingInvs.length,
        totalCustomers: customersData.data?.length || 0,
        totalSuppliers: suppliersData.data?.length || 0,
      });

      setLowStockProducts(lowStockItems);
      setRecentOrders(orders.data || []);
      setRecentInvoices(invoices.data || []);
      
      // Enrich customers with their data
      const enrichedCustomers = await Promise.all(
        (customersData.data || []).map(async (customer) => {
          const [custOrders, custInvoices, payments] = await Promise.all([
            supabase.from("orders").select("*").eq("customer_id", customer.id),
            supabase.from("invoices").select("*").eq("customer_id", customer.id),
            supabase.from("payments").select("*").eq("customer_id", customer.id),
          ]);

          const totalDue = (custInvoices.data || []).reduce(
            (sum, inv) => sum + (inv.grand_total - (inv.paid_amount || 0)), 0
          );
          const totalPaid = (payments.data || []).reduce((sum, p) => sum + p.amount, 0);
          const lastOrder = custOrders.data?.[0];
          const pendingOrders = (custOrders.data || []).filter(o => o.status !== "delivered" && o.status !== "cancelled");

          return {
            ...customer,
            totalOrders: custOrders.data?.length || 0,
            totalDue,
            totalPaid,
            lastOrder: lastOrder?.order_date,
            pendingOrders: pendingOrders.length,
          };
        })
      );

      // Enrich suppliers with their data
      const enrichedSuppliers = await Promise.all(
        (suppliersData.data || []).map(async (supplier) => {
          const [supplierPurchases, supplierPayments] = await Promise.all([
            supabase.from("supplier_purchases").select("*").eq("supplier_id", supplier.id),
            supabase.from("supplier_payments").select("*").eq("supplier_id", supplier.id),
          ]);

          const totalPurchases = (supplierPurchases.data || []).reduce((sum, p) => sum + p.total, 0);
          const totalPaid = (supplierPayments.data || []).reduce((sum, p) => sum + p.amount, 0);
          const totalDue = totalPurchases - totalPaid;
          const lastPurchase = supplierPurchases.data?.[0];
          const pendingPurchases = (supplierPurchases.data || []).filter(
            p => p.payment_status !== "paid"
          );

          return {
            ...supplier,
            totalPurchases,
            totalDue,
            totalPaid,
            lastPurchase: lastPurchase?.purchase_date,
            pendingPurchases: pendingPurchases.length,
          };
        })
      );

      setCustomers(enrichedCustomers);
      setSuppliers(enrichedSuppliers);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      draft: "secondary",
      confirmed: "default",
      delivered: "default",
      pending: "secondary",
      paid: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Complete business overview and metrics</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {lowStockProducts.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    All products are well stocked
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Reorder Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">
                            {product.current_stock}
                          </TableCell>
                          <TableCell className="text-right">{product.reorder_level}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Customer Details</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Total Orders</TableHead>
                      <TableHead className="text-right">Total Due</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead className="text-right">Pending Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{customer.phone || "-"}</div>
                            <div className="text-muted-foreground">{customer.email || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{customer.totalOrders}</TableCell>
                        <TableCell className="text-right">
                          <span className={customer.totalDue > 0 ? "text-destructive font-semibold" : ""}>
                            LKR {customer.totalDue.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-success">
                          LKR {customer.totalPaid.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {customer.lastOrder 
                            ? new Date(customer.lastOrder).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.pendingOrders > 0 ? (
                            <Badge variant="secondary">{customer.pendingOrders}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Supplier Details</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Total Purchases</TableHead>
                      <TableHead className="text-right">Total Due</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead>Last Purchase</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{supplier.phone || "-"}</div>
                            <div className="text-muted-foreground">{supplier.email || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          LKR {supplier.totalPurchases.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={supplier.totalDue > 0 ? "text-destructive font-semibold" : ""}>
                            LKR {supplier.totalDue.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-success">
                          LKR {supplier.totalPaid.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {supplier.lastPurchase 
                            ? new Date(supplier.lastPurchase).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {supplier.pendingPurchases > 0 ? (
                            <Badge variant="secondary">{supplier.pendingPurchases}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>{order.customers?.name || "-"}</TableCell>
                        <TableCell className="text-right">LKR {order.total.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>{invoice.customers?.name || "-"}</TableCell>
                        <TableCell className="text-right">LKR {invoice.grand_total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">LKR {(invoice.paid_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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