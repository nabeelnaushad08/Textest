import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertCircle, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useUnitTypes } from "@/hooks/useUnitTypes";
import { convertToBaseUnits } from "@/lib/units";
import GridEntryDialog, { GridEntryLine } from "@/components/grid/GridEntryDialog";
import { PriceRule, loadPriceRules, resolvePrice } from "@/lib/pricing";
import { LayoutGrid } from "lucide-react";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
  onSuccess: () => void;
}

interface OrderLine {
  id: string;
  product_id: string;
  product_name: string;
  size: string;
  colour: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  available_stock?: number;
  fromGrid?: boolean;
}

export default function OrderDialog({ open, onOpenChange, order, onSuccess }: OrderDialogProps) {
  const { toast } = useToast();
  const { unitTypes } = useUnitTypes();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    order_date: new Date().toISOString().split('T')[0],
    status: "draft",
    notes: "",
  });
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  
  // Global settings
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [globalUnit, setGlobalUnit] = useState<string>("dozen");
  const [gridOpen, setGridOpen] = useState(false);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [globalTax, setGlobalTax] = useState<number>(0);

  useEffect(() => {
    fetchCustomers();
    fetchProductTypes();
    fetchProducts();
    loadPriceRules().then(setPriceRules);
  }, []);

  useEffect(() => {
    if (open) {
      if (order) {
        setFormData({
          customer_id: order.customer_id,
          order_date: order.order_date,
          status: order.status,
          notes: order.notes || "",
        });
        fetchOrderLines(order.id);
      } else {
        resetForm();
      }
    }
  }, [order, open]);

  // When categories change, load all products from selected categories
  useEffect(() => {
    if (selectedCategories.length > 0 && products.length > 0 && !order) {
      loadProductsByCategories();
    } else if (selectedCategories.length === 0 && !order) {
      setLines((prev) => prev.filter((l) => l.fromGrid));
    }
  }, [selectedCategories, products]);

  const loadProductsByCategories = async () => {
    const categoryProducts = products.filter(p => selectedCategories.includes(p.category));
    const existingQuantities = new Map(lines.map(l => [l.product_id, { quantity: l.quantity, unit_price: l.unit_price }]));
    
    const newLines: OrderLine[] = await Promise.all(
      categoryProducts.map(async (product) => {
        const existing = existingQuantities.get(product.id);
        const stock = await checkStock(product.id);
        const price = existing?.unit_price ?? resolvePrice({
          rules: priceRules,
          category: product.category,
          sizeGroup: product.size,
          colourGroup: product.colour,
          customerId: formData.customer_id || null,
          fallbackPrice: Number(product.selling_price) || 0,
        });
        return {
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          size: product.size || "",
          colour: product.colour || "",
          quantity: existing?.quantity || 0,
          unit: globalUnit,
          unit_price: price,
          line_total: (existing?.quantity || 0) * price,
          available_stock: stock,
        };
      })
    );
    setLines((prev) => [...prev.filter((l) => l.fromGrid), ...newLines]);
  };

  const applyGridLines = (gridLines: GridEntryLine[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const g of gridLines) {
        const idx = next.findIndex(
          (l) => l.product_id === g.product_id && (l.unit || globalUnit) === g.unit
        );
        if (idx >= 0) {
          const quantity = next[idx].quantity + g.quantity;
          next[idx] = {
            ...next[idx],
            quantity,
            unit_price: g.unit_price,
            line_total: quantity * g.unit_price,
            fromGrid: true,
          };
        } else {
          next.push({
            id: crypto.randomUUID(),
            product_id: g.product_id,
            product_name: g.product_name,
            size: g.size,
            colour: g.colour,
            quantity: g.quantity,
            unit: g.unit,
            unit_price: g.unit_price,
            line_total: g.quantity * g.unit_price,
            fromGrid: true,
          });
        }
      }
      return next;
    });
  };

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
      customer_id: "",
      order_date: new Date().toISOString().split('T')[0],
      status: "draft",
      notes: "",
    });
    setLines([]);
    setStockWarnings([]);
    setSelectedCategories([]);
    setGlobalUnit("dozen");
    setGlobalDiscount(0);
    setGlobalTax(0);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*").order("name");
    if (data) setCustomers(data);
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

  const fetchOrderLines = async (orderId: string) => {
    const { data } = await supabase
      .from("order_lines")
      .select("*")
      .eq("order_id", orderId);
    if (data) {
      const linesWithStock = await Promise.all(
        data.map(async (line) => {
          const stock = await checkStock(line.product_id);
          return {
            id: line.id,
            product_id: line.product_id,
            product_name: line.product_name,
            size: line.size || "",
            colour: line.colour || "",
            quantity: line.quantity,
            unit: line.unit || "dozen",
            unit_price: line.unit_price,
            line_total: line.line_total,
            available_stock: stock,
          };
        })
      );
      setLines(linesWithStock);
    }
  };

  const checkStock = async (productId: string): Promise<number> => {
    const { data } = await supabase
      .from("products")
      .select("current_stock")
      .eq("id", productId)
      .single();
    return data?.current_stock || 0;
  };

  const updateLine = (lineId: string, field: keyof OrderLine, value: any) => {
    setLines((prevLines) => {
      const updated = prevLines.map((line) => {
        if (line.id !== lineId) return line;
        const newLine = { ...line, [field]: value };
        newLine.line_total = newLine.quantity * newLine.unit_price;
        return newLine;
      });
      validateStock(updated);
      return updated;
    });
  };

  const removeLine = (lineId: string) => {
    setLines((prevLines) => prevLines.filter((line) => line.id !== lineId));
  };

  const validateStock = (orderLines: OrderLine[]) => {
    const warnings: string[] = [];
    orderLines.forEach((line) => {
      if (line.product_id && line.available_stock !== undefined && line.quantity > 0) {
        const unitType = unitTypes.find(u => u.symbol === globalUnit);
        const conversionRate = unitType?.conversion_to_pcs || 1;
        const qtyInBaseUnits = line.quantity * conversionRate;
        
        if (qtyInBaseUnits > line.available_stock) {
          warnings.push(
            `${line.product_name}: Requested ${line.quantity} ${globalUnit} (${qtyInBaseUnits} pcs), Available ${line.available_stock} pcs`
          );
        }
      }
    });
    setStockWarnings(warnings);
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
    const discountAmount = (subtotal * globalDiscount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * globalTax) / 100;
    const total = taxableAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
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

    if (stockWarnings.length > 0 && formData.status !== "draft") {
      toast({
        title: "Stock Warning",
        description: "Insufficient stock for some items. Save as draft or adjust quantities.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

      let orderNumber = order?.order_number;
      
      if (!orderNumber) {
        const { data: seqData, error: seqError } = await supabase.rpc('get_next_sequence_number', { seq_type: 'order' });
        if (seqError) throw seqError;
        orderNumber = seqData;
      }

      const orderData = {
        order_number: orderNumber,
        customer_id: formData.customer_id,
        order_date: formData.order_date,
        status: formData.status as "draft" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled",
        notes: formData.notes,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total,
      };

      let orderId = order?.id;

      if (order) {
        const { error } = await supabase
          .from("orders")
          .update(orderData)
          .eq("id", order.id);
        if (error) throw error;

        await supabase.from("order_lines").delete().eq("order_id", order.id);
      } else {
        const { data, error } = await supabase
          .from("orders")
          .insert(orderData)
          .select()
          .single();
        if (error) throw error;
        orderId = data.id;
      }

      const lineInserts = validLines.map((line) => ({
        order_id: orderId,
        product_id: line.product_id,
        product_name: line.product_name,
        size: line.size,
        colour: line.colour,
        unit: line.unit || globalUnit,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: globalDiscount,
        discount_amount: (line.line_total * globalDiscount) / 100,
        tax_percentage: globalTax,
        line_total: line.line_total,
      }));

      const { error: linesError } = await supabase
        .from("order_lines")
        .insert(lineInserts);

      if (linesError) throw linesError;

      if (formData.status === "confirmed" || formData.status === "packed") {
        for (const line of validLines) {
          await supabase.from("stock_movements").insert({
            product_id: line.product_id,
            movement_type: "sale_out",
            quantity: line.quantity,
            unit: line.unit || globalUnit,
            reference_id: orderId,
            reference_type: "order",
          });

          const { data: product } = await supabase
            .from("products")
            .select("current_stock, conversion_rates")
            .eq("id", line.product_id)
            .single();

          if (product) {
            const qtyInBaseUnits = convertToBaseUnits(
              line.quantity,
              line.unit || globalUnit,
              product.conversion_rates as any,
              unitTypes
            );
            const newStock = (product.current_stock || 0) - qtyInBaseUnits;

            await supabase
              .from("products")
              .update({ current_stock: newStock })
              .eq("id", line.product_id);
          }
        }
      }

      toast({ title: `Order ${order ? "updated" : "created"} successfully` });
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
            <ShoppingCart className="h-5 w-5" />
            {order ? "Edit Order" : "Create New Order"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customer_id">Customer *</Label>
                <Select required value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="order_date">Order Date *</Label>
                <Input
                  id="order_date"
                  type="date"
                  required
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {stockWarnings.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Stock Warnings:</div>
                  {stockWarnings.map((warning, i) => (
                    <div key={i} className="text-sm">{warning}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Unit</Label>
                    <Select
                      value={globalUnit}
                      onValueChange={(v) => {
                        setGlobalUnit(v);
                        setLines((prev) => prev.map((l) => ({ ...l, unit: v })));
                      }}
                    >
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
                  <div>
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Tax %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={globalTax}
                      onChange={(e) => setGlobalTax(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">Products</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => setGridOpen(true)}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Grid Entry
                </Button>
              </div>
              {lines.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-[250px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left text-sm font-medium">Product</th>
                          <th className="p-2 text-left text-sm font-medium hidden sm:table-cell">Size</th>
                          <th className="p-2 text-left text-sm font-medium hidden sm:table-cell">Colour</th>
                          <th className="p-2 text-left text-sm font-medium w-20">Qty</th>
                          <th className="p-2 text-left text-sm font-medium w-20">Unit</th>
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
                              {line.available_stock !== undefined && (
                                <span className="block text-xs text-muted-foreground">
                                  Stock: {line.available_stock} pcs
                                </span>
                              )}
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
                            <td className="p-2 text-xs">{line.unit || globalUnit}</td>
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
                              {line.line_total.toFixed(2)}
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
            <div className="border rounded-lg p-4 bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Subtotal:</span>
                <span>LKR {totals.subtotal.toFixed(2)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount ({globalDiscount}%):</span>
                  <span>- LKR {totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {globalTax > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({globalTax}%):</span>
                  <span>LKR {totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>LKR {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="order-form" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {order ? "Update Order" : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <GridEntryDialog
        open={gridOpen}
        onOpenChange={setGridOpen}
        products={products}
        customerId={formData.customer_id}
        unit={globalUnit}
        onApply={applyGridLines}
      />
    </Dialog>
  );
}