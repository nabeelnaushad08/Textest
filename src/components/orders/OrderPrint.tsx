import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PrintLogoHeader from "@/components/print/PrintLogoHeader";

interface OrderPrintProps {
  orderId: string;
}

interface OrderLine {
  id: string;
  product_name: string;
  size: string;
  colour: string;
  quantity: number;
  unit: string;
  unit_price: number;
  products?: {
    category: string;
    conversion_rates: any;
  };
}

interface ProductMatrix {
  [productKey: string]: {
    productName: string;
    sizes: {
      [size: string]: {
        quantity: number;
        unit: string;
      };
    };
  };
}

interface PriceGroup {
  sizes: string[];
  totalQty: number;
  unit: string;
}

export default function OrderPrint({ orderId }: OrderPrintProps) {
  const [order, setOrder] = useState<any>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId]);

  useEffect(() => {
    if (order && lines.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [order, lines]);

  const fetchOrderData = async () => {
    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*, customers(name, address, phone)")
        .eq("id", orderId)
        .single();

      const { data: linesData } = await supabase
        .from("order_lines")
        .select("*, products(category, conversion_rates)")
        .eq("order_id", orderId);

      if (orderData) setOrder(orderData);
      if (linesData) setLines(linesData);
    } catch (error) {
      console.error("Error fetching order:", error);
    }
  };

  const groupLinesByCategory = () => {
    const grouped: Record<string, OrderLine[]> = {};
    lines.forEach((line) => {
      const category = line.products?.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(line);
    });
    return grouped;
  };

  const buildProductMatrix = (categoryLines: OrderLine[]): ProductMatrix => {
    const matrix: ProductMatrix = {};
    
    categoryLines.forEach((line) => {
      // Create unique key combining product name and colour
      const productKey = `${line.product_name}${line.colour ? ` - ${line.colour}` : ''}`;
      
      if (!matrix[productKey]) {
        matrix[productKey] = {
          productName: productKey,
          sizes: {},
        };
      }
      
      const sizeKey = line.size || "Standard";
      matrix[productKey].sizes[sizeKey] = {
        quantity: line.quantity,
        unit: line.unit,
      };
    });
    
    return matrix;
  };

  const getAllSizes = (matrix: ProductMatrix): string[] => {
    const sizes = new Set<string>();
    Object.values(matrix).forEach((product) => {
      Object.keys(product.sizes).forEach((size) => sizes.add(size));
    });
    // Sort sizes in a meaningful way (S, M, L, XL, etc.)
    return Array.from(sizes).sort((a, b) => {
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const aIndex = order.indexOf(a.toUpperCase());
      const bIndex = order.indexOf(b.toUpperCase());
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const groupSizesByPrice = (categoryLines: OrderLine[], allSizes: string[]): PriceGroup[] => {
    // Group sizes by their price point
    const priceMap: Record<number, string[]> = {};
    
    categoryLines.forEach((line) => {
      const price = line.unit_price;
      const size = line.size || "Standard";
      
      if (!priceMap[price]) {
        priceMap[price] = [];
      }
      if (!priceMap[price].includes(size)) {
        priceMap[price].push(size);
      }
    });

    // Create price groups and calculate totals
    const groups: PriceGroup[] = [];
    
    Object.entries(priceMap).forEach(([price, sizes]) => {
      let totalQty = 0;
      let unit = "pcs";
      
      categoryLines.forEach((line) => {
        if (sizes.includes(line.size || "Standard")) {
          totalQty += line.quantity;
          unit = line.unit;
        }
      });
      
      groups.push({
        sizes: sizes.sort((a, b) => {
          const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
          const aIndex = order.indexOf(a.toUpperCase());
          const bIndex = order.indexOf(b.toUpperCase());
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.localeCompare(b);
        }),
        totalQty,
        unit,
      });
    });
    
    return groups;
  };

  if (!order) return <div className="p-8">Loading...</div>;

  const groupedLines = groupLinesByCategory();
  const categories = Object.keys(groupedLines);

  return (
    <>
      <style>{`
        @media print {
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          body { 
            margin: 0; 
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .category-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .category-page:last-child {
            page-break-after: auto;
          }
          table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 12px 0;
            font-size: 11px;
          }
          th, td { 
            border: 1.5px solid #222; 
            padding: 6px 8px; 
            text-align: center;
          }
          th { 
            background: #e8e8e8; 
            font-weight: bold;
            font-size: 10px;
          }
          td.product-name {
            text-align: left;
            font-weight: 500;
          }
          .header-section { 
            margin-bottom: 16px; 
            padding-bottom: 12px;
            border-bottom: 2px solid #333;
          }
          h1 { 
            font-size: 22px; 
            margin: 0 0 4px 0;
            font-weight: bold;
          }
          h2 { 
            font-size: 18px; 
            margin: 20px 0 12px 0; 
            padding: 6px 12px;
            background: #333;
            color: white;
            text-align: center;
          }
          h3 { 
            font-size: 12px; 
            margin: 0 0 8px 0;
            color: #666;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 11px;
            margin-top: 8px;
          }
          .info-label {
            font-weight: bold;
            display: inline-block;
            min-width: 80px;
          }
          .tick-box {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #000;
            margin-right: 6px;
            vertical-align: middle;
          }
          .qty-cell {
            font-weight: bold;
            font-size: 11px;
          }
          .notes-section {
            margin: 12px 0;
            padding: 8px;
            border: 1.5px solid #222;
            min-height: 50px;
          }
          .notes-label {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 4px;
          }
          .summary-table {
            margin-top: 12px;
            font-size: 11px;
          }
          .summary-table th {
            background: #f5f5f5;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 8px;
          }
        }
        @media screen {
          .print-container { 
            max-width: 210mm; 
            margin: 20px auto; 
            padding: 20px; 
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <div className="print-container">
        {categories.map((categoryName, catIndex) => {
          const categoryLines = groupedLines[categoryName];
          const matrix = buildProductMatrix(categoryLines);
          const allSizes = getAllSizes(matrix);
          const priceGroups = groupSizesByPrice(categoryLines, allSizes);
          const products = Object.values(matrix);

          return (
            <div key={categoryName} className="category-page">
              {/* Header only on first page */}
              {catIndex === 0 && (
                <div className="header-section">
                  <PrintLogoHeader title="TEXPRO Marketing" />
                  <h3>SALES ORDER</h3>
                  <div className="info-grid">
                    <div>
                      <span className="info-label">Customer:</span> {order.customers?.name}
                    </div>
                    <div>
                      <span className="info-label">Order #:</span> {order.order_number}
                    </div>
                    <div>
                      <span className="info-label">Date:</span> {new Date(order.order_date).toLocaleDateString('en-CA')}
                    </div>
                    <div>
                      <span className="info-label">Status:</span> {order.status}
                    </div>
                    {order.customers?.phone && (
                      <div>
                        <span className="info-label">Phone:</span> {order.customers.phone}
                      </div>
                    )}
                    {order.customers?.address && (
                      <div>
                        <span className="info-label">Address:</span> {order.customers.address}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category Name */}
              <h2>{categoryName}</h2>

              {/* Product Matrix Table */}
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40%", textAlign: "left" }}>Product Name</th>
                    {allSizes.map((size) => (
                      <th key={size} style={{ width: `${60 / allSizes.length}%` }}>{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => (
                    <tr key={idx}>
                      <td className="product-name">{product.productName}</td>
                      {allSizes.map((size) => {
                        const sizeData = product.sizes[size];
                        return (
                          <td key={size} className="qty-cell">
                            {sizeData ? (
                              <>
                                <span className="tick-box"></span>
                                {sizeData.quantity} {sizeData.unit}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Notes Section */}
              <div className="notes-section">
                <div className="notes-label">Notes:</div>
                <div style={{ minHeight: "30px" }}>
                  {order.notes || ""}
                </div>
              </div>

              {/* Summary Table - Grouped by Price */}
              <table className="summary-table">
                <thead>
                  <tr>
                    <th style={{ width: "30%", textAlign: "left" }}>Category</th>
                    {priceGroups.map((group, idx) => (
                      <th key={idx} style={{ width: `${70 / priceGroups.length}%` }}>
                        {group.sizes.join(" & ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "left", fontWeight: "bold" }}>{categoryName}</td>
                    {priceGroups.map((group, idx) => (
                      <td key={idx} style={{ fontWeight: "bold" }}>
                        {group.totalQty} {group.unit}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Footer on last page */}
        <div className="footer">
          Developed and Powered by ZENTHOZ | Contact: 0779484650 Naushad Zakeriya
        </div>
      </div>
    </>
  );
}
