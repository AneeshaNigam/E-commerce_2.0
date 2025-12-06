import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const envUrl = process.env.UPSTASH_REDIS_URL?.trim();
const isDev = (process.env.NODE_ENV || "development") === "development";
const url = envUrl || (isDev ? "redis://127.0.0.1:6379" : null);

if (!url && !isDev) {
  throw new Error("Missing UPSTASH_REDIS_URL in environment (required in production).");
}

export const redis = url
  ? new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null })
  : null;

if (redis) {
  redis.on("error", (err) => console.error("[redis] error:", err?.message || err));
  if (isDev) {
    redis.on("ready", () => console.log("[redis] ready ->", url));
    redis.on("reconnecting", (delay) => console.log(`[redis] reconnecting in ${delay}ms`));
  }
}
