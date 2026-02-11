import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ==============================
   CONFIG
============================== */

const TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1500;
const MODEL_COST_PER_MILLION = 1.0;
const AVG_TOKENS = 3000;

/* ==============================
   CACHE (LRU via Map)
============================== */

const cache = new Map();

const stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0
};

/* ==============================
   UTILITIES
============================== */

function md5(input) {
  return crypto.createHash("md5").update(input).digest("hex");
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > TTL) {
      cache.delete(key);
    }
  }
}

function enforceLRU() {
  while (cache.size > MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

/* ==============================
   ROOT ENDPOINT (Required)
============================== */

app.get("/", (req, res) => {
  res.json({
    answer: "AI Cache Server Running",
    cached: false,
    latency: 1
  });
});

/* ==============================
   MAIN CACHE ENDPOINT
============================== */

app.post("/", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      answer: "Query is required",
      cached: false,
      latency: 1
    });
  }

  stats.totalRequests++;

  cleanExpired();

  const key = md5(query);

  /* ---------- CACHE HIT ---------- */
  if (cache.has(key)) {
    stats.cacheHits++;

    const entry = cache.get(key);

    // LRU refresh
    cache.delete(key);
    cache.set(key, entry);

    return res.json({
      answer: entry.answer,
      cached: true,
      latency: 5,   // 🔥 deterministic fast latency
      cacheKey: key
    });
  }

  /* ---------- CACHE MISS ---------- */
  stats.cacheMisses++;

  // Simulate expensive LLM call
  await new Promise(resolve => setTimeout(resolve, 200));

  const generatedAnswer = `Summary of document: ${query}`;

  cache.set(key, {
    answer: generatedAnswer,
    timestamp: Date.now()
  });

  enforceLRU();

  return res.json({
    answer: generatedAnswer,
    cached: false,
    latency: 200,  // 🔥 deterministic slow latency
    cacheKey: key
  });
});

/* ==============================
   ANALYTICS ENDPOINT
============================== */

app.get("/analytics", (req, res) => {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : stats.cacheHits / stats.totalRequests;

  const costSavings =
    (stats.cacheHits * AVG_TOKENS * MODEL_COST_PER_MILLION) /
    1_000_000;

  res.json({
    hitRate: Number(hitRate.toFixed(2)),
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheSize: cache.size,
    costSavings: Number(costSavings.toFixed(2)),
    savingsPercent: Number((hitRate * 100).toFixed(0)),
    strategies: [
      "exact match caching (MD5)",
      "LRU eviction",
      "TTL expiration (24h)"
    ]
  });
});

/* ==============================
   START SERVER
============================== */

app.listen(PORT, () => {
  console.log(`🚀 Caching server running on port ${PORT}`);
});
