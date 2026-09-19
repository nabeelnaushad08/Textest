import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  onSuccess: () => void;
}

export default function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    credit_limit: "0",
    opening_balance: "0",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        contact_person: customer.contact_person || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        credit_limit: customer.credit_limit?.toString() || "0",
        opening_balance: customer.opening_balance?.toString() || "0",
      });
    } else {
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address: "",
        credit_limit: "0",
        opening_balance: "0",
      });
    }
  }, [customer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const customerData = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      };

      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", customer.id);

        if (error) throw error;
        toast({ title: "Customer updated successfully" });
      } else {
        const { error } = await supabase
          .from("customers")
          .insert(customerData);

        if (error) throw error;
        toast({ title: "Customer created successfully" });
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
          <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="name">Customer Name *</Label>
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
              <div className="col-span-1 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                <Label htmlFor="credit_limit">Credit Limit (LKR)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
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

            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {customer ? "Update" : "Create"} Customer
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
