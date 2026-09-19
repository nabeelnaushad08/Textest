import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PrintLogoHeader from "@/components/print/PrintLogoHeader";

interface InvoicePrintProps {
  invoiceId: string;
}

interface InvoiceLine {
  id: string;
  product_name: string;
  size: string | null;
  colour: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percentage: number | null;
  discount_amount: number | null;
  tax_percentage: number | null;
  line_total: number;
  products: {
    category: string | null;
    product_code: string;
  } | null;
}

interface Invoice {
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  discount_amount: number | null;
  tax_amount: number | null;
  grand_total: number;
  paid_amount: number | null;
  notes: string | null;
  print_discounts: boolean | null;
  metadata: any;
  customers: {
    name: string;
    address: string | null;
    phone: string | null;
    opening_balance: number | null;
  };
}

export default function InvoicePrint({ invoiceId }: InvoicePrintProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  useEffect(() => {
    if (!loading && invoice) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, invoice]);

  const fetchInvoiceData = async () => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*, customers(*)")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: linesData, error: linesError } = await supabase
        .from("invoice_lines")
        .select("*, products(category, product_code)")
        .eq("invoice_id", invoiceId);

      if (linesError) throw linesError;

      setInvoice(invoiceData);
      setLines(linesData || []);
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupLinesByCategory = (lines: InvoiceLine[]) => {
    const grouped: { [key: string]: InvoiceLine[] } = {};
    lines.forEach((line) => {
      const category = line.products?.category || "Uncategorized";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(line);
    });
    return grouped;
  };

  const calculateCategoryDiscount = (categoryLines: InvoiceLine[]) => {
    return categoryLines.reduce((sum, line) => sum + (line.discount_amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) return null;

  const groupedLines = groupLinesByCategory(lines);
  const headerName = invoice.metadata?.alternate_header_name || "TEXPRO Marketing";
  const showDiscounts = invoice.print_discounts;
  const outstandingBalance = invoice.customers.opening_balance || 0;
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="print-container">
      <style>{`
        @media print {
          @page { 
            size: A4; 
            margin: 8mm 10mm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-container { 
            width: 100%; 
            max-width: 210mm;
            margin: 0 auto;
            font-size: 8pt;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
        
        .print-container {
          font-family: 'Arial', 'Helvetica', sans-serif;
          color: #000;
          line-height: 1.2;
          max-width: 210mm;
          margin: 0 auto;
          padding: 8px;
          font-size: 8pt;
        }
        
        .invoice-header {
          text-align: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1.5px solid #000;
        }
        
        .company-name {
          font-size: 18pt;
          font-weight: 700;
          color: #000;
          margin-bottom: 2px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .company-contact {
          font-size: 9pt;
          font-weight: 500;
          color: #333;
        }
        
        .invoice-info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 16px;
          padding: 6px 0;
          border-bottom: 1px solid #ccc;
        }
        
        .invoice-to {
          flex: 1;
        }
        
        .invoice-details {
          flex: 0 0 auto;
          text-align: right;
        }
        
        .section-title {
          font-size: 7pt;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          margin-bottom: 2px;
          letter-spacing: 0.5px;
        }
        
        .customer-name {
          font-size: 10pt;
          font-weight: 700;
          color: #000;
          margin-bottom: 1px;
        }
        
        .customer-detail {
          font-size: 8pt;
          color: #333;
          line-height: 1.3;
        }
        
        .invoice-number {
          font-size: 10pt;
          font-weight: 700;
          color: #000;
          margin-bottom: 2px;
        }
        
        .invoice-date {
          font-size: 8pt;
          color: #333;
        }
        
        .category-section {
          margin-bottom: 6px;
        }
        
        .category-heading {
          font-size: 8pt;
          font-weight: 700;
          color: #000;
          background: #e5e5e5;
          padding: 3px 6px;
          margin-bottom: 2px;
          border-left: 3px solid #000;
        }
        
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2px;
          font-size: 7.5pt;
        }
        
        .invoice-table thead {
          background: #f0f0f0;
        }
        
        .invoice-table th {
          padding: 3px 4px;
          text-align: left;
          font-weight: 700;
          color: #000;
          border-bottom: 1px solid #000;
          border-top: 1px solid #000;
          font-size: 7pt;
          text-transform: uppercase;
        }
        
        .invoice-table td {
          padding: 2px 4px;
          border-bottom: 0.5px solid #ddd;
          color: #000;
          vertical-align: middle;
        }
        
        .invoice-table tbody tr:nth-child(even) {
          background: #fafafa;
        }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .discount-row {
          background: #fff3cd !important;
          font-weight: 600;
          font-style: italic;
        }
        
        .discount-row td {
          color: #856404;
          font-size: 7pt;
        }
        
        .summary-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid #000;
        }
        
        .notes-section {
          flex: 1;
          max-width: 50%;
        }
        
        .notes-title {
          font-size: 7pt;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        
        .notes-content {
          font-size: 7pt;
          color: #555;
          line-height: 1.3;
        }
        
        .totals-section {
          flex: 0 0 auto;
        }
        
        .totals-table {
          font-size: 8pt;
          min-width: 180px;
        }
        
        .totals-table td {
          padding: 2px 6px;
        }
        
        .totals-table .label {
          font-weight: 500;
          color: #333;
          text-align: left;
        }
        
        .totals-table .value {
          text-align: right;
          font-weight: 600;
          color: #000;
        }
        
        .grand-total-row {
          background: #000;
        }
        
        .grand-total-row td {
          padding: 4px 6px;
          font-weight: 700;
        }
        
        .grand-total-row .label {
          color: #fff;
        }
        
        .grand-total-row .value {
          color: #fff;
          font-size: 10pt;
        }
        
        .outstanding-row td {
          color: #c00;
          font-weight: 600;
        }
        
        .footer-section {
          margin-top: 10px;
          text-align: center;
          border-top: 1px solid #ccc;
          padding-top: 6px;
        }
        
        .thank-you {
          font-size: 9pt;
          font-weight: 700;
          color: #000;
          margin-bottom: 3px;
        }
        
        .footer-note {
          font-size: 6pt;
          color: #666;
          font-style: italic;
        }
        
        .powered-by {
          margin-top: 4px;
          font-size: 6pt;
          color: #999;
        }
        
        .product-code {
          font-size: 6pt;
          color: #666;
        }
      `}</style>

      <div className="invoice-header">
        <PrintLogoHeader title={headerName} />
      </div>

      <div className="invoice-info-section">
        <div className="invoice-to">
          <div className="section-title">Invoice To</div>
          <div className="customer-name">{invoice.customers.name}</div>
          {invoice.customers.address && (
            <div className="customer-detail">{invoice.customers.address}</div>
          )}
          {invoice.customers.phone && (
            <div className="customer-detail">Tel: {invoice.customers.phone}</div>
          )}
        </div>
        <div className="invoice-details">
          <div className="invoice-number">#{invoice.invoice_number}</div>
          <div className="invoice-date">
            Date: {new Date(invoice.invoice_date).toLocaleDateString("en-GB")}
          </div>
          {invoice.due_date && (
            <div className="invoice-date">
              Due: {new Date(invoice.due_date).toLocaleDateString("en-GB")}
            </div>
          )}
        </div>
      </div>

      {Object.entries(groupedLines).map(([category, categoryLines]) => (
        <div key={category} className="category-section">
          <div className="category-heading">{category}</div>
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: "24px" }}>#</th>
                <th>Product</th>
                <th style={{ width: "45px" }}>Size</th>
                <th style={{ width: "55px" }}>Colour</th>
                <th className="text-center" style={{ width: "50px" }}>Qty</th>
                <th className="text-right" style={{ width: "60px" }}>Price</th>
                <th className="text-right" style={{ width: "70px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {categoryLines.map((line, lineIdx) => (
                <tr key={line.id}>
                  <td className="text-center">{lineIdx + 1}</td>
                  <td>
                    {line.product_name}
                    {line.products?.product_code && (
                      <span className="product-code"> ({line.products.product_code})</span>
                    )}
                  </td>
                  <td>{line.size || "-"}</td>
                  <td>{line.colour || "-"}</td>
                  <td className="text-center">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="text-right">
                    {line.unit_price.toFixed(2)}
                  </td>
                  <td className="text-right">
                    {line.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
              {showDiscounts && calculateCategoryDiscount(categoryLines) > 0 && (
                <tr className="discount-row">
                  <td colSpan={6} style={{ textAlign: "right", paddingRight: "8px" }}>
                    Discount
                  </td>
                  <td className="text-right">
                    -{calculateCategoryDiscount(categoryLines).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}

      <div className="summary-footer">
        <div className="notes-section">
          {invoice.notes && (
            <>
              <div className="notes-title">Notes</div>
              <div className="notes-content">{invoice.notes}</div>
            </>
          )}
        </div>
        <div className="totals-section">
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="label">Subtotal:</td>
                <td className="value">LKR {invoice.subtotal.toFixed(2)}</td>
              </tr>
              {showDiscounts && invoice.discount_amount && invoice.discount_amount > 0 && (
                <tr>
                  <td className="label">Discount:</td>
                  <td className="value" style={{ color: "#c00" }}>
                    -LKR {invoice.discount_amount.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr className="grand-total-row">
                <td className="label">GRAND TOTAL:</td>
                <td className="value">LKR {invoice.grand_total.toFixed(2)}</td>
              </tr>
              {outstandingBalance > 0 && (
                <tr className="outstanding-row">
                  <td className="label">Outstanding:</td>
                  <td className="value">LKR {outstandingBalance.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td className="label">Items:</td>
                <td className="value">{totalItems}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer-section">
        <div className="thank-you">Thank You for Your Business!</div>
        <div className="footer-note">
          Invoice was created on the system and is valid without the signature and seal
        </div>
        <div className="powered-by">Developed and Powered by ZENTHOZ</div>
      </div>
    </div>
  );
}
