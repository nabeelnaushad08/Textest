import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { convertToBaseUnits } from "@/lib/units";
import { useUnitTypes } from "@/hooks/useUnitTypes";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ShoppingBag } from "lucide-react";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PurchaseLine {
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export default function PurchaseDialog({ open, onOpenChange, onSuccess }: PurchaseDialogProps) {
  const { toast } = useToast();
  const { unitTypes } = useUnitTypes();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: "",
    invoice_number: "",
    purchase_date: new Date().toISOString().split('T')[0],
    due_date: "",
    freight: "0",
    tax_amount: "0",
    notes: "",
  });
  const [lines, setLines] = useState<PurchaseLine[]>([]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (open) {
      setFormData({
        supplier_id: "",
        invoice_number: "",
        purchase_date: new Date().toISOString().split('T')[0],
        due_date: "",
        freight: "0",
        tax_amount: "0",
        notes: "",
      });
      setLines([]);
      addLine();
    }
  }, [open]);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    if (data) setSuppliers(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        product_id: "",
        product_name: "",
        unit: "pcs",
        quantity: 1,
        unit_price: 0,
        line_total: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof PurchaseLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].product_name = product.name;
        updated[index].unit = product.base_unit;
        updated[index].unit_price = product.cost_price;
      }
    }

    const line = updated[index];
    line.line_total = line.quantity * line.unit_price;

    setLines(updated);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const freight = parseFloat(formData.freight) || 0;
    const taxAmount = parseFloat(formData.tax_amount) || 0;
    const total = subtotal + freight + taxAmount;

    return { subtotal, freight, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0 || !lines.some(l => l.product_id)) {
      toast({
        title: "Error",
        description: "Please add at least one product line",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { subtotal, freight, taxAmount, total } = calculateTotals();

      const purchaseData = {
        supplier_id: formData.supplier_id,
        invoice_number: formData.invoice_number,
        purchase_date: formData.purchase_date,
        due_date: formData.due_date || null,
        subtotal,
        freight,
        tax_amount: taxAmount,
        total,
        paid_amount: 0,
        payment_status: "pending" as "pending" | "partially_paid" | "paid" | "overdue",
        notes: formData.notes,
      };

      const { data: purchase, error: purchaseError } = await supabase
        .from("supplier_purchases")
        .insert([purchaseData])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const lineInserts = lines
        .filter((line) => line.product_id)
        .map((line) => ({
          purchase_id: purchase.id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit: line.unit,
          unit_price: line.unit_price,
          line_total: line.line_total,
        }));

      const { error: linesError } = await supabase
        .from("supplier_purchase_items")
        .insert(lineInserts);

      if (linesError) throw linesError;

      // Create stock movements and update product stock
      for (const line of lines.filter((l) => l.product_id)) {
        await supabase.from("stock_movements").insert({
          product_id: line.product_id,
          movement_type: "purchase_in",
          quantity: line.quantity,
          unit: line.unit,
          unit_cost: line.unit_price,
          reference_id: purchase.id,
          reference_type: "purchase",
        });

        const { data: product } = await supabase
          .from("products")
          .select("current_stock, conversion_rates")
          .eq("id", line.product_id)
          .single();

        if (product) {
          const qtyInBaseUnits = convertToBaseUnits(line.quantity, line.unit, product.conversion_rates as any, unitTypes);
          const newStock = (product.current_stock || 0) + qtyInBaseUnits;

          await supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", line.product_id);
        }
      }

      toast({ title: "Purchase recorded successfully" });
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        supplier_id: "",
        invoice_number: "",
        purchase_date: new Date().toISOString().split('T')[0],
        due_date: "",
        freight: "0",
        tax_amount: "0",
        notes: "",
      });
      setLines([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <ShoppingBag className="inline h-5 w-5 mr-2" />
            Record Purchase
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select required value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Purchase Items</h3>
              <Button type="button" size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                  <div className="col-span-4">
                    <Label>Product</Label>
                    <Select
                      value={line.product_id}
                      onValueChange={(value) => updateLine(index, "product_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Unit</Label>
                    <Input value={line.unit} disabled className="bg-muted" />
                  </div>
                  <div className="col-span-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Total</Label>
                    <Input value={line.line_total.toFixed(2)} disabled className="bg-muted" />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="freight">Freight / Shipping</Label>
              <Input
                id="freight"
                type="number"
                step="0.01"
                value={formData.freight}
                onChange={(e) => setFormData({ ...formData, freight: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tax_amount">Tax Amount</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-right font-semibold">Subtotal:</div>
              <div className="text-right">LKR {totals.subtotal.toFixed(2)}</div>
              <div className="text-right font-semibold">Freight:</div>
              <div className="text-right">LKR {totals.freight.toFixed(2)}</div>
              <div className="text-right font-semibold">Tax:</div>
              <div className="text-right">LKR {totals.taxAmount.toFixed(2)}</div>
              <div className="text-right font-bold text-lg">Total:</div>
              <div className="text-right font-bold text-lg">LKR {totals.total.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Purchase
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
