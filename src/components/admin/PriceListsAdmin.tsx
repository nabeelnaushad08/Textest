import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { PriceRule } from "@/lib/pricing";

export default function PriceListsAdmin() {
  const { toast } = useToast();
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "",
    size_group: "",
    colour_group: "",
    unit: "dozen",
    price: 0,
    is_flat_rate: false,
    customer_id: "none",
  });

  const fetchAll = async () => {
    const [r, c, t] = await Promise.all([
      supabase.from("category_price_rules").select("*").order("category"),
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("product_types").select("name").eq("is_active", true).order("display_order"),
    ]);
    setRules((r.data as PriceRule[]) || []);
    setCustomers(c.data || []);
    setCategories(t.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addRule = async () => {
    if (!form.category.trim()) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: form.category.trim(),
        size_group: form.size_group.trim() || null,
        colour_group: form.colour_group.trim() || null,
        unit: form.unit || "dozen",
        price: Number(form.price) || 0,
        is_flat_rate: form.is_flat_rate,
        customer_id: form.customer_id === "none" ? null : form.customer_id,
      };
      const { error } = await supabase.from("category_price_rules").insert(payload);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        action: "insert",
        table_name: "category_price_rules",
        new_value: payload as any,
      });
      toast({ title: "Price rule added" });
      setForm({ ...form, size_group: "", colour_group: "", price: 0 });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeRule = async (rule: PriceRule) => {
    if (!confirm("Delete this price rule?")) return;
    const { error } = await supabase.from("category_price_rules").delete().eq("id", rule.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("audit_logs").insert({
      action: "delete",
      table_name: "category_price_rules",
      record_id: rule.id,
      old_value: rule as any,
    });
    toast({ title: "Price rule deleted" });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Price Lists</h3>
        <p className="text-sm text-muted-foreground">
          Set prices per category and size group, with optional customer-specific rates.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add a price rule</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label>Category</Label>
            <Input
              list="price-categories"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Senorita"
            />
            <datalist id="price-categories">
              {categories.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Size group</Label>
            <Input
              value={form.size_group}
              onChange={(e) => setForm({ ...form, size_group: e.target.value })}
              placeholder="30/32/34"
            />
          </div>
          <div>
            <Label>Colour group</Label>
            <Input
              value={form.colour_group}
              onChange={(e) => setForm({ ...form, colour_group: e.target.value })}
              placeholder="WHITE"
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div>
            <Label>Price</Label>
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Customer (optional)</Label>
            <Select
              value={form.customer_id}
              onValueChange={(v) => setForm({ ...form, customer_id: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox
              id="flat"
              checked={form.is_flat_rate}
              onCheckedChange={(v) => setForm({ ...form, is_flat_rate: v as boolean })}
            />
            <Label htmlFor="flat" className="text-sm font-normal cursor-pointer">
              Flat rate for whole category
            </Label>
          </div>
          <div className="flex items-end">
            <Button onClick={addRule} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Existing rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-left">Category</th>
                  <th className="p-2 text-left">Size group</th>
                  <th className="p-2 text-left">Colour group</th>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      No price rules yet — product selling prices are used.
                    </td>
                  </tr>
                )}
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">{r.size_group || (r.is_flat_rate ? "Flat rate" : "Any")}</td>
                    <td className="p-2">{r.colour_group || "Any"}</td>
                    <td className="p-2">
                      {customers.find((c) => c.id === r.customer_id)?.name || "All"}
                    </td>
                    <td className="p-2 text-right">
                      {Number(r.price).toFixed(2)} / {r.unit}
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="icon" onClick={() => removeRule(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
