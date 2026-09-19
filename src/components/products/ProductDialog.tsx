import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { useUnitTypes } from "@/hooks/useUnitTypes";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  preselectedCategory?: string;
  onSuccess: () => void;
}

interface UnitConversion {
  unit: string;
  rate: number;
}

export default function ProductDialog({ open, onOpenChange, product, preselectedCategory, onSuccess }: ProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const { unitTypes } = useUnitTypes();
  const [formData, setFormData] = useState({
    sku: "",
    product_code: "",
    name: "",
    description: "",
    category: "",
    size: "",
    colour: "",
    cost_price: "0",
    selling_price: "0",
    base_unit: "pcs",
    tax_rate: "0",
    reorder_level: "0",
    reorder_quantity: "0",
    supplier_id: "",
    barcode: "",
  });
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([
    { unit: "pcs", rate: 1 },
  ]);

  useEffect(() => {
    fetchSuppliers();
    fetchProductTypes();
  }, []);

  useEffect(() => {
    if (open) {
      if (product) {
        // Editing existing product
        setFormData({
          sku: product.sku || "",
          product_code: product.product_code || "",
          name: product.name || "",
          description: product.description || "",
          category: product.category || "",
          size: product.size || "",
          colour: product.colour || "",
          cost_price: product.cost_price?.toString() || "0",
          selling_price: product.selling_price?.toString() || "0",
          base_unit: product.base_unit || "pcs",
          tax_rate: product.tax_rate?.toString() || "0",
          reorder_level: product.reorder_level?.toString() || "0",
          reorder_quantity: product.reorder_quantity?.toString() || "0",
          supplier_id: product.supplier_id || "",
          barcode: product.barcode || "",
        });

        // Load conversion rates
        if (product.conversion_rates) {
          const rates = typeof product.conversion_rates === 'string' 
            ? JSON.parse(product.conversion_rates) 
            : product.conversion_rates;
          const conversions = Object.entries(rates).map(([unit, rate]) => ({
            unit,
            rate: Number(rate)
          }));
          setUnitConversions(conversions);
        }
      } else {
        // Creating new product - reset form and generate SKU
        const newSku = `SKU${Date.now().toString().slice(-6)}`;
        const defaultUnit = unitTypes.length > 0 ? unitTypes[0].symbol : "pcs";
        setFormData({
          sku: newSku,
          product_code: "",
          name: "",
          description: "",
          category: preselectedCategory || "",
          size: "",
          colour: "",
          cost_price: "0",
          selling_price: "0",
          base_unit: defaultUnit,
          tax_rate: "0",
          reorder_level: "0",
          reorder_quantity: "0",
          supplier_id: "",
          barcode: "",
        });
        setUnitConversions([{ unit: defaultUnit, rate: 1 }]);
      }
    }
  }, [product, open, preselectedCategory, unitTypes]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .order("name");
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

  const addUnitConversion = () => {
    setUnitConversions([...unitConversions, { unit: "", rate: 1 }]);
  };

  const removeUnitConversion = (index: number) => {
    if (unitConversions.length > 1) {
      setUnitConversions(unitConversions.filter((_, i) => i !== index));
    }
  };

  const updateUnitConversion = (index: number, field: "unit" | "rate", value: string | number) => {
    const updated = [...unitConversions];
    updated[index] = { ...updated[index], [field]: value };
    setUnitConversions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build conversion_rates and allowed_units
      const conversion_rates: Record<string, number> = {};
      const allowed_units: string[] = [];
      
      unitConversions.forEach(({ unit, rate }) => {
        if (unit) {
          conversion_rates[unit] = rate;
          allowed_units.push(unit);
        }
      });

      const productData = {
        ...formData,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        tax_rate: parseFloat(formData.tax_rate),
        reorder_level: parseInt(formData.reorder_level),
        reorder_quantity: parseInt(formData.reorder_quantity),
        supplier_id: formData.supplier_id || null,
        conversion_rates,
        allowed_units,
      };

      if (product) {
        // Track category change for audit
        if (product.category !== formData.category) {
          await supabase.from("audit_logs").insert({
            table_name: "products",
            record_id: product.id,
            action: "UPDATE",
            old_value: { category: product.category },
            new_value: { category: formData.category },
          });
        }

        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);

        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);

        if (error) throw error;
        toast({ title: "Product created successfully" });
      }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="product_code">Product Code *</Label>
                <Input
                  id="product_code"
                  required
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category / Type *</Label>
                <Select required value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="colour">Colour</Label>
                <Input
                  id="colour"
                  value={formData.colour}
                  onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost_price">Cost Price (LKR) *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="selling_price">Selling Price (LKR) *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_unit">Base Unit *</Label>
                <Select value={formData.base_unit} onValueChange={(value) => setFormData({ ...formData, base_unit: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select base unit" />
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
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Unit Conversions</Label>
              <div className="space-y-2 mt-2">
                {unitConversions.map((conv, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={conv.unit}
                        onValueChange={(value) => updateUnitConversion(index, "unit", value)}
                        disabled={index === 0}
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
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Conversion rate"
                        value={conv.rate}
                        onChange={(e) => updateUnitConversion(index, "rate", parseFloat(e.target.value))}
                        disabled={index === 0}
                      />
                    </div>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUnitConversion(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addUnitConversion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reorder_quantity">Reorder Qty</Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  value={formData.reorder_quantity}
                  onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="supplier_id">Primary Supplier</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
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

            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background pb-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? "Update" : "Create"} Product
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
