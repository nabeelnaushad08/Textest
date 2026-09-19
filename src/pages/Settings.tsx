import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings as SettingsIcon, RotateCcw, Plus, Trash2, Pencil, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sequences, setSequences] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [unitTypes, setUnitTypes] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [editingUnit, setEditingUnit] = useState<{ id: string; name: string; symbol: string; conversion_to_pcs: number } | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newUnit, setNewUnit] = useState({ name: "", symbol: "", conversion_to_pcs: "1" });
  const [invoiceFooter, setInvoiceFooter] = useState("Developed and Powered by ZENTHOZ");
  const [resetDialog, setResetDialog] = useState<{ open: boolean; type: string; currentNumber: number }>({
    open: false,
    type: "",
    currentNumber: 0
  });
  const [newSequenceNumber, setNewSequenceNumber] = useState("");

  useEffect(() => {
    fetchSequences();
    fetchProductTypes();
    fetchUnitTypes();
    fetchSystemSettings();
  }, []);

  const fetchSequences = async () => {
    try {
      const { data, error } = await supabase
        .from("numbering_sequences")
        .select("*")
        .order("sequence_type");

      if (error) throw error;
      setSequences(data || []);
    } catch (error) {
      console.error("Error fetching sequences:", error);
    }
  };

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("product_types")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProductTypes(data || []);
    } catch (error) {
      console.error("Error fetching product types:", error);
    }
  };

  const fetchUnitTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("unit_types")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setUnitTypes(data || []);
    } catch (error) {
      console.error("Error fetching unit types:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*");

      if (error) throw error;
      setSystemSettings(data || []);
      
      // Set invoice footer from settings
      const footerSetting = data?.find(s => s.setting_key === "invoice_footer");
      if (footerSetting) {
        setInvoiceFooter(footerSetting.setting_value || "");
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const handleAddProductType = async () => {
    if (!newTypeName.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("product_types")
        .insert({
          name: newTypeName.trim(),
          display_order: productTypes.length,
          is_active: true
        });

      if (error) throw error;

      toast({ title: "Product type created successfully" });
      setNewTypeName("");
      fetchProductTypes();
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

  const handleUpdateProductType = async (id: string, name: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("product_types")
        .update({ name: name.trim() })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Product type updated successfully" });
      setEditingType(null);
      fetchProductTypes();
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

  const handleDeleteProductType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Products with this type will need to be reassigned.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("product_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Product type deleted successfully" });
      fetchProductTypes();
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

  const handleAddUnitType = async () => {
    if (!newUnit.name.trim() || !newUnit.symbol.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("unit_types")
        .insert({
          name: newUnit.name.trim(),
          symbol: newUnit.symbol.trim(),
          conversion_to_pcs: parseFloat(newUnit.conversion_to_pcs) || 1,
          display_order: unitTypes.length,
          is_active: true
        });

      if (error) throw error;

      toast({ title: "Unit type created successfully" });
      setNewUnit({ name: "", symbol: "", conversion_to_pcs: "1" });
      fetchUnitTypes();
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

  const handleUpdateUnitType = async () => {
    if (!editingUnit) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("unit_types")
        .update({
          name: editingUnit.name.trim(),
          symbol: editingUnit.symbol.trim(),
          conversion_to_pcs: editingUnit.conversion_to_pcs
        })
        .eq("id", editingUnit.id);

      if (error) throw error;

      toast({ title: "Unit type updated successfully" });
      setEditingUnit(null);
      fetchUnitTypes();
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

  const handleDeleteUnitType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("unit_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Unit type deleted successfully" });
      fetchUnitTypes();
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

  const handleSaveInvoiceFooter = async () => {
    setLoading(true);
    try {
      const existingSetting = systemSettings.find(s => s.setting_key === "invoice_footer");
      
      if (existingSetting) {
        const { error } = await supabase
          .from("system_settings")
          .update({ setting_value: invoiceFooter })
          .eq("id", existingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({
            setting_key: "invoice_footer",
            setting_value: invoiceFooter,
            setting_type: "string",
            description: "Footer text displayed on printed invoices"
          });
        if (error) throw error;
      }

      toast({ title: "Invoice footer saved successfully" });
      fetchSystemSettings();
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

  const handleResetSequence = async () => {
    if (!resetDialog.type) return;

    setLoading(true);
    try {
      const newNumber = parseInt(newSequenceNumber) || 0;
      
      // Update sequence
      const { error: updateError } = await supabase
        .from("numbering_sequences")
        .update({
          current_number: newNumber,
          updated_at: new Date().toISOString()
        })
        .eq("sequence_type", resetDialog.type);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from("audit_logs").insert({
        table_name: "numbering_sequences",
        action: "RESET",
        old_value: { current_number: resetDialog.currentNumber },
        new_value: { current_number: newNumber },
      });

      toast({ 
        title: "Sequence Reset Successfully",
        description: `${resetDialog.type} numbering has been reset to ${newNumber}`
      });

      fetchSequences();
      setResetDialog({ open: false, type: "", currentNumber: 0 });
      setNewSequenceNumber("");
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

  const openResetDialog = (type: string, currentNumber: number) => {
    setResetDialog({ open: true, type, currentNumber });
    setNewSequenceNumber(currentNumber.toString());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage system configuration and numbering sequences</p>
        </div>
        <SettingsIcon className="h-8 w-8 text-muted-foreground hidden sm:block" />
      </div>

      {/* Unit Types Management */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Types</CardTitle>
          <CardDescription>
            Manage unit types used throughout the system (e.g., pcs, dozen, half-dozen)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input
              placeholder="Unit name (e.g., Dozen)"
              value={newUnit.name}
              onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
            />
            <Input
              placeholder="Symbol (e.g., dz)"
              value={newUnit.symbol}
              onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Conversion to pcs"
              value={newUnit.conversion_to_pcs}
              onChange={(e) => setNewUnit({ ...newUnit, conversion_to_pcs: e.target.value })}
            />
            <Button onClick={handleAddUnitType} disabled={loading || !newUnit.name.trim() || !newUnit.symbol.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>

          <div className="space-y-2">
            {unitTypes.map((unit) => (
              <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                {editingUnit?.id === unit.id ? (
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <Input
                      value={editingUnit.name}
                      onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Input
                      value={editingUnit.symbol}
                      onChange={(e) => setEditingUnit({ ...editingUnit, symbol: e.target.value })}
                      placeholder="Symbol"
                      className="w-full sm:w-24"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={editingUnit.conversion_to_pcs}
                      onChange={(e) => setEditingUnit({ ...editingUnit, conversion_to_pcs: parseFloat(e.target.value) })}
                      placeholder="Rate"
                      className="w-full sm:w-24"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="font-medium">{unit.name}</span>
                    <span className="text-muted-foreground ml-2">({unit.symbol})</span>
                    <span className="text-sm text-muted-foreground ml-2">= {unit.conversion_to_pcs} pcs</span>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  {editingUnit?.id === unit.id ? (
                    <>
                      <Button size="sm" onClick={handleUpdateUnitType} disabled={loading}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingUnit(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingUnit({ 
                        id: unit.id, 
                        name: unit.name, 
                        symbol: unit.symbol, 
                        conversion_to_pcs: unit.conversion_to_pcs 
                      })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteUnitType(unit.id, unit.name)} disabled={loading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sequential Numbering</CardTitle>
          <CardDescription>
            Manage order and invoice numbering sequences. Resetting sequences will affect future orders/invoices; previous numbers are unchanged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sequences.map((seq) => (
            <div key={seq.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg capitalize">{seq.sequence_type} Numbers</h3>
                <p className="text-sm text-muted-foreground">
                  Pattern: <code className="bg-muted px-2 py-1 rounded text-xs">{seq.pattern}</code>
                </p>
                <p className="text-sm mt-1">
                  Current: <strong>{seq.prefix}-{seq.current_year}-{String(seq.current_number).padStart(5, '0')}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Next number will be: <strong>{seq.current_number + 1}</strong>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openResetDialog(seq.sequence_type, seq.current_number)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Categories / Types</CardTitle>
          <CardDescription>
            Manage product categories that appear in tabs and product selection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="New category name (e.g., Socks, Shirts)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddProductType()}
              className="flex-1"
            />
            <Button onClick={handleAddProductType} disabled={loading || !newTypeName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {productTypes.map((type) => (
              <div key={type.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                {editingType?.id === type.id ? (
                  <Input
                    value={editingType.name}
                    onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateProductType(type.id, editingType.name);
                      if (e.key === "Escape") setEditingType(null);
                    }}
                    autoFocus
                    className="flex-1"
                  />
                ) : (
                  <span className="font-medium">{type.name}</span>
                )}
                <div className="flex gap-2 justify-end">
                  {editingType?.id === type.id ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdateProductType(type.id, editingType.name)} disabled={loading}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingType(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditingType({ id: type.id, name: type.name })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteProductType(type.id, type.name)} disabled={loading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Template Settings</CardTitle>
          <CardDescription>
            Customize invoice print templates and footer text
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Invoice Footer Text</Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input 
                  placeholder="Enter footer text" 
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveInvoiceFooter} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This text will be shown at the footer of all printed invoices
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={resetDialog.open} onOpenChange={(open) => setResetDialog({ ...resetDialog, open })}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Sequence Number</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reset the {resetDialog.type} numbering sequence. This will change the next generated number.
              Previous {resetDialog.type}s will keep their existing numbers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="newNumber">New Sequence Number</Label>
            <Input
              id="newNumber"
              type="number"
              value={newSequenceNumber}
              onChange={(e) => setNewSequenceNumber(e.target.value)}
              placeholder="Enter new sequence number"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Current: {resetDialog.currentNumber} → New: {newSequenceNumber || "0"}
            </p>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSequence} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
