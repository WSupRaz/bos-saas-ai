// apps/web/app/(dashboard)/automation/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap, ToggleLeft, ToggleRight, Trash2, Play } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatRelative } from "@/lib/utils";

type Automation = {
  id: string; name: string; description?: string; active: boolean;
  trigger: { event: string; conditions: Condition[] };
  actions: Action[];
  runCount: number; lastRunAt?: string; createdAt: string;
};

type Condition = { field: string; operator: string; value: string };
type Action    = { type: string; params: Record<string, string> };

type FormValues = {
  name: string; description?: string;
  triggerEvent: string;
  conditions: Condition[];
  actions: Array<{ type: string; params: Record<string, string> }>;
};

const EVENTS = [
  { value: "REPORT_MISSING",        label: "Report not submitted" },
  { value: "REPORT_SUBMITTED",      label: "Report submitted" },
  { value: "WHATSAPP_REPLY",        label: "WhatsApp reply received" },
  { value: "LEAD_CREATED",          label: "New lead created" },
  { value: "LEAD_STATUS_CHANGED",   label: "Lead status changed" },
  { value: "ORDER_PLACED",          label: "Order placed" },
  { value: "STOCK_LOW",             label: "Stock falls below threshold" },
  { value: "TASK_OVERDUE",          label: "Task overdue" },
  { value: "TASK_COMPLETED",        label: "Task completed" },
];

const ACTION_TYPES = [
  { value: "SEND_WHATSAPP",      label: "Send WhatsApp message" },
  { value: "SEND_EMAIL",         label: "Send email" },
  { value: "ASSIGN_TASK",        label: "Create & assign task" },
  { value: "NOTIFY_MANAGER",     label: "Notify manager" },
  { value: "UPDATE_LEAD_STATUS", label: "Update lead status" },
];

const EVENT_COLOR: Record<string, string> = {
  REPORT_MISSING:      "bg-red-50 text-red-700 border-red-100",
  REPORT_SUBMITTED:    "bg-green-50 text-green-700 border-green-100",
  WHATSAPP_REPLY:      "bg-teal-50 text-teal-700 border-teal-100",
  LEAD_CREATED:        "bg-blue-50 text-blue-700 border-blue-100",
  LEAD_STATUS_CHANGED: "bg-purple-50 text-purple-700 border-purple-100",
  ORDER_PLACED:        "bg-orange-50 text-orange-700 border-orange-100",
  STOCK_LOW:           "bg-yellow-50 text-yellow-700 border-yellow-100",
  TASK_OVERDUE:        "bg-red-50 text-red-700 border-red-100",
  TASK_COMPLETED:      "bg-green-50 text-green-700 border-green-100",
};

export default function AutomationPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: () => api.get<{ data: Automation[] }>("/api/automations").then((r) => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/api/automations/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/automations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); toast.success("Deleted"); },
  });

  const create = useMutation({
    mutationFn: (body: unknown) => api.post("/api/automations", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation created");
      setShowForm(false);
      reset();
    },
    onError: () => toast.error("Failed to create automation"),
  });

  const { register, handleSubmit, control, watch, reset } = useForm<FormValues>({
    defaultValues: {
      triggerEvent: "REPORT_MISSING",
      conditions: [],
      actions: [{ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "" } }],
    },
  });

  const { fields: actionFields, append: addAction, remove: removeAction } =
    useFieldArray({ control, name: "actions" });

  const onSubmit = (values: FormValues) => {
    create.mutate({
      name:        values.name,
      description: values.description,
      trigger: {
        event:      values.triggerEvent,
        conditions: values.conditions,
      },
      actions: values.actions,
    });
  };

  const watchedActions = watch("actions");

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Automation Engine</h1>
          <p className="text-sm text-gray-500">
            {data?.data.filter((a) => a.active).length ?? 0} active rules
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New automation
        </button>
      </div>

      {/* Automation cards */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No automations yet</p>
          <p className="text-sm text-gray-400 mt-1">Create rules to automate your business workflows</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {(data?.data ?? []).map((a) => (
            <div
              key={a.id}
              className={`bg-white border rounded-xl p-5 transition-opacity ${
                a.active ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.active ? "bg-blue-50" : "bg-gray-50"}`}>
                    <Zap className={`w-4 h-4 ${a.active ? "text-blue-600" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{a.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${EVENT_COLOR[a.trigger.event] ?? "bg-gray-50 text-gray-600 border-gray-100"}`}>
                        {EVENTS.find((e) => e.value === a.trigger.event)?.label ?? a.trigger.event}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    )}
                    {/* Actions summary */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(a.actions as Action[]).map((act, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          → {ACTION_TYPES.find((t) => t.value === act.type)?.label ?? act.type}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Play className="w-3 h-3" /> {a.runCount} runs
                      </span>
                      {a.lastRunAt && (
                        <span className="text-xs text-gray-400">
                          Last ran {formatRelative(a.lastRunAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggle.mutate({ id: a.id, active: !a.active })}
                    className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    title={a.active ? "Disable" : "Enable"}
                  >
                    {a.active
                      ? <ToggleRight className="w-6 h-6 text-blue-600" />
                      : <ToggleLeft  className="w-6 h-6 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this automation?")) remove.mutate(a.id); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create automation modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New automation rule</h2>
              <p className="text-xs text-gray-400 mt-0.5">Define a trigger event and one or more actions</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rule name *</label>
                <input
                  {...register("name", { required: true })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Chase missing reports at 6pm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  {...register("description")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description…"
                />
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  WHEN (trigger event)
                </label>
                <select
                  {...register("triggerEvent")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {EVENTS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                  THEN (actions)
                </label>
                <div className="space-y-3">
                  {actionFields.map((field, i) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          {...register(`actions.${i}.type`)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ACTION_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {actionFields.length > 1 && (
                          <button type="button" onClick={() => removeAction(i)}
                            className="p-1.5 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Action params based on type */}
                      {watchedActions[i]?.type === "SEND_WHATSAPP" && (
                        <>
                          <input
                            {...register(`actions.${i}.params.to`)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="To: {{phone}} (use template vars)"
                          />
                          <textarea
                            {...register(`actions.${i}.params.message`)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Message: Hi {{name}}, please submit your report…"
                          />
                        </>
                      )}
                      {watchedActions[i]?.type === "SEND_EMAIL" && (
                        <>
                          <input
                            {...register(`actions.${i}.params.to`)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="To: {{email}}"
                          />
                          <input
                            {...register(`actions.${i}.params.subject`)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Subject"
                          />
                          <textarea
                            {...register(`actions.${i}.params.body`)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Email body…"
                          />
                        </>
                      )}
                      {watchedActions[i]?.type === "ASSIGN_TASK" && (
                        <>
                          <input
                            {...register(`actions.${i}.params.title`)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Task title: Follow up with {{name}}"
                          />
                          <input
                            {...register(`actions.${i}.params.dueDays`)}
                            type="number"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Due in N days"
                          />
                        </>
                      )}
                      {watchedActions[i]?.type === "NOTIFY_MANAGER" && (
                        <textarea
                          {...register(`actions.${i}.params.message`)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          placeholder="Alert message to managers: {{itemName}} stock is low"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addAction({ type: "SEND_WHATSAPP", params: { to: "{{phone}}", message: "" } })}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add another action
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Available variables: <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code>{" "}
                  <code className="bg-gray-100 px-1 rounded">{"{{phone}}"}</code>{" "}
                  <code className="bg-gray-100 px-1 rounded">{"{{email}}"}</code>{" "}
                  <code className="bg-gray-100 px-1 rounded">{"{{orgName}}"}</code>
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); reset(); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {create.isPending ? "Saving…" : "Create automation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
