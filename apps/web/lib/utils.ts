// apps/web/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style:    "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  }).format(new Date(date));
}

export function formatRelative(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return formatDate(date);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER:       "Owner",
  ADMIN:       "Admin",
  MANAGER:     "Manager",
  EMPLOYEE:    "Employee",
  VENDOR:      "Vendor",
  DISTRIBUTOR: "Distributor",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW:         "bg-blue-100 text-blue-700",
  CONTACTED:   "bg-yellow-100 text-yellow-700",
  QUALIFIED:   "bg-purple-100 text-purple-700",
  PROPOSAL:    "bg-orange-100 text-orange-700",
  NEGOTIATION: "bg-pink-100 text-pink-700",
  CLOSED_WON:  "bg-green-100 text-green-700",
  CLOSED_LOST: "bg-red-100 text-red-700",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH:   "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};
