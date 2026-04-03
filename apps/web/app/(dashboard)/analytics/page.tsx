// apps/web/app/(dashboard)/analytics/page.tsx
"use client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, ShoppingCart,
  IndianRupee, Package, MessageSquare, FileText,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ─── Static demo data ──────────────────────────────────────────────────────

const DAILY_REVENUE = [
  { date: "Mar 02", revenue: 18400, orders: 4 },
  { date: "Mar 05", revenue: 24100, orders: 6 },
  { date: "Mar 08", revenue: 15800, orders: 3 },
  { date: "Mar 11", revenue: 31200, orders: 8 },
  { date: "Mar 14", revenue: 27600, orders: 7 },
  { date: "Mar 17", revenue: 19400, orders: 5 },
  { date: "Mar 20", revenue: 34500, orders: 9 },
  { date: "Mar 23", revenue: 22300, orders: 6 },
  { date: "Mar 26", revenue: 41200, orders: 11 },
  { date: "Mar 29", revenue: 38700, orders: 10 },
  { date: "Apr 01", revenue: 29100, orders: 7 },
  { date: "Apr 04", revenue: 44800, orders: 12 },
];

const LEAD_FUNNEL = [
  { stage: "New",         count: 84, color: "#3b82f6" },
  { stage: "Contacted",   count: 61, color: "#f59e0b" },
  { stage: "Qualified",   count: 43, color: "#8b5cf6" },
  { stage: "Proposal",    count: 28, color: "#f97316" },
  { stage: "Negotiation", count: 17, color: "#ec4899" },
  { stage: "Closed Won",  count: 12, color: "#22c55e" },
];

const CHANNEL_MIX = [
  { name: "WhatsApp",  value: 38, color: "#22c55e" },
  { name: "Referral",  value: 27, color: "#3b82f6" },
  { name: "Website",   value: 19, color: "#8b5cf6" },
  { name: "Manual",    value: 16, color: "#f59e0b" },
];

const WEEKLY_REPORTS = [
  { day: "Mon", submitted: 8, missing: 2 },
  { day: "Tue", submitted: 9, missing: 1 },
  { day: "Wed", submitted: 7, missing: 3 },
  { day: "Thu", submitted: 10, missing: 0 },
  { day: "Fri", submitted: 8, missing: 2 },
  { day: "Sat", submitted: 5, missing: 0 },
];

const TOP_PRODUCTS = [
  { name: "Basmati Rice",  revenue: 86400, units: "820 kg",  trend: "up"   },
  { name: "Wheat Flour",   revenue: 73500, units: "1750 kg", trend: "up"   },
  { name: "Mustard Oil",   revenue: 61200, units: "370 L",   trend: "down" },
  { name: "Toor Dal",      revenue: 48900, units: "355 kg",  trend: "up"   },
  { name: "Sugar",         revenue: 37800, units: "900 kg",  trend: "down" },
];

// ─── Components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconBg, trend, trendValue,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  iconBg: string; trend?: "up" | "down"; trendValue?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {trend && trendValue && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend === "up" ? "text-green-600" : "text-red-500"
              )}>
                {trend === "up"
                  ? <TrendingUp  className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />}
                {trendValue}
              </span>
            )}
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        </div>
        <div className={cn("p-2.5 rounded-lg flex-shrink-0", iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          {p.name === "revenue" ? formatCurrency(p.value) : `${p.value} ${p.name}`}
        </p>
      ))}
    </div>
  );
};

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Business performance overview — demo data</p>
        </div>
        <div className="flex items-center gap-2">
          {["7D", "30D", "90D"].map((r, i) => (
            <button
              key={r}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                i === 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value="₹3,41,200"
          sub="vs last month"
          icon={IndianRupee}
          iconBg="bg-green-50 text-green-600"
          trend="up"
          trendValue="+18.4%"
        />
        <StatCard
          label="Total Orders"
          value="88"
          sub="vs last month"
          icon={ShoppingCart}
          iconBg="bg-blue-50 text-blue-600"
          trend="up"
          trendValue="+12.1%"
        />
        <StatCard
          label="Total Leads"
          value="245"
          sub="vs last month"
          icon={Users}
          iconBg="bg-purple-50 text-purple-600"
          trend="up"
          trendValue="+7.3%"
        />
        <StatCard
          label="Avg Order Value"
          value="₹3,877"
          sub="per order"
          icon={Package}
          iconBg="bg-orange-50 text-orange-600"
          trend="down"
          trendValue="-2.1%"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Revenue trend</h2>
            <p className="text-xs text-gray-400 mt-0.5">Daily revenue for the last 30 days</p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium border border-green-100">
            ↑ 18.4% vs last period
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={DAILY_REVENUE} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="revenue" name="revenue"
              stroke="#3b82f6" strokeWidth={2} fill="url(#aGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Lead funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Lead funnel</h2>
          <div className="space-y-2.5">
            {LEAD_FUNNEL.map((item) => {
              const pct = Math.round((item.count / LEAD_FUNNEL[0].count) * 100);
              return (
                <div key={item.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{item.stage}</span>
                    <span className="text-xs font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Conversion rate</p>
            <p className="text-sm font-bold text-gray-900">
              {Math.round((12 / 84) * 100)}%{" "}
              <span className="text-xs font-normal text-green-600">New → Won</span>
            </p>
          </div>
        </div>

        {/* Lead sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Lead sources</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={CHANNEL_MIX}
                  cx="50%" cy="50%"
                  innerRadius={46} outerRadius={66}
                  dataKey="value" paddingAngle={2}
                >
                  {CHANNEL_MIX.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {CHANNEL_MIX.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-xs text-gray-600">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reports compliance + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Report compliance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Report compliance (this week)</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEEKLY_REPORTS} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="submitted" name="Submitted" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="missing"   name="Missing"   fill="#f87171" radius={[3, 3, 0, 0]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Top products by revenue</h2>
          </div>
          <div className="space-y-3">
            {TOP_PRODUCTS.map((p, i) => {
              const maxRev = TOP_PRODUCTS[0].revenue;
              const pct    = Math.round((p.revenue / maxRev) * 100);
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <span className="text-xs font-medium text-gray-700">{p.name}</span>
                      {p.trend === "up"
                        ? <TrendingUp   className="w-3 h-3 text-green-500" />
                        : <TrendingDown className="w-3 h-3 text-red-400"   />}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">{formatCurrency(p.revenue)}</p>
                      <p className="text-xs text-gray-400">{p.units}</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WhatsApp stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-5">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900 text-sm">WhatsApp message delivery (last 7 days)</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Sent",      value: "312", color: "bg-blue-50 text-blue-700",   pct: "100%" },
            { label: "Delivered", value: "298", color: "bg-green-50 text-green-700", pct: "95.5%" },
            { label: "Read",      value: "241", color: "bg-purple-50 text-purple-700",pct: "77.2%" },
            { label: "Replied",   value: "89",  color: "bg-orange-50 text-orange-700",pct: "28.5%" },
          ].map((s) => (
            <div key={s.label} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className={cn("text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block", s.color)}>
                {s.pct}
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
