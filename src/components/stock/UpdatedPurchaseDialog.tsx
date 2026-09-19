import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ShoppingBag, LayoutGrid } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUnitTypes } from "@/hooks/useUnitTypes";
import { convertToBaseUnits } from "@/lib/units";
import GridEntryDialog, { GridEntryLine } from "@/components/grid/GridEntryDialog";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PurchaseLine {
  id: string;
  product_id: string;
  product_name: string;
  size: string;
  colour: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  fromGrid?: boolean;
}

export default function UpdatedPurchaseDialog({ open, onOpenChange, onSuccess }: PurchaseDialogProps) {
  const { toast } = useToast();
  const { unitTypes } = useUnitTypes();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
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
  
  // Global settings
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [globalUnit, setGlobalUnit] = useState<string>("pcs");
  const [gridOpen, setGridOpen] = useState(false);

  const applyGridLines = (gridLines: GridEntryLine[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const g of gridLines) {
        const idx = next.findIndex((l) => l.product_id === g.product_id);
        if (idx >= 0) {
          const qty = (Number(next[idx].quantity) || 0) + g.quantity;
          next[idx] = { ...next[idx], quantity: qty, line_total: qty * next[idx].unit_price };
        } else {
          next.push({
            id: crypto.randomUUID(),
            product_id: g.product_id,
            product_name: g.product_name,
            size: g.size,
            colour: g.colour,
            quantity: g.quantity,
            unit_price: g.unit_price,
            line_total: g.quantity * g.unit_price,
            fromGrid: true,
          });
        }
      }
      return next;
    });
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProductTypes();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  // When categories change, load all products from selected categories
  useEffect(() => {
    if (selectedCategories.length > 0 && products.length > 0) {
      const categoryProducts = products.filter(p => selectedCategories.includes(p.category));
      const existingQuantities = new Map(lines.map(l => [l.product_id, { quantity: l.quantity, unit_price: l.unit_price }]));
      
      const newLines: PurchaseLine[] = categoryProducts.map(product => {
        const existing = existingQuantities.get(product.id);
        return {
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          size: product.size || "",
          colour: product.colour || "",
          quantity: existing?.quantity || 0,
          unit_price: existing?.unit_price || product.cost_price,
          line_total: (existing?.quantity || 0) * (existing?.unit_price || product.cost_price),
        };
      });
      const ids = new Set(newLines.map((l) => l.product_id));
      setLines([...lines.filter((l) => l.fromGrid && !ids.has(l.product_id)), ...newLines]);
    } else if (selectedCategories.length === 0) {
      setLines([]);
    }
  }, [selectedCategories, products]);

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryName)) {
        return prev.filter(c => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const resetForm = () => {
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
    setSelectedCategories([]);
    setGlobalUnit("pcs");
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    if (data) setSuppliers(data);
  };

  const fetchProductTypes = async () => {
    const { data } = await supabase
      .from("product_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setProductTypes(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  };

  const updateLine = (lineId: string, field: keyof PurchaseLine, value: any) => {
    setLines((prevLines) =>
      prevLines.map((line) => {
        if (line.id !== lineId) return line;
        const updated = { ...line, [field]: value };
        updated.line_total = updated.quantity * updated.unit_price;
        return updated;
      })
    );
  };

  const removeLine = (lineId: string) => {
    setLines((prevLines) => prevLines.filter((line) => line.id !== lineId));
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

    const validLines = lines.filter(l => l.quantity > 0);
    if (validLines.length === 0) {
      toast({
        title: "Error",
        description: "Please add quantity to at least one product",
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
        payment_status: "pending" as const,
        notes: formData.notes,
      };

      const { data: purchase, error: purchaseError } = await supabase
        .from("supplier_purchases")
        .insert([purchaseData])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const lineInserts = validLines.map((line) => ({
        purchase_id: purchase.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit: globalUnit,
        unit_price: line.unit_price,
        line_total: line.line_total,
      }));

      const { error: linesError } = await supabase
        .from("supplier_purchase_items")
        .insert(lineInserts);

      if (linesError) throw linesError;

      for (const line of validLines) {
        await supabase.from("stock_movements").insert({
          product_id: line.product_id,
          movement_type: "purchase_in",
          quantity: line.quantity,
          unit: globalUnit,
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
          const qtyInBaseUnits = convertToBaseUnits(
            line.quantity,
            globalUnit,
            product.conversion_rates as any,
            unitTypes
          );
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
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Record Purchase
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="purchase-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Separator />

            {/* Global Settings */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-3">Global Settings (applies to all items)</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Product Types * (select one or more)</Label>
                  <div className="flex flex-wrap gap-2">
                    {productTypes.map((type) => (
                      <Button
                        key={type.id}
                        type="button"
                        variant={selectedCategories.includes(type.name) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategoryToggle(type.name)}
                      >
                        {type.name}
                        {selectedCategories.includes(type.name) && " ✓"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Unit</Label>
                    <Select value={globalUnit} onValueChange={setGlobalUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitTypes.map((unit) => (
                          <SelectItem key={unit.id} value={unit.symbol}>
                            {unit.name} ({unit.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Purchase Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => setGridOpen(true)}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Grid Entry
                </Button>
              </div>
              {lines.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[200px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left text-sm font-medium">Product</th>
                          <th className="p-2 text-left text-sm font-medium hidden sm:table-cell">Size</th>
                          <th className="p-2 text-left text-sm font-medium hidden sm:table-cell">Colour</th>
                          <th className="p-2 text-left text-sm font-medium w-20">Qty</th>
                          <th className="p-2 text-left text-sm font-medium w-24">Price</th>
                          <th className="p-2 text-right text-sm font-medium w-24">Total</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr key={line.id} className="border-t hover:bg-muted/30">
                            <td className="p-2 text-sm">
                              {line.product_name}
                              <span className="sm:hidden block text-xs text-muted-foreground">
                                {line.size && `${line.size}`} {line.colour && `/ ${line.colour}`}
                              </span>
                            </td>
                            <td className="p-2 text-sm hidden sm:table-cell">{line.size || "-"}</td>
                            <td className="p-2 text-sm hidden sm:table-cell">{line.colour || "-"}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.quantity || ""}
                                onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-16 h-8 text-sm"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={line.unit_price}
                                onChange={(e) => updateLine(line.id, "unit_price", parseFloat(e.target.value) || 0)}
                                className="w-20 h-8 text-sm"
                              />
                            </td>
                            <td className="p-2 text-right text-sm font-medium">
                              LKR {line.line_total.toFixed(2)}
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => removeLine(line.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                  Select a Product Type above to load products
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Totals */}
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
          </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="purchase-form" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
      <GridEntryDialog
        open={gridOpen}
        onOpenChange={setGridOpen}
        products={products}
        unit={globalUnit}
        priceMode="cost"
        onApply={applyGridLines}
      />
    </Dialog>
  );
}