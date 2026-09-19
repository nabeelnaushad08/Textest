import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onSuccess: () => void;
}

export default function PaymentDialog({ open, onOpenChange, invoice, onSuccess }: PaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "0",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "cash",
    reference: "",
    notes: "",
  });

  const remainingBalance = invoice?.grand_total - (invoice?.paid_amount || 0);

  useEffect(() => {
    if (open && invoice) {
      setFormData({
        amount: remainingBalance.toFixed(2),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "cash",
        reference: "",
        notes: "",
      });
    }
  }, [open, invoice, remainingBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const paymentAmount = parseFloat(formData.amount);

      if (paymentAmount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      if (paymentAmount > remainingBalance) {
        throw new Error("Payment amount cannot exceed remaining balance");
      }

      // Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          customer_id: invoice.customer_id,
          invoice_id: invoice.id,
          amount: paymentAmount,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method as "cash" | "bank" | "cheque" | "card",
          reference: formData.reference,
          notes: formData.notes,
        }]);

      if (paymentError) throw paymentError;

      // Update invoice paid amount and status
      const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount;
      let paymentStatus = "pending";

      if (newPaidAmount >= invoice.grand_total) {
        paymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        paymentStatus = "partially_paid";
      }

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          paid_amount: newPaidAmount,
          payment_status: paymentStatus as "pending" | "partially_paid" | "paid" | "overdue",
        })
        .eq("id", invoice.id);

      if (invoiceError) throw invoiceError;

      toast({ title: "Payment recorded successfully" });
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
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Invoice Total:</span>
                <span className="font-semibold">LKR {invoice?.grand_total?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Already Paid:</span>
                <span className="font-semibold">LKR {(invoice?.paid_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Remaining:</span>
                <span className="text-destructive">LKR {remainingBalance?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Payment Amount (LKR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                max={remainingBalance}
              />
            </div>

            <div>
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference">Reference / Cheque No.</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Transaction ID or Cheque number"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
