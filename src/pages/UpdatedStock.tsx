import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Settings, Trash2, Printer, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import UpdatedPurchaseDialog from "@/components/stock/UpdatedPurchaseDialog";
import UpdatedStockAdjustmentDialog from "@/components/stock/UpdatedStockAdjustmentDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  unit: string;
  created_at: string;
  products: {
    name: string;
    sku: string;
  };
}

interface Purchase {
  id: string;
  invoice_number: string;
  purchase_date: string;
  subtotal: number;
  freight: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  payment_status: string;
  notes: string;
  suppliers: {
    name: string;
  };
}

export default function UpdatedStock() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [movementSearch, setMovementSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [movementsRes, purchasesRes] = await Promise.all([
        supabase
          .from("stock_movements")
          .select("*, products(name, sku)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("supplier_purchases")
          .select("*, suppliers(name)")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (movementsRes.error) throw movementsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;

      setMovements(movementsRes.data || []);
      setPurchases(purchasesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stock movement? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("stock_movements").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Stock movement deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePurchase = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete purchase "${invoiceNumber}"? This will also delete all related purchase items.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("supplier_purchases").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Purchase deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getMovementBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      purchase_in: "default",
      sale_out: "secondary",
      adjustment: "secondary",
      transfer: "secondary",
    };
    const labels: Record<string, string> = {
      purchase_in: "Purchase In",
      sale_out: "Sale Out",
      adjustment: "Adjustment",
      transfer: "Transfer",
    };
    return (
      <Badge variant={variants[type] || "secondary"}>
        {labels[type] || type}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",
      pending: "secondary",
      partially_paid: "secondary",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const filteredMovements = movements.filter((movement) => {
    const searchLower = movementSearch.toLowerCase();
    return (
      movement.products?.name.toLowerCase().includes(searchLower) ||
      movement.products?.sku.toLowerCase().includes(searchLower) ||
      movement.movement_type.toLowerCase().includes(searchLower)
    );
  });

  const filteredPurchases = purchases.filter((purchase) => {
    const searchLower = purchaseSearch.toLowerCase();
    return (
      purchase.invoice_number.toLowerCase().includes(searchLower) ||
      purchase.suppliers?.name.toLowerCase().includes(searchLower) ||
      purchase.payment_status.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground">Track inventory movements and purchases</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPurchaseDialogOpen(true)}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Record Purchase
          </Button>
          <Button variant="outline" onClick={() => setAdjustmentDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Stock Adjustment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Purchase Records</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search purchases..."
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No purchases found. Record your first purchase to get started.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="font-medium">{purchase.invoice_number}</TableCell>
                            <TableCell>
                              {new Date(purchase.purchase_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{purchase.suppliers?.name || "-"}</TableCell>
                            <TableCell className="text-right">
                              LKR {purchase.total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              LKR {(purchase.paid_amount || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(purchase.payment_status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/purchases/print/${purchase.id}`)}
                                >
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePurchase(purchase.id, purchase.invoice_number)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Stock Movements</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search movements..."
                    value={movementSearch}
                    onChange={(e) => setMovementSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No stock movements yet. Activity will appear here.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMovements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>
                              {new Date(movement.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.products?.name || "-"}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {movement.products?.sku || "-"}
                            </TableCell>
                            <TableCell>{getMovementBadge(movement.movement_type)}</TableCell>
                            <TableCell className="text-right">
                              {movement.quantity} {movement.unit}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteMovement(movement.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UpdatedPurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        onSuccess={fetchData}
      />

      <UpdatedStockAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}