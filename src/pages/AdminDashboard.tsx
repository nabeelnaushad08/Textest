import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import OrderFormGridsAdmin from "@/components/admin/OrderFormGridsAdmin";
import PriceListsAdmin from "@/components/admin/PriceListsAdmin";
import {
  LayoutGrid,
  Tags,
  Shield,
  Users,
  Settings,
  LogOut,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  RotateCcw,
  FileText,
  Ruler,
  Home,
} from "lucide-react";

const PAGES = [
  { path: "/", label: "Dashboard" },
  { path: "/products", label: "Products" },
  { path: "/suppliers", label: "Suppliers" },
  { path: "/customers", label: "Customers" },
  { path: "/orders", label: "Orders" },
  { path: "/invoices", label: "Invoices" },
  { path: "/stock", label: "Stock" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userAccess, setUserAccess] = useState<Record<string, { view: boolean; edit: boolean; delete: boolean }>>({});

  // New user form
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "sales" as const,
  });

  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [sequences, setSequences] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [unitTypes, setUnitTypes] = useState<any[]>([]);
  
  // Form states
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");
  const [newUnitConversion, setNewUnitConversion] = useState("1");
  const [editingUnit, setEditingUnit] = useState<any>(null);
  
  // Dialog states
  const [resetDialog, setResetDialog] = useState<{ open: boolean; type: string; currentNumber: number }>({
    open: false, type: "", currentNumber: 0
  });
  const [newSequenceNumber, setNewSequenceNumber] = useState("");
  const [deleteUserDialog, setDeleteUserDialog] = useState<{ open: boolean; user: any }>({ open: false, user: null });

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin) {
      toast({ title: "Access Denied", description: "Admin access required", variant: "destructive" });
      navigate("/");
      return;
    }
    
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    await Promise.all([
      fetchUsers(),
      fetchSettings(),
      fetchSequences(),
      fetchProductTypes(),
      fetchUnitTypes(),
    ]);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("system_users")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUsers(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("system_settings").select("*");
    if (data) {
      const settingsMap: Record<string, string> = {};
      data.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      setSettings(settingsMap);
    }
  };

  const fetchSequences = async () => {
    const { data } = await supabase.from("numbering_sequences").select("*").order("sequence_type");
    if (data) setSequences(data);
  };

  const fetchProductTypes = async () => {
    const { data } = await supabase.from("product_types").select("*").order("display_order");
    if (data) setProductTypes(data);
  };

  const fetchUnitTypes = async () => {
    const { data } = await supabase.from("unit_types").select("*").order("display_order");
    if (data) setUnitTypes(data);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.full_name.trim()) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("system_users").insert({
        username: newUserForm.username.trim(),
        password_hash: newUserForm.password,
        full_name: newUserForm.full_name.trim(),
        role: newUserForm.role,
        is_active: true,
        can_access_pages: [],
      });

      if (error) throw error;

      toast({ title: "User created successfully" });
      setNewUserForm({ username: "", password: "", full_name: "", role: "sales" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    setLoading(true);
    try {
      await supabase
        .from("system_users")
        .update({ role: role as any })
        .eq("id", userId);
      
      toast({ title: "User role updated" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserActive = async (userId: string, isActive: boolean) => {
    setLoading(true);
    try {
      await supabase
        .from("system_users")
        .update({ is_active: !isActive })
        .eq("id", userId);
      
      toast({ title: isActive ? "User deactivated" : "User activated" });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserDialog.user) return;
    setLoading(true);
    try {
      await supabase
        .from("system_users")
        .delete()
        .eq("id", deleteUserDialog.user.id);
      
      toast({ title: "User deleted successfully" });
      setDeleteUserDialog({ open: false, user: null });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await supabase
        .from("system_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq("setting_key", key);
      
      setSettings({ ...settings, [key]: value });
      toast({ title: "Setting updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Product Types handlers
  const handleAddProductType = async () => {
    if (!newTypeName.trim()) return;
    setLoading(true);
    try {
      await supabase.from("product_types").insert({
        name: newTypeName.trim(),
        display_order: productTypes.length,
        is_active: true,
      });
      toast({ title: "Product type created" });
      setNewTypeName("");
      fetchProductTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProductType = async (id: string, name: string) => {
    setLoading(true);
    try {
      await supabase.from("product_types").update({ name: name.trim() }).eq("id", id);
      toast({ title: "Product type updated" });
      setEditingType(null);
      fetchProductTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProductType = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Products with this type will need reassignment.`)) return;
    setLoading(true);
    try {
      await supabase.from("product_types").delete().eq("id", id);
      toast({ title: "Product type deleted" });
      fetchProductTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Unit Types handlers
  const handleAddUnitType = async () => {
    if (!newUnitName.trim() || !newUnitSymbol.trim()) return;
    setLoading(true);
    try {
      await supabase.from("unit_types").insert({
        name: newUnitName.trim(),
        symbol: newUnitSymbol.trim(),
        conversion_to_pcs: parseFloat(newUnitConversion) || 1,
        display_order: unitTypes.length,
        is_active: true,
      });
      toast({ title: "Unit type created" });
      setNewUnitName("");
      setNewUnitSymbol("");
      setNewUnitConversion("1");
      fetchUnitTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUnitType = async () => {
    if (!editingUnit) return;
    setLoading(true);
    try {
      await supabase
        .from("unit_types")
        .update({
          name: editingUnit.name,
          symbol: editingUnit.symbol,
          conversion_to_pcs: editingUnit.conversion_to_pcs,
        })
        .eq("id", editingUnit.id);
      toast({ title: "Unit type updated" });
      setEditingUnit(null);
      fetchUnitTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnitType = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setLoading(true);
    try {
      await supabase.from("unit_types").delete().eq("id", id);
      toast({ title: "Unit type deleted" });
      fetchUnitTypes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Sequence handlers
  const openResetDialog = (type: string, currentNumber: number) => {
    setResetDialog({ open: true, type, currentNumber });
    setNewSequenceNumber(currentNumber.toString());
  };

  const handleResetSequence = async () => {
    if (!resetDialog.type) return;
    setLoading(true);
    try {
      const newNumber = parseInt(newSequenceNumber) || 0;
      await supabase
        .from("numbering_sequences")
        .update({ current_number: newNumber, updated_at: new Date().toISOString() })
        .eq("sequence_type", resetDialog.type);

      await supabase.from("audit_logs").insert({
        table_name: "numbering_sequences",
        action: "RESET",
        old_value: { current_number: resetDialog.currentNumber },
        new_value: { current_number: newNumber },
      });

      toast({ title: "Sequence reset successfully" });
      fetchSequences();
      setResetDialog({ open: false, type: "", currentNumber: 0 });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">System Administration</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to App
              </Link>
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 h-auto">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">User Management</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">System Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
              <span className="sm:hidden">Types</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              <span className="hidden sm:inline">Unit Types</span>
              <span className="sm:hidden">Units</span>
            </TabsTrigger>
            <TabsTrigger value="grids" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Order Form Grids</span>
              <span className="sm:hidden">Grids</span>
            </TabsTrigger>
            <TabsTrigger value="prices" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Price Lists</span>
              <span className="sm:hidden">Prices</span>
            </TabsTrigger>
          </TabsList>


          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Add New User */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New User
                </CardTitle>
                <CardDescription>Create a new system user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      placeholder="username"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Full Name"
                      value={newUserForm.full_name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={newUserForm.role}
                      onValueChange={(value: any) => setNewUserForm({ ...newUserForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  className="mt-4" 
                  onClick={handleCreateUser} 
                  disabled={loading || !newUserForm.username.trim() || !newUserForm.password.trim()}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </CardContent>
            </Card>

            {/* All Users */}
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage user roles and access</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{u.full_name}</p>
                            {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {u.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleUpdateUserRole(u.id, value)}
                            disabled={u.username === "Nabeel"}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="sales">Sales</SelectItem>
                              <SelectItem value="warehouse">Warehouse</SelectItem>
                              <SelectItem value="accountant">Accountant</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant={u.is_active ? "outline" : "default"}
                            onClick={() => handleToggleUserActive(u.id, u.is_active)}
                            disabled={u.username === "Nabeel"}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteUserDialog({ open: true, user: u })}
                            disabled={u.username === "Nabeel"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Company Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Company details displayed on documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={settings.company_name || ""}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      onBlur={() => handleUpdateSetting("company_name", settings.company_name)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Information</Label>
                    <Input
                      value={settings.company_contact || ""}
                      onChange={(e) => setSettings({ ...settings, company_contact: e.target.value })}
                      onBlur={() => handleUpdateSetting("company_contact", settings.company_contact)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>Customize invoice templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invoice Footer Text</Label>
                  <Textarea
                    value={settings.invoice_footer_text || ""}
                    onChange={(e) => setSettings({ ...settings, invoice_footer_text: e.target.value })}
                    onBlur={() => handleUpdateSetting("invoice_footer_text", settings.invoice_footer_text)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Validity Text</Label>
                  <Textarea
                    value={settings.invoice_validity_text || ""}
                    onChange={(e) => setSettings({ ...settings, invoice_validity_text: e.target.value })}
                    onBlur={() => handleUpdateSetting("invoice_validity_text", settings.invoice_validity_text)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Numbering Sequences */}
            <Card>
              <CardHeader>
                <CardTitle>Sequential Numbering</CardTitle>
                <CardDescription>Manage order and invoice numbering</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sequences.map((seq) => (
                  <div key={seq.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                    <div>
                      <h3 className="font-semibold capitalize">{seq.sequence_type} Numbers</h3>
                      <p className="text-sm text-muted-foreground">Pattern: {seq.pattern}</p>
                      <p className="text-sm">
                        Current: <strong>{seq.prefix}-{seq.current_year}-{String(seq.current_number).padStart(5, "0")}</strong>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openResetDialog(seq.sequence_type, seq.current_number)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Categories / Types</CardTitle>
                <CardDescription>Manage product categories</CardDescription>
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

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {productTypes.map((type) => (
                      <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                        {editingType?.id === type.id ? (
                          <Input
                            value={editingType.name}
                            onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateProductType(type.id, editingType.name);
                              if (e.key === "Escape") setEditingType(null);
                            }}
                            autoFocus
                            className="flex-1 mr-2"
                          />
                        ) : (
                          <span className="font-medium">{type.name}</span>
                        )}
                        <div className="flex gap-2">
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
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteProductType(type.id, type.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unit Types Tab */}
          <TabsContent value="units" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Unit Types</CardTitle>
                <CardDescription>Manage measurement units used throughout the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input
                    placeholder="Unit name (e.g., Dozen)"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                  />
                  <Input
                    placeholder="Symbol (e.g., dozen)"
                    value={newUnitSymbol}
                    onChange={(e) => setNewUnitSymbol(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Conversion to pcs"
                    value={newUnitConversion}
                    onChange={(e) => setNewUnitConversion(e.target.value)}
                  />
                  <Button onClick={handleAddUnitType} disabled={loading || !newUnitName.trim() || !newUnitSymbol.trim()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {unitTypes.map((unit) => (
                      <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                        {editingUnit?.id === unit.id ? (
                          <div className="flex flex-1 gap-2 flex-wrap">
                            <Input
                              value={editingUnit.name}
                              onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                              className="flex-1 min-w-[100px]"
                            />
                            <Input
                              value={editingUnit.symbol}
                              onChange={(e) => setEditingUnit({ ...editingUnit, symbol: e.target.value })}
                              className="w-24"
                            />
                            <Input
                              type="number"
                              value={editingUnit.conversion_to_pcs}
                              onChange={(e) => setEditingUnit({ ...editingUnit, conversion_to_pcs: parseFloat(e.target.value) || 1 })}
                              className="w-24"
                            />
                          </div>
                        ) : (
                          <div className="flex-1">
                            <span className="font-medium">{unit.name}</span>
                            <span className="text-muted-foreground ml-2">({unit.symbol})</span>
                            <span className="text-sm text-muted-foreground ml-2">= {unit.conversion_to_pcs} pcs</span>
                          </div>
                        )}
                        <div className="flex gap-2">
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
                              <Button size="sm" variant="ghost" onClick={() => setEditingUnit({ ...unit })}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUnitType(unit.id, unit.name)}
                                disabled={unit.symbol === "pcs"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Form Grids Tab */}
          <TabsContent value="grids" className="space-y-6">
            <OrderFormGridsAdmin />
          </TabsContent>

          {/* Price Lists Tab */}
          <TabsContent value="prices" className="space-y-6">
            <PriceListsAdmin />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteUserDialog.open} onOpenChange={(open) => setDeleteUserDialog({ ...deleteUserDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUserDialog.user?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Sequence Dialog */}
      <AlertDialog open={resetDialog.open} onOpenChange={(open) => setResetDialog({ ...resetDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Sequence Number</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reset the {resetDialog.type} numbering sequence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="newNumber">New Sequence Number</Label>
            <Input
              id="newNumber"
              type="number"
              value={newSequenceNumber}
              onChange={(e) => setNewSequenceNumber(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
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