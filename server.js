import express from "express";
import crypto from "crypto";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

/* ===============================
   CONFIG
================================= */
const MAX_CACHE_SIZE = 1500;
const TTL = 24 * 60 * 60 * 1000; // 24h
const MODEL_COST_PER_1M = 1.0;
const AVG_TOKENS = 3000;

/* ===============================
   IN MEMORY STORE
================================= */
const cache = new Map(); // LRU
const stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTokens: 0
};

/* ===============================
   HELPERS
================================= */
function getLatency(start) {
  return Date.now() - start;
}

function generateKey(query) {
  return crypto.createHash("md5").update(query).digest("hex");
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
  const baselineCost =
    (stats.totalRequests * AVG_TOKENS * MODEL_COST_PER_1M) / 1_000_000;

  const actualCost =
    ((stats.totalRequests - stats.cacheHits) *
      AVG_TOKENS *
      MODEL_COST_PER_1M) /
    1_000_000;

  return baselineCost - actualCost;
}

/* ===============================
   ROOT
================================= */
app.get("/", (req, res) => {
  const start = Date.now();
  res.json({
    answer: "AI Cache Server Running",
    cached: false,
    latency: getLatency(start)
  });
});

/* ===============================
   MAIN ENDPOINT
================================= */
app.post("/", async (req, res) => {
  const start = Date.now();
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      answer: "Query is required",
      cached: false,
      latency: getLatency(start)
    });
  }

  stats.totalRequests++;
  stats.totalTokens += AVG_TOKENS;

  cleanupExpired();

  const key = generateKey(query);

  // EXACT MATCH CACHE
  if (cache.has(key)) {
    const entry = cache.get(key);

    // LRU refresh
    cache.delete(key);
    cache.set(key, entry);

    stats.cacheHits++;

    return res.json({
      answer: entry.answer,
      cached: true,
      latency: getLatency(start),
      cacheKey: key
    });
  }

  // Simulate LLM latency
  await new Promise(resolve => setTimeout(resolve, 500));

  const answer = `Summary of document: ${query}`;

  // LRU eviction
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(key, {
    answer,
    timestamp: Date.now()
  });

  stats.cacheMisses++;

  res.json({
    answer,
    cached: false,
    latency: getLatency(start),
    cacheKey: key
  });
});

/* ===============================
   ANALYTICS BUILDER
================================= */
function buildAnalytics() {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : stats.cacheHits / stats.totalRequests;

  return {
    hitRate,
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheSize: cache.size,
    costSavings: Number(calculateSavings().toFixed(2)),
    savingsPercent: hitRate * 100,
    strategies: [
      "exact match caching (MD5)",
      "LRU eviction",
      "TTL expiration (24h)"
    ]
  };
}

/* ===============================
   GET ANALYTICS
================================= */
app.get("/analytics", (req, res) => {
  const start = Date.now();
  res.json({
    response: buildAnalytics(),
    cached: false,
    latency: getLatency(start)
  });
});

/* ===============================
   POST ANALYTICS (Reset + Return)
================================= */
app.post("/analytics", (req, res) => {
  const start = Date.now();

  // Reset stats
  stats.totalRequests = 0;
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
  stats.totalTokens = 0;
  cache.clear();

  res.json({
    response: buildAnalytics(),
    cached: false,
    latency: getLatency(start)
  });
});

/* ===============================
   START SERVER
================================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
