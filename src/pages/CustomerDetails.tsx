import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, ShoppingCart, DollarSign, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CustomerDialog from "@/components/customers/CustomerDialog";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  credit_limit: number;
  opening_balance: number;
}

interface Order {
  id: string;
  order_number: string;
  order_date: string;
  total: number;
  status: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  grand_total: number;
  paid_amount: number;
  payment_status: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
}

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", id)
        .order("order_date", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error("Error fetching customer data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Customer deleted successfully" });
      navigate("/customers");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grand_total, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = totalInvoiced - totalPaid + (customer?.opening_balance || 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Customer not found</p>
        <Button onClick={() => navigate("/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{customer.name}</h1>
            <p className="text-sm text-muted-foreground">Customer Details & History</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              {orders.filter((o) => o.status === "delivered").length} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalInvoiced.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoice(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payment(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstandingBalance > 0 ? "text-destructive" : "text-green-600"}`}>
              LKR {outstandingBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingBalance > 0 ? "Amount due" : "Fully paid"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
              <p className="text-base">{customer.contact_person || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-base">{customer.phone || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-base">{customer.email || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Credit Limit</label>
              <p className="text-base">LKR {customer.credit_limit?.toFixed(2) || "0.00"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Opening Balance</label>
              <p className="text-base">LKR {customer.opening_balance?.toFixed(2) || "0.00"}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-base">{customer.address || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Orders, Invoices, and Payments */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No orders recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{format(new Date(order.order_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>LKR {order.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "delivered"
                                  ? "default"
                                  : order.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No invoices recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{format(new Date(invoice.invoice_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>LKR {invoice.grand_total.toFixed(2)}</TableCell>
                          <TableCell>LKR {invoice.paid_amount?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                invoice.payment_status === "paid"
                                  ? "default"
                                  : invoice.payment_status === "partially_paid"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {invoice.payment_status || "pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No payments recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="font-medium">LKR {payment.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method}</Badge>
                          </TableCell>
                          <TableCell>{payment.reference || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{payment.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={customer}
        onSuccess={() => {
          fetchCustomerData();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
