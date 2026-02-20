"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVolunteer?: boolean;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireVolunteer = false,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isVolunteer, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
      } else if (requireVolunteer && !isVolunteer) {
        router.push("/dashboard");
      } else if (requireAdmin && !isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isVolunteer, isAdmin, loading, requireVolunteer, requireAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireVolunteer && !isVolunteer) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
