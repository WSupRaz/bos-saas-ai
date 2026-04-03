// apps/web/app/(dashboard)/tasks/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn, formatDate, PRIORITY_COLORS } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth.store";

type Task = {
  id: string; title: string; description?: string; status: string;
  priority: string; dueAt?: string; assignee?: { id: string; name: string };
};

type CreateTask = {
  title: string; description?: string; priority: string;
  assigneeId?: string; dueAt?: string;
};

type User = { id: string; name: string; role: string };

export default function TasksPage() {
  const qc            = useQueryClient();
  const currentUser   = useAuthStore((s) => s.user);
  const [filter,    setFilter]  = useState("active");
  const [showForm,  setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: () =>
      api.get<{ data: Task[] }>("/api/tasks", {
        params: {
          status: filter === "active" ? undefined : filter === "done" ? "DONE" : undefined,
          overdue: filter === "overdue" ? "true" : undefined,
        },
      }).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => api.get<{ data: User[] }>("/api/users").then((r) => r.data),
    enabled: ["OWNER","ADMIN","MANAGER"].includes(currentUser?.role ?? ""),
  });

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/api/tasks/${id}`, { status: done ? "DONE" : "PENDING" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const createTask = useMutation({
    mutationFn: (body: CreateTask) => api.post("/api/tasks", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task created"); setShowForm(false); reset(); },
    onError:   () => toast.error("Failed to create task"),
  });

  const { register, handleSubmit, reset } = useForm<CreateTask>({ defaultValues: { priority: "MEDIUM" } });

  const FILTERS = [
    { key: "active",  label: "Active"  },
    { key: "overdue", label: "Overdue" },
    { key: "done",    label: "Done"    },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
        {["OWNER","ADMIN","MANAGER"].includes(currentUser?.role ?? "") && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New task
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === f.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : (data?.data ?? []).length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            No {filter} tasks 🎉
          </div>
        ) : (
          (data?.data ?? []).map((task) => {
            const isDone    = task.status === "DONE";
            const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && !isDone;

            return (
              <div key={task.id} className={cn(
                "flex items-start gap-3 bg-white border rounded-xl px-4 py-3.5 transition-colors",
                isDone ? "opacity-60 border-gray-100" : isOverdue ? "border-red-200 bg-red-50/30" : "border-gray-200 hover:border-gray-300"
              )}>
                <button
                  onClick={() => toggleDone.mutate({ id: task.id, done: !isDone })}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isDone
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-gray-300 hover:text-blue-500 transition-colors" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium text-gray-900", isDone && "line-through text-gray-400")}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_COLORS[task.priority])}>
                      {task.priority}
                    </span>
                    {task.assignee && (
                      <span className="text-xs text-gray-500">→ {task.assignee.name}</span>
                    )}
                    {task.dueAt && (
                      <span className={cn("flex items-center gap-1 text-xs",
                        isOverdue ? "text-red-500" : "text-gray-400")}>
                        {isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {formatDate(task.dueAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create task modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">New task</h2>
            <form onSubmit={handleSubmit((v) => createTask.mutate(v))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input {...register("title", { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Call Rajesh about shipment" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea {...register("description")} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select {...register("priority")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["LOW","MEDIUM","HIGH","URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due date</label>
                  <input {...register("dueAt")} type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {(usersData?.data ?? []).length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assign to</label>
                  <select {...register("assigneeId")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Unassigned</option>
                    {usersData?.data.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createTask.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {createTask.isPending ? "Saving…" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
