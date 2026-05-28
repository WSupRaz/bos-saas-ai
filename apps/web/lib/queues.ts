// apps/web/lib/queues.ts
import { Queue } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

// Redis and queues are optional — the app works without them, but background
// jobs (WhatsApp, email, automations) won't be processed.
let connection: Redis | null = null;

function getConnection(): Redis | null {
  if (!REDIS_URL) return null;
  if (connection) return connection;

  try {
    connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    connection.on("error", (e) => {
      if ((e as NodeJS.ErrnoException).code !== "ECONNREFUSED") {
        console.warn("[Redis] Connection error:", e.message);
      }
    });
    return connection;
  } catch {
    return null;
  }
}

function makeQueue(name: string, opts?: object): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  return new Queue(name, {
    connection: conn,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
      ...opts,
    },
  });
}

const _messageQueue    = makeQueue("messages");
const _emailQueue      = makeQueue("emails");
const _automationQueue = makeQueue("automations", { attempts: 2 });
const _reportQueue     = makeQueue("reports", { attempts: 1, removeOnComplete: { count: 50 } });

// Safe wrappers that no-op when Redis is unavailable
export const messageQueue = {
  add: async (name: string, data: unknown, opts?: object) => {
    if (!_messageQueue) { console.warn("[Queue] Redis unavailable — skipping messageQueue.add"); return null; }
    return _messageQueue.add(name, data, opts);
  },
};

export const emailQueue = {
  add: async (name: string, data: unknown, opts?: object) => {
    if (!_emailQueue) { console.warn("[Queue] Redis unavailable — skipping emailQueue.add"); return null; }
    return _emailQueue.add(name, data, opts);
  },
};

export const automationQueue = {
  add: async (name: string, data: unknown, opts?: object) => {
    if (!_automationQueue) { console.warn("[Queue] Redis unavailable — skipping automationQueue.add"); return null; }
    return _automationQueue.add(name, data, opts);
  },
};

export const reportQueue = {
  add: async (name: string, data: unknown, opts?: object) => {
    if (!_reportQueue) { console.warn("[Queue] Redis unavailable — skipping reportQueue.add"); return null; }
    return _reportQueue.add(name, data, opts);
  },
};
