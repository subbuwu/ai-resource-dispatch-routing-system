"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi, getAuthToken, setAuthToken, removeAuthToken } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "VOLUNTEER" | "ADMIN";
  phone: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isVolunteer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);
      } catch (error) {
        // Token invalid, remove it
        removeAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await authApi.login(email, password);
    setAuthToken(response.access_token);
    const userData = await authApi.getMe();
    setUser(userData);
    return userData;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    await authApi.register(data);
    await login(data.email, data.password);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    router.push("/dashboard");
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isVolunteer: user?.role === "VOLUNTEER",
    isAdmin: user?.role === "ADMIN",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
