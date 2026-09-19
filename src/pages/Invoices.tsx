import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Pencil, DollarSign, Printer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InvoiceDialog from "@/components/invoices/InvoiceDialog";
import PaymentDialog from "@/components/payments/PaymentDialog";
import { useNavigate } from "react-router-dom";
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

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  payment_status: string;
  grand_total: number;
  paid_amount: number;
  customers: {
    name: string;
  };
}

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice "${invoiceNumber}"? This will also delete all related invoice lines and payments.`)) {
      return;
    }

    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Invoice deleted successfully" });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",
      partially_paid: "secondary",
      pending: "secondary",
      overdue: "destructive",
    };
    const labels: Record<string, string> = {
      paid: "Paid",
      partially_paid: "Partially Paid",
      pending: "Pending",
      overdue: "Overdue",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage your invoices and billing</p>
        </div>
        <Button onClick={() => { setSelectedInvoice(undefined); setInvoiceDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <FileText className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No invoices yet. Create your first invoice to get started.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{invoice.customers?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        LKR {invoice.grand_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        LKR {invoice.paid_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        LKR {(invoice.grand_total - invoice.paid_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {invoice.payment_status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Payment
                            </Button>
                           )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/invoices/print/${invoice.id}`)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
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
        </CardContent>
      </Card>

      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
      />

      {selectedInvoice && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoice={selectedInvoice}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
