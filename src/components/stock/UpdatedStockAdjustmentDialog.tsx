import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { convertToBaseUnits } from "@/lib/units";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings } from "lucide-react";
import { useUnitTypes } from "@/hooks/useUnitTypes";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UpdatedStockAdjustmentDialog({ open, onOpenChange, onSuccess }: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { unitTypes } = useUnitTypes();
  const [formData, setFormData] = useState({
    product_id: "",
    adjustment_type: "add",
    quantity: "0",
    unit: "pcs",
    reason: "",
  });
  const [currentStock, setCurrentStock] = useState<number>(0);

  useEffect(() => {
    fetchProductTypes();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (open) {
      const defaultUnit = unitTypes.length > 0 ? unitTypes[0].symbol : "pcs";
      setFormData({
        product_id: "",
        adjustment_type: "add",
        quantity: "0",
        unit: defaultUnit,
        reason: "",
      });
      setCurrentStock(0);
      setSelectedCategory("");
    }
  }, [open, unitTypes]);

  useEffect(() => {
    if (formData.product_id) {
      fetchCurrentStock(formData.product_id);
    }
  }, [formData.product_id]);

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

  const filteredProducts = selectedCategory && selectedCategory !== "all"
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const fetchCurrentStock = async (productId: string) => {
    const { data } = await supabase
      .from("products")
      .select("current_stock, base_unit")
      .eq("id", productId)
      .single();
    
    if (data) {
      setCurrentStock(data.current_stock || 0);
      setFormData(prev => ({ ...prev, unit: data.base_unit }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantity = parseFloat(formData.quantity);
      if (quantity <= 0) {
        throw new Error("Quantity must be greater than zero");
      }

      await supabase.from("stock_movements").insert({
        product_id: formData.product_id,
        movement_type: "adjustment",
        quantity: Math.abs(quantity),
        unit: formData.unit,
        notes: `${formData.adjustment_type === "add" ? "Stock Added" : "Stock Removed"}: ${formData.reason}`,
      });

      const { data: product } = await supabase
        .from("products")
        .select("current_stock, conversion_rates")
        .eq("id", formData.product_id)
        .single();

      if (product) {
        const qtyInBaseUnits = convertToBaseUnits(quantity, formData.unit, product.conversion_rates as any, unitTypes);
        const newStock = (product.current_stock || 0) + (formData.adjustment_type === "add" ? qtyInBaseUnits : -qtyInBaseUnits);

        if (newStock < 0) {
          throw new Error("Cannot adjust stock below zero");
        }

        await supabase
          .from("products")
          .update({ current_stock: newStock })
          .eq("id", formData.product_id);
      }

      toast({ title: "Stock adjusted successfully" });
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

  const product = products.find(p => p.id === formData.product_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Stock Adjustment
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">Product Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category to filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {productTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="product_id">Product *</Label>
              <Select
                required
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.product_id && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold">Current Stock:</span>
                    <span>{currentStock} {product?.base_unit}</span>
                  </div>
                  {product?.reorder_level && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Reorder Level:</span>
                      <span>{product.reorder_level} {product.base_unit}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="adjustment_type">Adjustment Type *</Label>
              <Select
                value={formData.adjustment_type}
                onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
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

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Damaged goods, inventory count correction, etc."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adjust Stock
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
