// apps/web/app/(dashboard)/orders/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart, Search, Filter, Eye, TrendingUp, Clock,
  CheckCircle, XCircle, Plus, X,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import api from "@/lib/api";

type OrderItem = { name: string; qty: number; unit: string; price: number };

type Order = {
  id:            string;
  orderNumber:   string;
  status:        "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  items:         OrderItem[];
  subtotal:      number;
  tax:           number;
  totalAmount:   number;
  notes:         string | null;
  vendorId:      string | null;
  distributorId: string | null;
  createdAt:     string;
  updatedAt:     string;
};

type ApiResponse = { data: Order[]; total: number; page: number; pages: number };

const STATUS_CONFIG: Record<Order["status"], { label: string; classes: string; icon: React.ElementType }> = {
  PENDING:    { label: "Pending",    classes: "bg-yellow-50 text-yellow-700 border-yellow-100", icon: Clock        },
  CONFIRMED:  { label: "Confirmed",  classes: "bg-blue-50 text-blue-700 border-blue-100",       icon: ShoppingCart },
  PROCESSING: { label: "Processing", classes: "bg-purple-50 text-purple-700 border-purple-100", icon: TrendingUp   },
  SHIPPED:    { label: "Shipped",    classes: "bg-indigo-50 text-indigo-700 border-indigo-100", icon: TrendingUp   },
  DELIVERED:  { label: "Delivered",  classes: "bg-green-50 text-green-700 border-green-100",    icon: CheckCircle  },
  CANCELLED:  { label: "Cancelled",  classes: "bg-red-50 text-red-700 border-red-100",          icon: XCircle      },
};

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

type NewOrderForm = { items: OrderItem[]; notes: string; tax: number };

export default function OrdersPage() {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected,     setSelected]     = useState<Order | null>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [page,         setPage]         = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["orders", statusFilter, page],
    queryFn:  () =>
      api
        .get<ApiResponse>("/api/orders", {
          params: {
            ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
            page,
            limit: 20,
          },
        })
        .then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/orders/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      setSelected(null);
    },
  });

  const orders = data?.data ?? [];

  const filtered = orders.filter((o) => {
    if (!search) return true;
    return (
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalRevenue  = orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.totalAmount, 0);
  const pending       = orders.filter((o) => o.status === "PENDING").length;
  const delivered     = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelled     = orders.filter((o) => o.status === "CANCELLED").length;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} total orders</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New order
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",  value: formatCurrency(totalRevenue), color: "bg-green-50 text-green-600",   sub: `${data?.total ?? 0} orders` },
          { label: "Pending",        value: pending,                       color: "bg-yellow-50 text-yellow-600", sub: "Awaiting action" },
          { label: "Delivered",      value: delivered,                     color: "bg-blue-50 text-blue-600",     sub: "Completed" },
          { label: "Cancelled",      value: cancelled,                     color: "bg-red-50 text-red-600",       sub: "This period" },
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
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {STATUSES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {s === "ALL" ? "All" : STATUS_CONFIG[s as Order["status"]].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Order ID", "Items", "Amount", "Status", "Date", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      {search ? "No orders match your search" : "No orders yet"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const cfg  = STATUS_CONFIG[order.status];
                    const Icon = cfg.icon;
                    const itemSummary = order.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-mono font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-xs text-gray-400">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-gray-600 truncate">{itemSummary}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                          {order.tax > 0 && <p className="text-xs text-gray-400">+{formatCurrency(order.tax)} tax</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", cfg.classes)}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelected(order)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View details"
                            aria-label="View order details"
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
        )}

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {data?.pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data?.pages ?? 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">{selected.orderNumber}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(selected.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium", STATUS_CONFIG[selected.status].classes)}>
                  {STATUS_CONFIG[selected.status].label}
                </span>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5">
              {selected.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name} × {item.qty} {item.unit}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(item.qty * item.price)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-1.5 mt-1.5 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(selected.totalAmount)}</span>
              </div>
            </div>

            {selected.notes && (
              <p className="text-xs text-gray-500 mb-4 px-1">{selected.notes}</p>
            )}

            {/* Status update */}
            {selected.status !== "DELIVERED" && selected.status !== "CANCELLED" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Update status</p>
                <div className="flex gap-2 flex-wrap">
                  {(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const)
                    .filter((s) => s !== selected.status)
                    .map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                        disabled={updateStatus.isPending}
                        className={cn(
                          "px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors disabled:opacity-50",
                          STATUS_CONFIG[s].classes
                        )}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create order modal — simplified */}
      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["orders"] }); }}
        />
      )}
    </div>
  );
}

function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [items, setItems] = useState<OrderItem[]>([{ name: "", qty: 1, unit: "units", price: 0 }]);
  const [notes, setNotes] = useState("");
  const [tax,   setTax]   = useState(0);

  const createMutation = useMutation({
    mutationFn: () => api.post("/api/orders", { items, notes: notes || undefined, tax }),
    onSuccess:  onCreated,
  });

  const addItem    = () => setItems((p) => [...p, { name: "", qty: 1, unit: "units", price: 0 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof OrderItem, value: string | number) =>
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">New Order</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                aria-label={`Item ${i + 1} name`}
                value={item.name}
                onChange={(e) => updateItem(i, "name", e.target.value)}
                placeholder="Item name"
                className="col-span-4 px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                min={1}
                aria-label={`Item ${i + 1} quantity`}
                value={item.qty}
                onChange={(e) => updateItem(i, "qty", Number(e.target.value))}
                className="col-span-2 px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                aria-label={`Item ${i + 1} unit`}
                value={item.unit}
                onChange={(e) => updateItem(i, "unit", e.target.value)}
                placeholder="unit"
                className="col-span-2 px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                min={0}
                aria-label={`Item ${i + 1} price`}
                value={item.price}
                onChange={(e) => updateItem(i, "price", Number(e.target.value))}
                placeholder="Price"
                className="col-span-3 px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                aria-label={`Remove item ${i + 1}`}
                className="col-span-1 flex justify-center text-gray-400 hover:text-red-500 disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add item
          </button>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="order-tax" className="block text-xs font-medium text-gray-600 mb-1">Tax amount (₹)</label>
              <input
                id="order-tax"
                type="number"
                min={0}
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col justify-end">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(subtotal + tax)}</p>
            </div>
          </div>

          <div>
            <label htmlFor="order-notes" className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || items.some((i) => !i.name)}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? "Creating…" : "Create order"}
          </button>
        </div>
      </div>
    </div>
  );
}
