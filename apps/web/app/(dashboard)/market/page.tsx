// apps/web/app/(dashboard)/market/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatRelative } from "@/lib/utils";

type RateEntry = { id: string; item: string; rate: number; unit: string; source: string; sourceType: string; recordedAt: string };
type Comparison = { item: string; best: RateEntry; worst: RateEntry; all: RateEntry[]; savings: number };
type CreateRate  = { item: string; rate: number; unit: string; source: string; sourceType: string };

export default function MarketPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [view, setView]         = useState<"today" | "history">("today");

  const { data: comparison } = useQuery({
    queryKey: ["rates-comparison"],
    queryFn: () =>
      api.get<{ comparison: Comparison[] }>("/api/rates", { params: { compareToday: "true" } })
        .then((r) => r.data),
    enabled: view === "today",
    refetchInterval: 300_000,
  });

  const { data: history } = useQuery({
    queryKey: ["rates-history"],
    queryFn: () => api.get<{ data: RateEntry[] }>("/api/rates").then((r) => r.data),
    enabled: view === "history",
  });

  const submitRate = useMutation({
    mutationFn: (body: CreateRate) => api.post("/api/rates", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rates-comparison"] });
      qc.invalidateQueries({ queryKey: ["rates-history"] });
      toast.success("Rate submitted");
      setShowForm(false);
      reset();
    },
    onError: () => toast.error("Failed to submit rate"),
  });

  const { register, handleSubmit, reset } = useForm<CreateRate>({
    defaultValues: { unit: "kg", sourceType: "supplier" },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Market Intelligence</h1>
          <p className="text-sm text-gray-500">Daily mandi &amp; supplier rate tracking</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Submit rate
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ key: "today", label: "Today's comparison" }, { key: "history", label: "Rate history" }].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key as "today" | "history")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Today's comparison */}
      {view === "today" && (
        <div className="space-y-4">
          {(comparison?.comparison ?? []).length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No rates submitted today yet</p>
              <p className="text-sm text-gray-400 mt-1">Ask vendors to submit rates via WhatsApp or the app</p>
            </div>
          ) : (
            comparison?.comparison.map((c) => (
              <div key={c.item} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 capitalize">{c.item}</h2>
                  {c.savings > 0 && (
                    <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 font-medium">
                      Save ₹{c.savings.toFixed(0)}/{c.best.unit} by choosing best
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* Best */}
                  <div className="border border-green-200 bg-green-50/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Trophy className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Best</span>
                    </div>
                    <p className="text-xl font-bold text-green-800">₹{c.best.rate}/{c.best.unit}</p>
                    <p className="text-xs text-green-600 mt-0.5">{c.best.source}</p>
                    <p className="text-xs text-gray-400">{formatRelative(c.best.recordedAt)}</p>
                  </div>
                  {/* Worst */}
                  <div className="border border-red-100 bg-red-50/30 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Highest</span>
                    </div>
                    <p className="text-xl font-bold text-red-700">₹{c.worst.rate}/{c.worst.unit}</p>
                    <p className="text-xs text-red-500 mt-0.5">{c.worst.source}</p>
                    <p className="text-xs text-gray-400">{formatRelative(c.worst.recordedAt)}</p>
                  </div>
                  {/* Count */}
                  <div className="border border-gray-100 bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Quotes</p>
                    <p className="text-xl font-bold text-gray-800">{c.all.length}</p>
                    <p className="text-xs text-gray-400">suppliers submitted</p>
                  </div>
                </div>

                {/* All rates */}
                <div className="space-y-1.5">
                  {c.all.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {i === 0 && <Trophy className="w-3 h-3 text-yellow-500" />}
                        <span className="text-gray-700">{r.source}</span>
                        <span className="text-xs text-gray-400 capitalize px-1.5 py-0.5 bg-gray-100 rounded-full">
                          {r.sourceType}
                        </span>
                      </div>
                      <span className={`font-semibold ${i === 0 ? "text-green-700" : "text-gray-900"}`}>
                        ₹{r.rate}/{r.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History */}
      {view === "history" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Item","Rate","Source","Type","Recorded"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(history?.data ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{r.item}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{r.rate}/{r.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.source}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                      {r.sourceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(r.recordedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit rate modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Submit market rate</h2>
            <form onSubmit={handleSubmit((v) => submitRate.mutate(v))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Item *</label>
                <input {...register("item", { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Wheat, Rice, Sugar…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate (₹) *</label>
                  <input {...register("rate", { required: true, valueAsNumber: true })} type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Per unit</label>
                  <input {...register("unit")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="kg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source name *</label>
                <input {...register("source", { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sharma Mandi, Gupta Traders…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source type</label>
                <select {...register("sourceType")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="mandi">Mandi</option>
                  <option value="supplier">Supplier</option>
                  <option value="distributor">Distributor</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitRate.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitRate.isPending ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
