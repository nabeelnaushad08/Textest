import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  DEFAULT_GRID_LAYOUTS,
  GridLayout,
  loadGridLayouts,
  saveGridLayouts,
} from "@/lib/gridLayouts";
import { supabase } from "@/integrations/supabase/client";

const linesToArray = (v: string) =>
  v.split("\n").map((s) => s.trim()).filter(Boolean);

export default function OrderFormGridsAdmin() {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<GridLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGridLayouts()
      .then(setLayouts)
      .finally(() => setLoading(false));
  }, []);

  const update = (id: string, patch: Partial<GridLayout>) =>
    setLayouts((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGridLayouts(layouts);
      await supabase.from("audit_logs").insert({
        action: "update",
        table_name: "system_settings",
        new_value: { setting: "order_grid_layouts", grids: layouts.length } as any,
      });
      toast({ title: "Grid layouts saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addLayout = () =>
    setLayouts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: "",
        name: "New Grid",
        rowHeader: "Colour",
        rows: [],
        columns: [],
        summaryGroups: [],
        unit: "dozen",
        isActive: true,
      },
    ]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Order Form Grids</h3>
          <p className="text-sm text-muted-foreground">
            Configure the fast grid used when creating orders and invoices.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLayouts(DEFAULT_GRID_LAYOUTS)}>
            Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={addLayout}>
            <Plus className="mr-2 h-4 w-4" /> Add grid
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {layouts.map((l) => (
        <Card key={l.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{l.name || "Untitled grid"}</CardTitle>
                <CardDescription>Category: {l.category || "not set"}</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={l.isActive !== false}
                    onCheckedChange={(v) => update(l.id, { isActive: v })}
                  />
                  <Label className="text-sm">Active</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLayouts((p) => p.filter((x) => x.id !== l.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>Grid name</Label>
                <Input value={l.name} onChange={(e) => update(l.id, { name: e.target.value })} />
              </div>
              <div>
                <Label>Product category</Label>
                <Input
                  value={l.category}
                  onChange={(e) => update(l.id, { category: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Row header</Label>
                  <Input
                    value={l.rowHeader}
                    onChange={(e) => update(l.id, { rowHeader: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input value={l.unit} onChange={(e) => update(l.id, { unit: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Rows (one per line)</Label>
                <Textarea
                  rows={6}
                  value={l.rows.join("\n")}
                  onChange={(e) => update(l.id, { rows: linesToArray(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Columns — one per line as "Label = size1, size2"</Label>
                <Textarea
                  rows={5}
                  value={l.columns
                    .map((c) => `${c.label} = ${c.sizes.join(", ")}`)
                    .join("\n")}
                  onChange={(e) =>
                    update(l.id, {
                      columns: linesToArray(e.target.value).map((line) => {
                        const [label, sizes = ""] = line.split("=");
                        return {
                          label: label.trim(),
                          sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
                        };
                      }),
                    })
                  }
                />
              </div>
              <div>
                <Label>Summary groups — "Label = row1, row2"</Label>
                <Textarea
                  rows={5}
                  value={(l.summaryGroups || [])
                    .map((g) => `${g.label} = ${g.rows.join(", ")}`)
                    .join("\n")}
                  onChange={(e) =>
                    update(l.id, {
                      summaryGroups: linesToArray(e.target.value).map((line) => {
                        const [label, rows = ""] = line.split("=");
                        return {
                          label: label.trim(),
                          rows: rows.split(",").map((s) => s.trim()).filter(Boolean),
                        };
                      }),
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
