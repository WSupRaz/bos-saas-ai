// apps/web/app/(dashboard)/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, ShoppingCart, TrendingUp, AlertCircle,
  CheckCircle, Clock, BarChart2, FileText,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth.store";

type DashData = {
  stats: {
    totalLeads: number; newLeadsThisWeek: number;
    totalOrders: number; revenueToday: number; revenueThisMonth: number;
    ordersThisMonth: number; pendingTasks: number; overdueTasks: number;
    reportsMissing: number; activeUsers: number; lowStockItems: number;
  };
  charts: {
    leadsByStatus: Array<{ status: string; count: number }>;
    dailyRevenue:  Array<{ date: string; amount: number }>;
  };
  recent: { orders: Array<{ orderNumber: string; totalAmount: number; status: string; createdAt: string }> };
};

const STATUS_COLORS = ["#3b82f6","#f59e0b","#8b5cf6","#f97316","#ec4899","#22c55e","#ef4444"];

function StatCard({
  label, value, sub, icon: Icon, color = "blue", trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string; trend?: "up" | "down";
}) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red:    "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color] ?? colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  () => api.get<DashData>("/api/analytics/dashboard").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = data?.stats;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greeting()}, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Alert bar — only show if there are issues */}
      {((s?.overdueTasks ?? 0) > 0 || (s?.reportsMissing ?? 0) > 0 || (s?.lowStockItems ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {(s?.overdueTasks ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4" />
              {s!.overdueTasks} overdue task{s!.overdueTasks > 1 ? "s" : ""}
            </div>
          )}
          {(s?.reportsMissing ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-700">
              <FileText className="w-4 h-4" />
              {s!.reportsMissing} report{s!.reportsMissing > 1 ? "s" : ""} missing today
            </div>
          )}
          {(s?.lowStockItems ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-700">
              <AlertCircle className="w-4 h-4" />
              {s!.lowStockItems} low stock item{s!.lowStockItems > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={s?.totalLeads ?? 0}
          sub={`+${s?.newLeadsThisWeek ?? 0} this week`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(s?.revenueToday ?? 0)}
          sub={`${s?.ordersThisMonth ?? 0} orders this month`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Pending Tasks"
          value={s?.pendingTasks ?? 0}
          sub={`${s?.overdueTasks ?? 0} overdue`}
          icon={CheckCircle}
          color={( s?.overdueTasks ?? 0) > 0 ? "red" : "purple"}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(s?.revenueThisMonth ?? 0)}
          sub={`${s?.activeUsers ?? 0} active team members`}
          icon={BarChart2}
          color="orange"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Revenue — last 30 days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.charts.dailyRevenue ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).getDate().toString()}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2}
                fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Leads by status</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data?.charts.leadsByStatus ?? []}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={65}
                dataKey="count" nameKey="status"
              >
                {(data?.charts.leadsByStatus ?? []).map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {(data?.charts.leadsByStatus ?? []).map((l, i) => (
              <div key={l.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                  <span className="text-gray-600">{l.status.replace("_", " ")}</span>
                </div>
                <span className="font-medium text-gray-900">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent orders</h2>
          <a href="/orders" className="text-xs text-blue-600 hover:underline">View all</a>
        </div>
        <div className="divide-y divide-gray-50">
          {(data?.recent.orders ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
          ) : (
            data?.recent.orders.map((o) => (
              <div key={o.orderNumber} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {o.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
