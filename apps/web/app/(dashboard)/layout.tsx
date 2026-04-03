// apps/web/app/(dashboard)/layout.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { Sidebar }  from "@/components/layout/Sidebar";
import { Topbar }   from "@/components/layout/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router       = useRouter();
  const user         = useAuthStore((s) => s.user);
  const hasHydrated  = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Only redirect after Zustand has finished reading from localStorage.
    // Without this guard, user is null on the very first render even when
    // a valid session exists, causing an immediate redirect back to /login.
    if (hasHydrated && !user) {
      router.replace("/login");
    }
  }, [hasHydrated, user, router]);

  // Still waiting for localStorage → show spinner, do NOT redirect yet
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Hydrated but no user → redirect is in flight, keep showing spinner
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
