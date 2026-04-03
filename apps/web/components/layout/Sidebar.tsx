"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CheckSquare, MessageSquare,
  FileText, Package, BarChart3, Zap, Bot, TrendingUp,
  Settings, ShoppingCart, Bell, LogOut, ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import { cn, getInitials, ROLE_LABELS } from "@/lib/utils";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["OWNER","ADMIN","MANAGER","EMPLOYEE"] },
  { label: "CRM / Leads", href: "/crm", icon: Users, roles: ["OWNER","ADMIN","MANAGER","EMPLOYEE"] },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, roles: ["OWNER","ADMIN","MANAGER","EMPLOYEE"] },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageSquare, roles: ["OWNER","ADMIN","MANAGER"] },
  { label: "Reports", href: "/reports", icon: FileText, roles: ["OWNER","ADMIN","MANAGER","EMPLOYEE","VENDOR","DISTRIBUTOR"] },
  { label: "Orders", href: "/orders", icon: ShoppingCart, roles: ["OWNER","ADMIN","MANAGER","VENDOR","DISTRIBUTOR"] },
  { label: "Inventory", href: "/inventory", icon: Package, roles: ["OWNER","ADMIN","MANAGER","VENDOR"] },
  { label: "Market Rates", href: "/market", icon: TrendingUp, roles: ["OWNER","ADMIN","MANAGER","VENDOR","DISTRIBUTOR"] },
  { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["OWNER","ADMIN","MANAGER"] },
  { label: "Automation", href: "/automation", icon: Zap, roles: ["OWNER","ADMIN"] },
  { label: "AI Assistant", href: "/ai-chat", icon: Bot, roles: ["OWNER","ADMIN","MANAGER"] },
  { label: "Team", href: "/team", icon: Users, roles: ["OWNER","ADMIN","MANAGER"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["OWNER","ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    // ✅ CLEAR AUTH STORE
    clearAuth();

    // ✅ CRITICAL FIX — CLEAR COOKIE
    document.cookie = "bos_token=; path=/; max-age=0; SameSite=Lax";

    toast.success("Signed out");
    router.push("/login");
  };

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">BOS</p>
            <p className="text-xs text-gray-400 leading-tight truncate max-w-[120px]">
              {user?.orgName}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors group",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
            {getInitials(user?.name ?? "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}