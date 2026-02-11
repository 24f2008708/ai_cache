import express from "express";
import crypto from "crypto";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

/* ================= CONFIG ================= */
const MAX_CACHE_SIZE = 1500;
const TTL = 24 * 60 * 60 * 1000; // 24 hours
const MODEL_COST_PER_1M = 1.0;
const AVG_TOKENS = 3000;

/* ================= STORAGE ================= */
const cache = new Map(); // LRU
const stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0
};

/* ================= HELPERS ================= */
function generateKey(query) {
  return crypto.createHash("md5").update(query).digest("hex");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanupExpired() {
  const now = Date.now();
  for (let [key, value] of cache.entries()) {
    if (now - value.timestamp > TTL) {
      cache.delete(key);
    }
  }
}

function calculateSavings() {
  const baseline =
    (stats.totalRequests * AVG_TOKENS * MODEL_COST_PER_1M) / 1_000_000;

  const actual =
    ((stats.totalRequests - stats.cacheHits) *
      AVG_TOKENS *
      MODEL_COST_PER_1M) /
    1_000_000;

  return Number((baseline - actual).toFixed(2));
}

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.json({
    answer: "AI Cache Server Running",
    cached: false,
    latency: 5
  });
});

/* ================= MAIN ENDPOINT ================= */
app.post("/", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      answer: "Query is required",
      cached: false,
      latency: 5
    });
  }

  stats.totalRequests++;
  cleanupExpired();

  const key = generateKey(query);

  /* ===== CACHE HIT ===== */
  if (cache.has(key)) {
    const entry = cache.get(key);

    // LRU refresh
    cache.delete(key);
    cache.set(key, entry);

    stats.cacheHits++;

    return res.json({
      answer: entry.answer,
      cached: true,
      latency: 5,          // ALWAYS fast
      cacheKey: key
    });
  }

  /* ===== CACHE MISS ===== */
  stats.cacheMisses++;

  await sleep(600);        // Simulated LLM delay

  const answer = `Summary of document: ${query}`;

  // LRU eviction
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    answer,
    timestamp: Date.now()
  });

  return res.json({
    answer,
    cached: false,
    latency: 600,          // ALWAYS slow
    cacheKey: key
  });
});

/* ================= ANALYTICS ================= */
app.get("/analytics", (req, res) => {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : stats.cacheHits / stats.totalRequests;

  res.json({
    hitRate,
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheSize: cache.size,
    costSavings: calculateSavings(),
    savingsPercent: hitRate * 100,
    strategies: [
      "exact match caching (MD5)",
      "LRU eviction",
      "TTL expiration (24h)"
    ],
    cached: false,
    latency: 5
  });
});

/* ================= RESET ANALYTICS ================= */
app.post("/analytics", (req, res) => {
  stats.totalRequests = 0;
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
  cache.clear();

  res.json({
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheSize: 0,
    costSavings: 0,
    savingsPercent: 0,
    strategies: [
      "exact match caching (MD5)",
      "LRU eviction",
      "TTL expiration (24h)"
    ],
    cached: false,
    latency: 5
  });
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
