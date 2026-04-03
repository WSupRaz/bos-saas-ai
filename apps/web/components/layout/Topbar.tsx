// apps/web/components/layout/Topbar.tsx
"use client";
import { Bell, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth.store";
import { formatRelative } from "@/lib/utils";

type Notification = {
  id: string; title: string; body: string; type: string;
  read: boolean; createdAt: string; link?: string;
};

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn:  () => api.get<{ data: Notification[]; unreadCount: number }>("/api/notifications").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const markAllRead = async () => {
    await api.patch("/api/notifications", { markAll: true });
    refetch();
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search leads, tasks, orders…"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {(data?.unreadCount ?? 0) > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none">
                {data!.unreadCount > 9 ? "9+" : data!.unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-sm">Notifications</h3>
                {(data?.unreadCount ?? 0) > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {(data?.data ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                ) : (
                  data?.data.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.read ? "bg-blue-50/50" : ""}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Org plan badge */}
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          {user?.orgPlan}
        </span>
      </div>
    </header>
  );
}
