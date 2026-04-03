// apps/web/app/(dashboard)/inventory/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

type Item = {
  id: string; name: string; sku?: string; quantity: number;
  unit: string; minThreshold?: number; costPrice?: number;
  sellingPrice?: number; category?: string;
};

type CreateItem = {
  name: string; sku?: string; quantity: number; unit: string;
  minThreshold?: number; costPrice?: number; sellingPrice?: number; category?: string;
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const [showForm,  setShowForm]  = useState(false);
  const [showLow,   setShowLow]   = useState(false);
  const [editQty,   setEditQty]   = useState<{ id: string; qty: number } | null>(null);
  const [search,    setSearch]    = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", showLow, search],
    queryFn: () =>
      api.get<{ data: Item[]; total: number }>("/api/inventory", {
        params: { lowStock: showLow || undefined, search: search || undefined },
      }).then((r) => r.data),
  });

  const createItem = useMutation({
    mutationFn: (body: CreateItem) => api.post("/api/inventory", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item added"); setShowForm(false); reset(); },
    onError: () => toast.error("Failed to add item"),
  });

  const updateQty = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.patch(`/api/inventory/${id}`, { quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setEditQty(null); toast.success("Quantity updated"); },
    onError: () => toast.error("Update failed"),
  });

  const { register, handleSubmit, reset } = useForm<CreateItem>({ defaultValues: { quantity: 0, unit: "kg" } });

  const lowCount = (data?.data ?? []).filter(
    (i) => i.minThreshold !== undefined && i.quantity < i.minThreshold
  ).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{data?.total ?? 0} items · {lowCount} low stock</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
        />
        <button
          onClick={() => setShowLow(!showLow)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors",
            showLow
              ? "bg-orange-50 border-orange-200 text-orange-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Low stock {lowCount > 0 && `(${lowCount})`}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Item","SKU","Stock","Min Threshold","Cost Price","Selling Price","Category"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
              ) : (data?.data ?? []).length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No items found</p>
                </td></tr>
              ) : (
                (data?.data ?? []).map((item) => {
                  const isLow = item.minThreshold !== undefined && item.quantity < item.minThreshold;
                  return (
                    <tr key={item.id} className={cn("hover:bg-gray-50", isLow && "bg-red-50/40 hover:bg-red-50/60")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                          <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.sku ?? "—"}</td>
                      <td className="px-4 py-3">
                        {editQty?.id === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={editQty.qty}
                              onChange={(e) => setEditQty({ id: item.id, qty: Number(e.target.value) })}
                              className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none"
                            />
                            <button
                              onClick={() => updateQty.mutate({ id: item.id, quantity: editQty.qty })}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditQty(null)} className="text-xs text-gray-400 hover:text-gray-600">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditQty({ id: item.id, qty: item.quantity })}
                            className={cn(
                              "text-sm font-semibold hover:underline",
                              isLow ? "text-red-600" : "text-gray-900"
                            )}
                          >
                            {item.quantity} {item.unit}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.minThreshold != null ? `${item.minThreshold} ${item.unit}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.costPrice != null ? formatCurrency(item.costPrice) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.sellingPrice != null ? formatCurrency(item.sellingPrice) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.category ? (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {item.category}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add item modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Add inventory item</h2>
            <form onSubmit={handleSubmit((v) => createItem.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item name *</label>
                  <input {...register("name", { required: true })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Basmati Rice" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                  <input {...register("sku")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BR-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <input {...register("category")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Grains" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Initial qty</label>
                  <input {...register("quantity", { valueAsNumber: true })} type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <input {...register("unit")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="kg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min threshold</label>
                  <input {...register("minThreshold", { valueAsNumber: true })} type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Alert when below…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost price (₹)</label>
                  <input {...register("costPrice", { valueAsNumber: true })} type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling price (₹)</label>
                  <input {...register("sellingPrice", { valueAsNumber: true })} type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createItem.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {createItem.isPending ? "Adding…" : "Add item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
