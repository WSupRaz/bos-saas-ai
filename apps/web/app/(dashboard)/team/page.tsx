// apps/web/app/(dashboard)/team/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCheck, UserX } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn, formatDate, getInitials, ROLE_LABELS } from "@/lib/utils";

type User = {
  id: string; name: string; email: string; role: string;
  status: string; phone?: string; lastLoginAt?: string; createdAt: string;
};

type InviteForm = {
  name: string; email: string; role: string; phone?: string; password: string;
};

const ROLE_COLORS: Record<string, string> = {
  OWNER:       "bg-purple-50 text-purple-700",
  ADMIN:       "bg-blue-50 text-blue-700",
  MANAGER:     "bg-indigo-50 text-indigo-700",
  EMPLOYEE:    "bg-gray-100 text-gray-700",
  VENDOR:      "bg-orange-50 text-orange-700",
  DISTRIBUTOR: "bg-teal-50 text-teal-700",
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [showForm,   setShowForm]  = useState(false);
  const [roleFilter, setRoleFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["users", roleFilter],
    queryFn: () =>
      api.get<{ data: User[] }>("/api/users", {
        params: { role: roleFilter || undefined },
      }).then((r) => r.data),
  });

  const invite = useMutation({
    mutationFn: (body: InviteForm) => api.post("/api/users", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Team member added");
      setShowForm(false);
      reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Failed to add member");
    },
  });

  const { register, handleSubmit, reset } = useForm<InviteForm>({
    defaultValues: { role: "EMPLOYEE", password: "Bos@12345" },
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">{data?.data.length ?? 0} members</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add member
        </button>
      </div>

      {/* Role filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "VENDOR", "DISTRIBUTOR"].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              roleFilter === r
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {r === "" ? "All" : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Members grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.data ?? []).map((user) => (
            <div
              key={user.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                  {user.status === "ACTIVE"
                    ? <UserCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <UserX    className="w-4 h-4 text-red-400 flex-shrink-0" />
                  }
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[user.role])}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {user.lastLoginAt
                    ? `Last login: ${formatDate(user.lastLoginAt)}`
                    : `Added: ${formatDate(user.createdAt)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add member modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Add team member</h2>
            <form onSubmit={handleSubmit((v) => invite.mutate(v))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full name *</label>
                <input {...register("name", { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Priya Sharma" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input {...register("email", { required: true })} type="email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="priya@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                  <select {...register("role")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone (WhatsApp)</label>
                  <input {...register("phone")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="919876543210" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Initial password</label>
                <input {...register("password")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Member should change this on first login.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={invite.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {invite.isPending ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
