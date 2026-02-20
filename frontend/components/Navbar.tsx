"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">
              Disaster Relief
            </Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/need-help" className="text-sm text-gray-600 hover:text-gray-900">
              Need Help
            </Link>
            <Link href="/route" className="text-sm text-gray-600 hover:text-gray-900">
              Route
            </Link>
            <Link href="/volunteer" className="text-sm text-gray-600 hover:text-gray-900">
              Volunteer
            </Link>
            <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Admin
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
                Volunteer / Admin login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
