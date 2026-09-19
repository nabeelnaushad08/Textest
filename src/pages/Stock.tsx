import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingBag, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PurchaseDialog from "@/components/stock/PurchaseDialog";
import StockAdjustmentDialog from "@/components/stock/StockAdjustmentDialog";
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

export default function Stock() {
  const { toast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, sku)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stock movement? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("stock_movements").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Stock movement deleted successfully" });
      fetchMovements();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground">Track all inventory movements</p>
        </div>
        <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No stock movements yet. Activity will appear here.
              </p>
            </div>
          ) : (
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
                  {movements.map((movement) => (
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
                          onClick={() => handleDelete(movement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        onSuccess={fetchMovements}
      />

      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        onSuccess={fetchMovements}
      />
    </div>
  );
}
