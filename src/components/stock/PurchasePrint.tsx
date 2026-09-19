import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PurchasePrintProps {
  purchaseId: string;
}

export default function PurchasePrint({ purchaseId }: PurchasePrintProps) {
  const [purchase, setPurchase] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [supplier, setSupplier] = useState<any>(null);

  useEffect(() => {
    fetchPurchaseData();
  }, [purchaseId]);

  const fetchPurchaseData = async () => {
    try {
      const [purchaseRes, itemsRes] = await Promise.all([
        supabase
          .from("supplier_purchases")
          .select("*, suppliers(*)")
          .eq("id", purchaseId)
          .single(),
        supabase
          .from("supplier_purchase_items")
          .select("*, products(name, sku)")
          .eq("purchase_id", purchaseId),
      ]);

      if (purchaseRes.data) {
        setPurchase(purchaseRes.data);
        setSupplier(purchaseRes.data.suppliers);
      }

      if (itemsRes.data) {
        setItems(itemsRes.data);
      }
    } catch (error) {
      console.error("Error fetching purchase:", error);
    }
  };

  useEffect(() => {
    if (purchase && items.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [purchase, items]);

  if (!purchase) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading purchase details...</div>
      </div>
    );
  }

  return (
    <div className="print-container mx-auto max-w-4xl p-8 bg-white text-black">
      <style>
        {`
          @media print {
            body { margin: 0; }
            .print-container { padding: 20px; }
            @page { margin: 15mm; }
          }
        `}
      </style>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">PURCHASE ORDER</h1>
        <div className="text-lg">TEXPRO Marketing</div>
        <div className="text-sm text-gray-600 mt-1">Contact: 0779484650 Naushad Zakeriya</div>
      </div>

      {/* Purchase Details */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-2 border-b pb-1">Supplier Details</h2>
          <div className="space-y-1 text-sm">
            <div><strong>Name:</strong> {supplier?.name}</div>
            <div><strong>Contact:</strong> {supplier?.contact_person || "-"}</div>
            <div><strong>Phone:</strong> {supplier?.phone || "-"}</div>
            <div><strong>Email:</strong> {supplier?.email || "-"}</div>
            <div><strong>Address:</strong> {supplier?.address || "-"}</div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2 border-b pb-1">Purchase Information</h2>
          <div className="space-y-1 text-sm">
            <div><strong>Invoice Number:</strong> {purchase.invoice_number}</div>
            <div><strong>Purchase Date:</strong> {new Date(purchase.purchase_date).toLocaleDateString()}</div>
            {purchase.due_date && (
              <div><strong>Due Date:</strong> {new Date(purchase.due_date).toLocaleDateString()}</div>
            )}
            <div><strong>Payment Status:</strong> {purchase.payment_status.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">S/N</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">Product Name</th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm">SKU</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm">Quantity</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm">Unit</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-sm">Unit Price</th>
              <th className="border border-gray-300 px-3 py-2 text-right text-sm">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm">{item.products?.name || "-"}</td>
                <td className="border border-gray-300 px-3 py-2 text-sm font-mono">{item.products?.sku || "-"}</td>
                <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantity}</td>
                <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.unit}</td>
                <td className="border border-gray-300 px-3 py-2 text-right text-sm">
                  LKR {item.unit_price.toFixed(2)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">
                  LKR {item.line_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="font-semibold">Subtotal:</span>
              <span>LKR {purchase.subtotal.toFixed(2)}</span>
            </div>
            {purchase.freight > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span className="font-semibold">Freight/Shipping:</span>
                <span>LKR {purchase.freight.toFixed(2)}</span>
              </div>
            )}
            {purchase.tax_amount > 0 && (
              <div className="flex justify-between py-1 border-b">
                <span className="font-semibold">Tax:</span>
                <span>LKR {purchase.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-gray-800 text-lg">
              <span className="font-bold">Grand Total:</span>
              <span className="font-bold">LKR {purchase.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold">Paid Amount:</span>
              <span className="text-green-600 font-semibold">
                LKR {(purchase.paid_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold">Balance Due:</span>
              <span className="text-red-600 font-bold">
                LKR {(purchase.total - (purchase.paid_amount || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-1">Notes:</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{purchase.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t text-center">
        <p className="text-sm font-semibold mb-1">Thank You for Your Business</p>
        <p className="text-xs text-gray-500">
          Purchase order created on {new Date(purchase.created_at).toLocaleString()}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Developed and Powered by ZENTHOZ
        </p>
      </div>
    </div>
  );
}