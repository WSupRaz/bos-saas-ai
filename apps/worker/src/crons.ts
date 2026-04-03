// apps/worker/src/crons.ts
import { Queue } from "bullmq";

export function setupCrons(queue: Queue) {
  // ── 8:00 AM IST — Send daily report request to all employees ─
  queue.add(
    "daily-report-request",
    { type: "SEND_REPORT_REQUEST" },
    {
      repeat: { cron: "0 8 * * *", tz: "Asia/Kolkata" },
      jobId: "cron-daily-report-request",
    }
  );

  // ── 6:00 PM IST — Chase missing reports ──────────────────────
  queue.add(
    "followup-missing-reports",
    { type: "FOLLOWUP_MISSING_REPORTS" },
    {
      repeat: { cron: "0 18 * * *", tz: "Asia/Kolkata" },
      jobId: "cron-followup-missing-reports",
    }
  );

  // ── 7:00 AM IST — Request mandi/market rates from vendors ────
  queue.add(
    "collect-market-rates",
    { type: "COLLECT_MARKET_RATES" },
    {
      repeat: { cron: "0 7 * * *", tz: "Asia/Kolkata" },
      jobId: "cron-collect-market-rates",
    }
  );

  // ── Every day at midnight — check overdue tasks ───────────────
  queue.add(
    "check-overdue-tasks",
    { type: "CHECK_OVERDUE_TASKS" },
    {
      repeat: { cron: "0 0 * * *", tz: "Asia/Kolkata" },
      jobId: "cron-check-overdue-tasks",
    }
  );

  console.log("⏰ Cron jobs registered");
}
