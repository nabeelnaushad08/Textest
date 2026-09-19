import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, Pencil, Trash2 } from "lucide-react";
import ProductDialog from "@/components/products/ProductDialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  sku: string;
  product_code: string;
  name: string;
  category: string;
  size: string;
  colour: string;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  base_unit: string;
}

interface ProductType {
  id: string;
  name: string;
  display_order: number;
}

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [preselectedCategory, setPreselectedCategory] = useState<string>("");

  useEffect(() => {
    fetchProductTypes();
    fetchProducts();
  }, []);

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("product_types")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setProductTypes(data || []);
    } catch (error) {
      console.error("Error fetching product types:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === "all" || product.category === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getProductCountByType = (typeName: string) => {
    return products.filter(p => p.category === typeName).length;
  };

  const handleAddProduct = (category?: string) => {
    setSelectedProduct(undefined);
    setPreselectedCategory(category || "");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Product deleted successfully" });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Click a tab to view and manage all products of that type. Add new products directly to this category.
          </p>
        </div>
        <Button onClick={() => handleAddProduct(selectedType !== "all" ? selectedType : undefined)}>
          <Plus className="mr-2 h-4 w-4" />
          {selectedType !== "all" ? `Add to ${selectedType}` : "Add Product"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({products.length})
              </TabsTrigger>
              {productTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.name}>
                  {type.name} ({getProductCountByType(type.name)})
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or code..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value={selectedType} className="mt-0">
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <Package className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? "No products found" : `No products in ${selectedType === "all" ? "inventory" : selectedType}. Add your first product to get started.`}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Colour</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>{product.product_code}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category || "-"}</TableCell>
                          <TableCell>{product.size || "-"}</TableCell>
                          <TableCell>{product.colour || "-"}</TableCell>
                          <TableCell className="text-right">
                            LKR {product.selling_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.current_stock} {product.base_unit}
                          </TableCell>
                          <TableCell>
                            {product.current_stock <= product.reorder_level ? (
                              <Badge variant="destructive">Low Stock</Badge>
                            ) : (
                              <Badge variant="default" className="bg-success">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setPreselectedCategory("");
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(product.id, product.name)}
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
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        preselectedCategory={preselectedCategory}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
