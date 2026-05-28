"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.getRedisClient = getRedisClient;
// packages/shared/utils/redis.ts
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
function getRedisClient() {
    if (!redisClient) {
        redisClient = new ioredis_1.default(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
        redisClient.on("error", (err) => {
            console.error("Redis client error:", err);
        });
        redisClient.on("connect", () => {
            console.log("✅ Redis connected");
        });
    }
    return redisClient;
}
exports.redis = getRedisClient();
