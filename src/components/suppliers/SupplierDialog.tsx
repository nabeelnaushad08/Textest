import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any;
  onSuccess: () => void;
}

export default function SupplierDialog({ open, onOpenChange, supplier, onSuccess }: SupplierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    supply_terms: "",
    tax_id: "",
    notes: "",
    opening_balance: "0",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        supply_terms: supplier.supply_terms || "",
        tax_id: supplier.tax_id || "",
        notes: supplier.notes || "",
        opening_balance: supplier.opening_balance?.toString() || "0",
      });
    } else {
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        supply_terms: "",
        tax_id: "",
        notes: "",
        opening_balance: "0",
      });
    }
  }, [supplier, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supplierData = {
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      };

      if (supplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(supplierData)
          .eq("id", supplier.id);

        if (error) throw error;
        toast({ title: "Supplier updated successfully" });
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert(supplierData);

        if (error) throw error;
        toast({ title: "Supplier created successfully" });
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{supplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tax_id">Tax ID</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supply_terms">Supply Terms</Label>
                <Input
                  id="supply_terms"
                  placeholder="e.g., 30 days"
                  value={formData.supply_terms}
                  onChange={(e) => setFormData({ ...formData, supply_terms: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="opening_balance">Opening Balance (LKR)</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                />
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

            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {supplier ? "Update" : "Create"} Supplier
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
