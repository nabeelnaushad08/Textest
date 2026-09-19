import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  FileText, 
  TrendingUp,
  LogOut,
  Warehouse,
  UserCircle,
  Shield,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/texpro-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Suppliers", href: "/suppliers", icon: TrendingUp },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Stock", href: "/stock", icon: Warehouse },
];

function NavItems({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation();
  
  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
      <Link
        to="/admin"
        onClick={onItemClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mt-4 border-t pt-4",
          "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <Shield className="h-5 w-5" />
        Admin Panel
      </Link>
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-sidebar">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <img src={logo} alt="TexPro Marketing logo" className="h-10 w-auto object-contain" />
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <NavItems />
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-2">
            <UserCircle className="h-5 w-5 text-sidebar-foreground flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.full_name || user?.username}
              </p>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-sidebar px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="TexPro Marketing logo" className="h-8 w-auto object-contain" />
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar">
            <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-6">
              <img src={logo} alt="TexPro Marketing logo" className="h-8 w-auto object-contain" />
            </div>
            <nav className="flex-1 space-y-1 p-4">
              <NavItems onItemClick={() => setMobileMenuOpen(false)} />
            </nav>
            <div className="border-t border-sidebar-border p-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-2">
                <UserCircle className="h-5 w-5 text-sidebar-foreground flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-sidebar-foreground">
                    {user?.full_name || user?.username}
                  </p>
                </div>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="container mx-auto p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
