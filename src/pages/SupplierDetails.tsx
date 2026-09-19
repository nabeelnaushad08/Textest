import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2, Package, DollarSign, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SupplierDialog from "@/components/suppliers/SupplierDialog";
import { format } from "date-fns";

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  supply_terms: string;
  notes: string;
  opening_balance: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  purchase_date: string;
  total: number;
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

export default function SupplierDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSupplierData();
    }
  }, [id]);

  const fetchSupplierData = async () => {
    try {
      // Fetch supplier details
      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();

      if (supplierError) throw supplierError;
      setSupplier(supplierData);

      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("supplier_purchases")
        .select("*")
        .eq("supplier_id", id)
        .order("purchase_date", { ascending: false });

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("supplier_payments")
        .select("*")
        .eq("supplier_id", id)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error("Error fetching supplier data:", error);
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
    if (!supplier) return;
    
    if (!confirm(`Are you sure you want to delete supplier "${supplier.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Supplier deleted successfully" });
      navigate("/suppliers");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = totalPurchases - totalPaid + (supplier?.opening_balance || 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Supplier not found</p>
        <Button onClick={() => navigate("/suppliers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Suppliers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/suppliers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">Supplier Details & History</p>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalPurchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{purchases.length} purchase(s)</p>
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
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstandingBalance > 0 ? "text-destructive" : "text-green-600"}`}>
              LKR {outstandingBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingBalance > 0 ? "Amount owed" : "Fully paid"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Information */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
              <p className="text-base">{supplier.contact_person || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-base">{supplier.phone || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-base">{supplier.email || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
              <p className="text-base">{supplier.tax_id || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Supply Terms</label>
              <p className="text-base">{supplier.supply_terms || "-"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Opening Balance</label>
              <p className="text-base">LKR {supplier.opening_balance?.toFixed(2) || "0.00"}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-base">{supplier.address || "-"}</p>
            </div>
            {supplier.notes && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-base">{supplier.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Purchases and Payments */}
      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No purchases recorded
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
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.invoice_number}</TableCell>
                          <TableCell>{format(new Date(purchase.purchase_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>LKR {purchase.total.toFixed(2)}</TableCell>
                          <TableCell>LKR {purchase.paid_amount?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                purchase.payment_status === "paid"
                                  ? "default"
                                  : purchase.payment_status === "partially_paid"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {purchase.payment_status || "pending"}
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

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={supplier}
        onSuccess={() => {
          fetchSupplierData();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
