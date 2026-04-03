// apps/web/lib/queues.ts
import { Queue } from "bullmq";
import Redis from "ioredis";

// Shared Redis connection for BullMQ (maxRetriesPerRequest must be null)
const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const messageQueue = new Queue("messages", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const emailQueue = new Queue("emails", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const automationQueue = new Queue("automations", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

export const reportQueue = new Queue("reports", {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 50 },
  },
});
