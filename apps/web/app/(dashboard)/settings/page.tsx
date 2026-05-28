// apps/web/app/(dashboard)/settings/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Building2, User, Bell, Shield, Globe, Save } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth.store";
import { cn } from "@/lib/utils";

type OrgSettings = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logoUrl: string | null;
  settings: {
    timezone?: string;
    currency?: string;
    waPhoneId?: string;
    emailDomain?: string;
  } | null;
};

type ProfileForm = { name: string; phone: string };
type OrgForm = { name: string; timezone: string; currency: string };

const TABS = [
  { id: "profile",   label: "Profile",       icon: User      },
  { id: "org",       label: "Organisation",  icon: Building2 },
  { id: "security",  label: "Security",      icon: Shield    },
  { id: "integrations", label: "Integrations", icon: Globe  },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const user     = useAuthStore((s) => s.user);
  const setAuth  = useAuthStore((s) => s.setAuth);
  const qc       = useQueryClient();

  const { data: orgData } = useQuery<OrgSettings>({
    queryKey: ["org-settings"],
    queryFn:  () => api.get<OrgSettings>("/api/org/settings").then((r) => r.data),
    enabled: activeTab === "org",
  });

  const profileForm = useForm<ProfileForm>({
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const orgForm = useForm<OrgForm>({
    values: {
      name:     orgData?.name     ?? "",
      timezone: orgData?.settings?.timezone ?? "Asia/Kolkata",
      currency: orgData?.settings?.currency ?? "INR",
    },
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });

  const updateProfile = useMutation({
    mutationFn: (data: ProfileForm) => api.patch("/api/users/profile", data),
    onSuccess: (_, data) => {
      if (user) {
        const accessToken  = useAuthStore.getState().accessToken  ?? "";
        const refreshToken = useAuthStore.getState().refreshToken ?? "";
        setAuth({ ...user, name: data.name, phone: data.phone }, accessToken, refreshToken);
      }
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const updateOrg = useMutation({
    mutationFn: (data: OrgForm) => api.patch("/api/org/settings", data),
    onSuccess: () => { toast.success("Organisation settings saved"); qc.invalidateQueries({ queryKey: ["org-settings"] }); },
    onError:   () => toast.error("Failed to save settings"),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post("/api/auth/change-password", { currentPassword: pwForm.current, newPassword: pwForm.next }),
    onSuccess: () => { toast.success("Password changed"); setPwForm({ current: "", next: "", confirm: "" }); },
    onError:   (e: unknown) => toast.error((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to change password"),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and organisation preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-48 flex-shrink-0 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Personal Information</h2>
              <form onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    {...profileForm.register("name", { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    value={user?.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                  <input
                    {...profileForm.register("phone")}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    value={user?.role}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {updateProfile.isPending ? "Saving…" : "Save changes"}
                </button>
              </form>
            </div>
          )}

          {/* Organisation */}
          {activeTab === "org" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Organisation Settings</h2>
              <p className="text-sm text-gray-500 mb-5">
                Plan: <span className="font-medium text-blue-700">{orgData?.plan ?? user?.orgPlan}</span>
              </p>
              <form onSubmit={orgForm.handleSubmit((d) => updateOrg.mutate(d))} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name</label>
                  <input
                    {...orgForm.register("name", { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select
                    {...orgForm.register("timezone")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    {...orgForm.register("currency")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={updateOrg.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {updateOrg.isPending ? "Saving…" : "Save changes"}
                </button>
              </form>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Change Password</h2>
              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                  <input
                    type="password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
                    if (pwForm.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
                    changePassword.mutate();
                  }}
                  disabled={changePassword.isPending || !pwForm.current || !pwForm.next}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  {changePassword.isPending ? "Updating…" : "Update password"}
                </button>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === "integrations" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <h2 className="font-semibold text-gray-900">Integrations</h2>
              {[
                { name: "WhatsApp Business", desc: "Send and receive WhatsApp messages via Meta API", key: "WA_PHONE_ID", status: process.env.NEXT_PUBLIC_WA_CONFIGURED === "true" ? "connected" : "not_configured" },
                { name: "SendGrid Email",    desc: "Send transactional and campaign emails",          key: "SENDGRID",   status: "not_configured" },
                { name: "OpenAI / GPT-4o",  desc: "AI assistant and smart reply features",           key: "OPENAI",     status: "not_configured" },
              ].map((item) => (
                <div key={item.key} className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium border",
                    item.status === "connected"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  )}>
                    {item.status === "connected" ? "Connected" : "Not configured"}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-400">Configure integrations by setting the appropriate environment variables on your server.</p>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Notification Preferences</h2>
              <div className="space-y-4 max-w-sm">
                {[
                  { label: "New lead assigned to you",     defaultOn: true  },
                  { label: "Task due date approaching",    defaultOn: true  },
                  { label: "Daily report submitted",       defaultOn: false },
                  { label: "Low inventory alerts",         defaultOn: true  },
                  { label: "Automation triggered",         defaultOn: false },
                  { label: "Order status changed",         defaultOn: true  },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{n.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={n.defaultOn} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-2">Notification settings are saved automatically.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
