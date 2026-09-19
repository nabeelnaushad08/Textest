import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  GridLayout,
  findCellProduct,
  loadGridLayouts,
} from "@/lib/gridLayouts";
import { PriceRule, colourGroupForRow, loadPriceRules, resolvePrice } from "@/lib/pricing";
import { convertToBaseUnits } from "@/lib/units";
import { useUnitTypes } from "@/hooks/useUnitTypes";

export interface GridEntryLine {
  product_id: string;
  product_name: string;
  size: string;
  colour: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface GridEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: any[];
  customerId?: string | null;
  /** Overrides the unit configured on each layout (global unit of the form) */
  unit?: string;
  /** "sell" uses price rules / selling price, "cost" uses the product cost price */
  priceMode?: "sell" | "cost";
  onApply: (lines: GridEntryLine[]) => void;
}

export default function GridEntryDialog({
  open,
  onOpenChange,
  products,
  customerId,
  unit,
  priceMode = "sell",
  onApply,
}: GridEntryDialogProps) {
  const { toast } = useToast();
  const { unitTypes } = useUnitTypes();
  const [layouts, setLayouts] = useState<GridLayout[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(false);
  /** key = `${layoutId}|${row}|${columnLabel}` */
  const [values, setValues] = useState<Record<string, number>>({});
  const gridRef = useRef<HTMLDivElement>(null);
  const unitFor = (l?: GridLayout) => unit || l?.unit || "dozen";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([loadGridLayouts(), loadPriceRules()])
      .then(([l, r]) => {
        const active = l.filter((x) => x.isActive !== false);
        setLayouts(active);
        setRules(r);
        if (active.length) setActiveId((prev) => prev || active[0].id);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const layout = layouts.find((l) => l.id === activeId);

  const cellKey = (layoutId: string, row: string, col: string) =>
    `${layoutId}|${row}|${col}`;

  const priceFor = (l: GridLayout, row: string, colLabel: string, product: any) => {
    if (priceMode === "cost") return Number(product?.cost_price) || 0;
    const group = (l.sizeGroups || []).find((g) => g.columns.includes(colLabel));
    return resolvePrice({
      rules,
      category: l.category,
      sizeGroup: group?.label || colLabel,
      colourGroup: colourGroupForRow(row, l.summaryGroups || []),
      customerId: customerId || null,
      fallbackPrice: Number(product?.selling_price) || 0,
    });
  };

  const totals = useMemo(() => {
    if (!layout)
      return {
        columns: {} as Record<string, number>,
        grand: 0,
        summary: {} as Record<string, number>,
        sizeGroups: {} as Record<string, number>,
      };
    const columns: Record<string, number> = {};
    const summary: Record<string, number> = {};
    const sizeGroups: Record<string, number> = {};
    let grand = 0;
    for (const row of layout.rows) {
      for (const col of layout.columns) {
        const qty = values[cellKey(layout.id, row, col.label)] || 0;
        if (!qty) continue;
        columns[col.label] = (columns[col.label] || 0) + qty;
        grand += qty;
        const group = colourGroupForRow(row, layout.summaryGroups || []);
        if (group) summary[group] = (summary[group] || 0) + qty;
        const sg = (layout.sizeGroups || []).find((g) => g.columns.includes(col.label));
        if (sg) sizeGroups[sg.label] = (sizeGroups[sg.label] || 0) + qty;
      }
    }
    return { columns, grand, summary, sizeGroups };
  }, [values, layout]);

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    const move = (r: number, c: number) => {
      const next = gridRef.current?.querySelector<HTMLInputElement>(
        `input[data-cell="${r}-${c}"]`
      );
      if (next) {
        e.preventDefault();
        next.focus();
        next.select();
      }
    };
    if (e.key === "ArrowDown" || e.key === "Enter") move(rowIdx + 1, colIdx);
    else if (e.key === "ArrowUp") move(rowIdx - 1, colIdx);
    else if (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart ===
      (e.target as HTMLInputElement).value.length) move(rowIdx, colIdx + 1);
    else if (e.key === "ArrowLeft" && (e.target as HTMLInputElement).selectionStart === 0)
      move(rowIdx, colIdx - 1);
  };

  const handleApply = () => {
    const lines: GridEntryLine[] = [];
    for (const l of layouts) {
      for (const row of l.rows) {
        for (const col of l.columns) {
          const qty = values[cellKey(l.id, row, col.label)] || 0;
          if (!qty) continue;
          const product = findCellProduct(products, l, row, col);
          if (!product) continue;
          lines.push({
            product_id: product.id,
            product_name: product.name,
            size: product.size || "",
            colour: product.colour || "",
            quantity: qty,
            unit: unitFor(l),
            unit_price: priceFor(l, row, col.label, product),
          });
        }
      }
    }

    if (!lines.length) {
      toast({
        title: "Nothing to add",
        description: "Enter at least one quantity in the grid.",
        variant: "destructive",
      });
      return;
    }

    onApply(lines);
    setValues({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Grid Entry
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : layouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No grids configured yet. Add them in the Admin Panel under Order Form Grids.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 sticky top-0 bg-background z-20 py-1">
                {layouts.map((l) => (
                  <Button
                    key={l.id}
                    type="button"
                    size="sm"
                    variant={l.id === activeId ? "default" : "outline"}
                    onClick={() => setActiveId(l.id)}
                  >
                    {l.name}
                  </Button>
                ))}
              </div>

              {layout && (
                <div ref={gridRef} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Quantities are in <strong>{unitFor(layout)}</strong>. Decimals such as 0.5 are
                    allowed. Use the arrow keys or Enter to move between boxes.
                  </p>
                  <div className="border rounded-lg overflow-auto max-h-[45vh]">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-10 bg-muted">
                        <tr>
                          <th className="p-2 text-left sticky left-0 bg-muted z-20 min-w-[140px]">
                            {layout.rowHeader}
                          </th>
                          {layout.columns.map((c) => (
                            <th key={c.label} className="p-2 text-center min-w-[80px]">
                              {c.label}
                            </th>
                          ))}
                          <th className="p-2 text-right min-w-[70px]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {layout.rows.map((row, rIdx) => {
                          const rowTotal = layout.columns.reduce(
                            (s, c) => s + (values[cellKey(layout.id, row, c.label)] || 0),
                            0
                          );
                          return (
                            <tr key={row} className="border-t">
                              <td className="p-2 sticky left-0 bg-background z-10 font-medium whitespace-nowrap">
                                {row}
                              </td>
                              {layout.columns.map((col, cIdx) => {
                                const product = findCellProduct(products, layout, row, col);
                                const key = cellKey(layout.id, row, col.label);
                                return (
                                  <td key={col.label} className="p-1 text-center">
                                    <Input
                                      data-cell={`${rIdx}-${cIdx}`}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      disabled={!product}
                                      title={
                                        product
                                          ? `${product.name} — ${priceFor(
                                              layout,
                                              row,
                                              col.label,
                                              product
                                            ).toFixed(2)} / ${unitFor(layout)}`
                                          : "No matching product"
                                      }
                                      value={values[key] ?? ""}
                                      onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                      onChange={(e) =>
                                        setValues((prev) => ({
                                          ...prev,
                                          [key]: parseFloat(e.target.value) || 0,
                                        }))
                                      }
                                      className="h-8 w-full min-w-[64px] text-center text-sm"
                                      placeholder="0"
                                    />
                                  </td>
                                );
                              })}
                              <td className="p-2 text-right font-medium">
                                {rowTotal ? rowTotal.toFixed(2) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/50">
                        <tr className="border-t">
                          <td className="p-2 sticky left-0 bg-muted/50 font-semibold">Total</td>
                          {layout.columns.map((c) => (
                            <td key={c.label} className="p-2 text-center font-semibold">
                              {(totals.columns[c.label] || 0).toFixed(2)}
                            </td>
                          ))}
                          <td className="p-2 text-right font-bold">{totals.grand.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {(layout.sizeGroups || []).length > 0 && (
                    <div className="rounded-lg border p-3">
                      <Label className="text-xs text-muted-foreground">
                        Combined size totals (as shown on the order / invoice)
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {layout.sizeGroups!.map((g) => (
                          <div key={g.label} className="rounded border px-3 py-1 text-sm">
                            <span className="font-medium">{g.label}</span>:{" "}
                            {(totals.sizeGroups[g.label] || 0).toFixed(2)} {unitFor(layout)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(layout.summaryGroups || []).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {layout.summaryGroups.map((g) => (
                        <div key={g.label} className="rounded-lg border p-3">
                          <Label className="text-xs text-muted-foreground">{g.label}</Label>
                          <p className="text-lg font-semibold">
                            {(totals.summary[g.label] || 0).toFixed(2)} {unitFor(layout)}
                          </p>
                        </div>
                      ))}
                      <div className="rounded-lg border p-3 bg-muted/40">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <p className="text-lg font-semibold">
                          {totals.grand.toFixed(2)} {unitFor(layout)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {convertToBaseUnits(totals.grand, unitFor(layout), null, unitTypes)} pcs
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={loading}>
            Add to lines
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
