// apps/web/app/(dashboard)/orders/page.tsx
"use client";
import { useState } from "react";
import { ShoppingCart, Search, Filter, Eye, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Order = {
  id:           string;
  orderNumber:  string;
  customer:     string;
  phone:        string;
  items:        string;
  amount:       number;
  status:       "PENDING" | "CONFIRMED" | "PROCESSING" | "DELIVERED" | "CANCELLED";
  date:         string;
  vendorName:   string;
};

const MOCK_ORDERS: Order[] = [
  {
    id:          "1",
    orderNumber: "ORD-20240401-1923",
    customer:    "Vikram Mehta",
    phone:       "+919876540001",
    items:       "Basmati Rice × 50kg, Wheat Flour × 25kg",
    amount:      7450,
    status:      "DELIVERED",
    date:        "2024-04-01T09:15:00Z",
    vendorName:  "Mehta Traders",
  },
  {
    id:          "2",
    orderNumber: "ORD-20240401-3847",
    customer:    "Sunita Rao",
    phone:       "+919876540002",
    items:       "Mustard Oil × 20L, Toor Dal × 10kg",
    amount:      4120,
    status:      "PROCESSING",
    date:        "2024-04-01T11:30:00Z",
    vendorName:  "Rao Distributors",
  },
  {
    id:          "3",
    orderNumber: "ORD-20240401-5521",
    customer:    "Anil Kumar",
    phone:       "+919876540003",
    items:       "Sugar × 100kg",
    amount:      5000,
    status:      "CONFIRMED",
    date:        "2024-04-01T13:45:00Z",
    vendorName:  "Kumar Enterprises",
  },
  {
    id:          "4",
    orderNumber: "ORD-20240401-7783",
    customer:    "Deepa Singh",
    phone:       "+919876540004",
    items:       "Basmati Rice × 200kg, Mustard Oil × 50L",
    amount:      26500,
    status:      "PENDING",
    date:        "2024-04-01T15:00:00Z",
    vendorName:  "Singh & Sons",
  },
  {
    id:          "5",
    orderNumber: "ORD-20240401-9012",
    customer:    "Mohan Das",
    phone:       "+919876540005",
    items:       "Wheat Flour × 500kg",
    amount:      21000,
    status:      "DELIVERED",
    date:        "2024-04-01T08:00:00Z",
    vendorName:  "Das Trading Co",
  },
  {
    id:          "6",
    orderNumber: "ORD-20240331-4456",
    customer:    "Ramesh Gupta",
    phone:       "+919876540006",
    items:       "Toor Dal × 50kg, Sugar × 50kg",
    amount:      9750,
    status:      "DELIVERED",
    date:        "2024-03-31T10:20:00Z",
    vendorName:  "Gupta Wholesale",
  },
  {
    id:          "7",
    orderNumber: "ORD-20240331-6634",
    customer:    "Kavita Sharma",
    phone:       "+919876540007",
    items:       "Mustard Oil × 100L",
    amount:      16500,
    status:      "CANCELLED",
    date:        "2024-03-31T14:10:00Z",
    vendorName:  "Sharma Traders",
  },
  {
    id:          "8",
    orderNumber: "ORD-20240330-2291",
    customer:    "Dinesh Patel",
    phone:       "+919876540008",
    items:       "Basmati Rice × 100kg, Toor Dal × 25kg",
    amount:      13375,
    status:      "DELIVERED",
    date:        "2024-03-30T09:45:00Z",
    vendorName:  "Patel Agro",
  },
];

const STATUS_CONFIG: Record<
  Order["status"],
  { label: string; classes: string; icon: React.ElementType }
> = {
  PENDING:    { label: "Pending",    classes: "bg-yellow-50 text-yellow-700 border-yellow-100", icon: Clock         },
  CONFIRMED:  { label: "Confirmed",  classes: "bg-blue-50 text-blue-700 border-blue-100",       icon: ShoppingCart  },
  PROCESSING: { label: "Processing", classes: "bg-purple-50 text-purple-700 border-purple-100", icon: TrendingUp    },
  DELIVERED:  { label: "Delivered",  classes: "bg-green-50 text-green-700 border-green-100",    icon: CheckCircle   },
  CANCELLED:  { label: "Cancelled",  classes: "bg-red-50 text-red-700 border-red-100",          icon: XCircle       },
};

export default function OrdersPage() {
  const [search,      setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected,    setSelected]   = useState<Order | null>(null);

  const filtered = MOCK_ORDERS.filter((o) => {
    const matchSearch =
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.vendorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const totalRevenue  = MOCK_ORDERS.reduce((s, o) => o.status !== "CANCELLED" ? s + o.amount : s, 0);
  const pending       = MOCK_ORDERS.filter((o) => o.status === "PENDING").length;
  const delivered     = MOCK_ORDERS.filter((o) => o.status === "DELIVERED").length;
  const cancelled     = MOCK_ORDERS.filter((o) => o.status === "CANCELLED").length;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{MOCK_ORDERS.length} total orders</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",  value: formatCurrency(totalRevenue), color: "bg-green-50 text-green-600", sub: `${MOCK_ORDERS.length} orders` },
          { label: "Pending",        value: pending,                      color: "bg-yellow-50 text-yellow-600", sub: "Awaiting action" },
          { label: "Delivered",      value: delivered,                    color: "bg-blue-50 text-blue-600",    sub: "Completed" },
          { label: "Cancelled",      value: cancelled,                    color: "bg-red-50 text-red-600",      sub: "This period" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 font-medium">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(["ALL", "PENDING", "CONFIRMED", "PROCESSING", "DELIVERED", "CANCELLED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {s === "ALL" ? "All" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Order ID", "Customer", "Items", "Amount", "Status", "Date", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    No orders match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const cfg  = STATUS_CONFIG[order.status];
                  const Icon = cfg.icon;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-medium text-gray-900">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-gray-400">{order.vendorName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {order.customer[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                            <p className="text-xs text-gray-400">{order.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-gray-600 truncate">{order.items}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.amount)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium",
                            cfg.classes
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(order.date)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(order)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">{filtered.length} of {MOCK_ORDERS.length} orders</p>
          <p className="text-xs text-gray-400">Showing demo data</p>
        </div>
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selected.orderNumber}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(selected.date)}</p>
              </div>
              <span className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium",
                STATUS_CONFIG[selected.status].classes
              )}>
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              {[
                { label: "Customer",   value: selected.customer },
                { label: "Phone",      value: selected.phone },
                { label: "Vendor",     value: selected.vendorName },
                { label: "Items",      value: selected.items },
                { label: "Amount",     value: formatCurrency(selected.amount) },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
