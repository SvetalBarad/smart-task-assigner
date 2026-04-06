import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem("token");
    // Ensure the token looks like a real JWT (contains 3 parts), otherwise discard it
    if (t && t.split(".").length !== 3) {
      localStorage.removeItem("token");
      localStorage.removeItem("authUser");
      return null;
    }
    return t;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const u = localStorage.getItem("authUser");
    const t = localStorage.getItem("token");
    // Only return user if there's a valid-looking token alongside it
    if (u && t && t.split(".").length === 3) {
      try {
        return JSON.parse(u) as AuthUser;
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("authUser", JSON.stringify(user));
    else localStorage.removeItem("authUser");
  }, [user]);

  const login = (newToken: string, newUser: AuthUser) => {
    // Persist immediately so API calls triggered in the same tick can read the token.
    localStorage.setItem("token", newToken);
    localStorage.setItem("authUser", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
