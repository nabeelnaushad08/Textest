import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface SystemUser {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "manager" | "sales" | "warehouse" | "accountant";
  is_active: boolean;
  can_access_pages: string[];
}

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signOut: () => void;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session in sessionStorage
    const storedUser = sessionStorage.getItem("system_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {
        sessionStorage.removeItem("system_user");
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Query the system_users table
      const { data, error } = await supabase
        .from("system_users")
        .select("id, username, full_name, role, is_active, can_access_pages, password_hash")
        .eq("username", username)
        .single();

      if (error || !data) {
        return { error: { message: "Invalid username or password" } };
      }

      // Check password (simple comparison for now)
      if (data.password_hash !== password) {
        return { error: { message: "Invalid username or password" } };
      }

      if (!data.is_active) {
        return { error: { message: "Your account has been deactivated. Contact admin." } };
      }

      // Create user session (without password)
      const systemUser: SystemUser = {
        id: data.id,
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        is_active: data.is_active,
        can_access_pages: (data.can_access_pages as string[]) || [],
      };

      // Store in sessionStorage
      sessionStorage.setItem("system_user", JSON.stringify(systemUser));
      setUser(systemUser);

      // Update last login
      await supabase
        .from("system_users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", data.id);

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || "Login failed" } };
    }
  };

  const signOut = () => {
    sessionStorage.removeItem("system_user");
    sessionStorage.removeItem("admin_authenticated");
    sessionStorage.removeItem("admin_session_time");
    setUser(null);
    navigate("/auth");
  };

  const updatePassword = async (newPassword: string) => {
    if (!user) {
      return { error: { message: "Not authenticated" } };
    }

    try {
      const { error } = await supabase
        .from("system_users")
        .update({ password_hash: newPassword })
        .eq("id", user.id);

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || "Failed to update password" } };
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updatePassword, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
