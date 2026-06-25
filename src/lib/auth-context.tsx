import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CurrentUser, getCurrentUser, getUsers, setCurrentUser } from "./cms-storage";
import { pullCategoryOrder } from "./cloud-category-order";

interface AuthCtx {
  user: CurrentUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const cu = getCurrentUser();
    setUser(cu);
    // Hydrate cloud-synced category order for the active session on app boot
    // so a fresh device picks up the latest order without requiring re-login.
    if (cu?.email) void pullCategoryOrder(cu.email);
  }, []);

  const login = (email: string, password: string) => {
    const found = getUsers().find((u) => u.email === email && u.password === password);
    if (!found) return false;
    const cu: CurrentUser = { id: found.id, email: found.email, role: found.role };
    setCurrentUser(cu);
    setUser(cu);
    // Pull cloud-synced category order for this account (fire-and-forget — the
    // homepage listens for the synthetic storage event dispatched on apply).
    void pullCategoryOrder(cu.email);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
