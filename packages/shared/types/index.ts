// packages/shared/types/index.ts

export type JWTPayload = {
  userId: string;
  orgId: string;
  role: string;
  iat?: number;
  exp?: number;
};

export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// ─── Automation types ──────────────────────────────────────

export type AutomationEvent =
  | "REPORT_MISSING"
  | "REPORT_SUBMITTED"
  | "WHATSAPP_REPLY"
  | "LEAD_CREATED"
  | "LEAD_STATUS_CHANGED"
  | "ORDER_PLACED"
  | "ORDER_STATUS_CHANGED"
  | "STOCK_LOW"
  | "TASK_OVERDUE"
  | "TASK_COMPLETED"
  | "PAYMENT_RECEIVED"
  | "NO_FOLLOWUP_3DAYS";

export type ConditionOperator = "equals" | "not_equals" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_contains";

export type AutomationCondition = {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
};

export type AutomationTrigger = {
  event: AutomationEvent;
  conditions: AutomationCondition[];
};

export type AutomationActionType =
  | "SEND_WHATSAPP"
  | "SEND_EMAIL"
  | "ASSIGN_TASK"
  | "CREATE_LEAD"
  | "UPDATE_LEAD_STATUS"
  | "NOTIFY_MANAGER"
  | "SEND_REPORT_REQUEST"
  | "ADD_TAG"
  | "REMOVE_TAG";

export type AutomationAction = {
  type: AutomationActionType;
  params: Record<string, string | number | boolean>;
};

// ─── Queue job types ─────────────────────────────────────

export type SendWhatsAppJob = {
  messageId?: string; // if pre-created in DB
  to?: string;
  body?: string;
  orgId?: string;
  campaignId?: string;
};

export type SendEmailJob = {
  messageId?: string;
  to?: string;
  subject?: string;
  html?: string;
  orgId?: string;
  campaignId?: string;
};

export type AutomationJob = {
  event: AutomationEvent;
  context: Record<string, unknown>;
};

export type DailyReportRequestJob = {
  orgId: string;
};

export type FollowUpMissingReportsJob = {
  orgId: string;
};
