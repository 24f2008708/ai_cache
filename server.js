const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// ==============================
// CONFIG
// ==============================
const TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 2000;
const MODEL_COST_PER_1M = 1.0;
const AVG_TOKENS = 3000;

// ==============================
// CACHE + STATS
// ==============================
const cache = new Map();

const stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalTokensSaved: 0
};

// ==============================
// HELPERS
// ==============================
function getLatency(start) {
  const diff = Date.now() - start;
  return diff <= 0 ? 1 : diff;
}

function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

function generateKey(query) {
  return crypto.createHash("md5").update(query).digest("hex");
}

function evictIfNeeded() {
  if (cache.size > MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

function calculateCostSavings() {
  return (stats.totalTokensSaved / 1_000_000) * MODEL_COST_PER_1M;
}

function buildAnalytics() {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : stats.cacheHits / stats.totalRequests;

  const savings = calculateCostSavings();

  return {
    hitRate,
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheSize: cache.size,
    costSavings: Number(savings.toFixed(2)),
    savingsPercent: Number((hitRate * 100).toFixed(2)),
    strategies: [
      "exact match caching (MD5 hash)",
      "LRU eviction",
      "TTL expiration (24h)"
    ]
  };
}

// ==============================
// ROOT
// ==============================
app.get("/", (req, res) => {
  const startTime = Date.now();
  res.json({
    answer: "AI Cache Server is running 🚀",
    cached: false,
    latency: getLatency(startTime)
  });
});

// ==============================
// MAIN ENDPOINT
// ==============================
app.post("/", async (req, res) => {
  const startTime = Date.now();
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      answer: "Query is required",
      cached: false,
      latency: getLatency(startTime)
    });
  }

  stats.totalRequests++;

  const normalized = normalizeQuery(query);
  const cacheKey = generateKey(normalized);

  // -------- CACHE HIT --------
  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);

    if (Date.now() - entry.timestamp < TTL) {
      stats.cacheHits++;
      stats.totalTokensSaved += AVG_TOKENS;

      // Refresh LRU position
      cache.delete(cacheKey);
      cache.set(cacheKey, entry);

      return res.json({
        answer: entry.answer,
        cached: true,
        latency: getLatency(startTime),
        cacheKey
      });
    } else {
      cache.delete(cacheKey);
    }
  }

  // -------- CACHE MISS --------
  stats.cacheMisses++;

  await new Promise(resolve => setTimeout(resolve, 1200));

  const generatedAnswer = `Summary of document: ${query}`;

  cache.set(cacheKey, {
    answer: generatedAnswer,
    timestamp: Date.now()
  });

  evictIfNeeded();

  res.json({
    answer: generatedAnswer,
    cached: false,
    latency: getLatency(startTime),
    cacheKey
  });
});

// ==============================
// ANALYTICS ENDPOINTS
// ==============================
app.get("/analytics", (req, res) => {
  const startTime = Date.now();
  res.json({
    response: buildAnalytics(),
    cached: false,
    latency: getLatency(startTime)
  });
});

app.post("/analytics", (req, res) => {
  const startTime = Date.now();
  res.json({
    response: buildAnalytics(),
    cached: false,
    latency: getLatency(startTime)
  });
});

// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Caching server running on port ${PORT}`);
});
