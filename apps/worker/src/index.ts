// apps/worker/src/index.ts
import "dotenv/config";
import { Worker, Queue } from "bullmq";
import Redis from "ioredis";
import { handleWhatsAppJob }   from "./processors/whatsapp.processor";
import { handleEmailJob }      from "./processors/email.processor";
import { handleAutomationJob } from "./processors/automation.processor";
import { handleReportJob }     from "./processors/report.processor";
import { setupCrons }          from "./crons";

const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("connect", () => console.log("✅ Redis connected"));
connection.on("error",   (e) => console.error("❌ Redis error:", e));

// ── Spawn workers ────────────────────────────────────────────
const waWorker = new Worker("messages",    handleWhatsAppJob,   { connection, concurrency: 10 });
const emWorker = new Worker("emails",      handleEmailJob,      { connection, concurrency: 5  });
const atWorker = new Worker("automations", handleAutomationJob, { connection, concurrency: 3  });
const rpWorker = new Worker("reports",     handleReportJob,     { connection, concurrency: 2  });

// ── Event logging ────────────────────────────────────────────
for (const worker of [waWorker, emWorker, atWorker, rpWorker]) {
  worker.on("completed", (job) =>
    console.log(`[${worker.name}] ✓ Job ${job.id} completed`)
  );
  worker.on("failed", (job, err) =>
    console.error(`[${worker.name}] ✗ Job ${job?.id} failed:`, err.message)
  );
}

// ── Set up cron / scheduled jobs ─────────────────────────────
const reportQueue = new Queue("reports", { connection });
setupCrons(reportQueue);

console.log("🚀 BOS Worker running. Queues: messages, emails, automations, reports");

// ── Graceful shutdown ─────────────────────────────────────────
async function shutdown() {
  console.log("\n⏳ Shutting down workers...");
  await Promise.all([
    waWorker.close(),
    emWorker.close(),
    atWorker.close(),
    rpWorker.close(),
  ]);
  await connection.quit();
  console.log("👋 Workers stopped.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);
