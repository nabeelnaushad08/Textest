import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface TypeFirstProductSelectorProps {
  onProductSelect: (product: any, selectedUnit?: string) => void;
  selectedProductId?: string;
}

export default function TypeFirstProductSelector({ onProductSelect, selectedProductId }: TypeFirstProductSelectorProps) {
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(selectedProductId || "");
  const [selectedUnit, setSelectedUnit] = useState("pcs");
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchProductTypes();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        setSelectedType(product.category);
        setSelectedProduct(selectedProductId);
      }
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    if (selectedType) {
      const filtered = products.filter(p => p.category === selectedType);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedType, products]);

  const fetchProductTypes = async () => {
    const { data } = await supabase
      .from("product_types")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setProductTypes(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("name");
    if (data) setProducts(data);
  };

  const handleTypeChange = (typeValue: string) => {
    setSelectedType(typeValue);
    setSelectedProduct("");
    setSelectedUnit("pcs");
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      const allowedUnits = product.allowed_units || ["pcs"];
      setSelectedUnit(allowedUnits[0]);
    }
  };

  const handleAddProduct = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (product) {
      onProductSelect(product, selectedUnit);
      setSelectedProduct("");
      setSelectedUnit("pcs");
    }
  };

  const getProductCountByType = (typeName: string) => {
    return products.filter(p => p.category === typeName).length;
  };

  const currentProduct = products.find(p => p.id === selectedProduct);
  const allowedUnits = currentProduct?.allowed_units || ["pcs"];

  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-4">
        <Label>Product Type *</Label>
        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {productTypes.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.name} ({getProductCountByType(type.name)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedType && (
        <>
          <div className="col-span-5">
            <Label>Product *</Label>
            <Select value={selectedProduct} onValueChange={handleProductChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} {product.size ? `- ${product.size}` : ""} {product.colour ? `- ${product.colour}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <>
              <div className="col-span-2">
                <Label>Unit</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedUnits.map((unit: string) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1">
                <Button type="button" onClick={handleAddProduct} className="w-full">
                  Add
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
