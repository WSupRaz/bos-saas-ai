// apps/web/app/(dashboard)/reports/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { getInitials } from "@/lib/utils";

type Summary = {
  submitted: number; missing: number; total: number;
  submittedUsers: Array<{ id: string; name: string; role: string }>;
  missingUsers:   Array<{ id: string; name: string; role: string }>;
  typeCounts: Record<string, number>;
};

type Report = {
  id: string; type: string; date: string;
  data: Record<string, unknown>;
  submittedBy: { name: string; role: string };
};

export default function ReportsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [reportType, setReportType] = useState("DAILY_WORK");

  const { data: summary } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: () => api.get<Summary>("/api/reports/summary").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.get<{ data: Report[] }>("/api/reports", { params: { limit: 30 } }).then((r) => r.data),
  });

  const submit = useMutation({
    mutationFn: (body: { type: string; data: Record<string, unknown> }) =>
      api.post("/api/reports", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["reports-summary"] });
      toast.success("Report submitted!");
      setShowForm(false);
    },
    onError: () => toast.error("Failed to submit report"),
  });

  const { register, handleSubmit } = useForm();

  const onSubmit = (values: Record<string, unknown>) => {
    submit.mutate({ type: reportType, data: values });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Daily Reports</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Submit report
        </button>
      </div>

      {/* Today's status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500 font-medium">Total reporters</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.total ?? 0}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-5 bg-green-50/30">
          <p className="text-sm text-green-600 font-medium">Submitted today</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{summary?.submitted ?? 0}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-5 bg-red-50/30">
          <p className="text-sm text-red-600 font-medium">Still missing</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{summary?.missing ?? 0}</p>
        </div>
      </div>

      {/* Submitted vs missing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Submitted
          </h2>
          <div className="space-y-2">
            {(summary?.submittedUsers ?? []).length === 0 && (
              <p className="text-sm text-gray-400">None yet today</p>
            )}
            {(summary?.submittedUsers ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                  {getInitials(u.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" /> Missing
          </h2>
          <div className="space-y-2">
            {(summary?.missingUsers ?? []).length === 0 && (
              <p className="text-sm text-green-600 font-medium">Everyone submitted! 🎉</p>
            )}
            {(summary?.missingUsers ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">
                  {getInitials(u.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent reports */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent reports</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            <p className="text-center py-8 text-gray-400 text-sm">Loading…</p>
          ) : (reports?.data ?? []).length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">No reports submitted yet</p>
          ) : (
            (reports?.data ?? []).map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                  {getInitials(r.submittedBy.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{r.submittedBy.name}</p>
                  <p className="text-xs text-gray-500">
                    {r.type.replace(/_/g," ")} ·{" "}
                    {Object.entries(r.data).map(([k,v]) => `${k}: ${v}`).join(", ")}
                  </p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(r.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submit report modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Submit report</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Report type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="DAILY_WORK">Daily Work Report</option>
                <option value="VENDOR_RATE">Vendor Rate</option>
                <option value="DISTRIBUTOR_SALES">Distributor Sales</option>
                <option value="STOCK_UPDATE">Stock Update</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              {reportType === "DAILY_WORK" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Work summary *</label>
                  <textarea {...register("summary", { required: true })} rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Describe what you did today…" />
                </div>
              )}
              {reportType === "VENDOR_RATE" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate (₹)</label>
                    <input {...register("rate", { required: true, valueAsNumber: true })} type="number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <input {...register("unit")}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="per kg" />
                  </div>
                </div>
              )}
              {reportType === "STOCK_UPDATE" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input {...register("quantity", { required: true, valueAsNumber: true })} type="number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <input {...register("unit")}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="kg" />
                  </div>
                </div>
              )}
              {reportType === "DISTRIBUTOR_SALES" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sales quantity</label>
                  <input {...register("sales", { required: true, valueAsNumber: true })} type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="250 bags" />
                </div>
              )}
              {reportType === "EXPENSE" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                    <input {...register("amount", { required: true, valueAsNumber: true })} type="number"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input {...register("description")}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Petrol, courier…" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submit.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submit.isPending ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
