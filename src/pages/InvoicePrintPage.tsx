import { useParams } from "react-router-dom";
import InvoicePrint from "@/components/invoices/InvoicePrint";

export default function InvoicePrintPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <InvoicePrint invoiceId={invoiceId || ""} />;
}
