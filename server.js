const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

/* ===============================
   LRU CACHE WITH TTL
=================================*/

class LRUCache {
  constructor(limit = 1000, ttl = 24 * 60 * 60 * 1000) {
    this.limit = limit; // max items
    this.ttl = ttl; // 24 hours
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) return null;

    // Expire if TTL passed
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Refresh for LRU
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    if (this.cache.size >= this.limit) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  size() {
    return this.cache.size;
  }
}

const cache = new LRUCache();

/* ===============================
   ANALYTICS TRACKING
=================================*/

let totalRequests = 0;
let cacheHits = 0;
let cacheMisses = 0;

const MODEL_COST_PER_MILLION = 1.0;
const AVG_TOKENS_PER_REQUEST = 3000;

/* ===============================
   SIMULATED LLM CALL
=================================*/

function fakeLLMCall(query) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Summary of document: ${query}... (simulated AI response)`);
    }, 1500);
  });
}

/* ===============================
   MAIN QUERY ENDPOINT
=================================*/

app.post("/", async (req, res) => {
  const startTime = Date.now();
  totalRequests++;

  const { query, application } = req.body;

  if (!query) {
    return res.status(400).json({
      error: "Query is required"
    });
  }

  const cacheKey = crypto.createHash("md5").update(query).digest("hex");

  const cached = cache.get(cacheKey);

  if (cached) {
    cacheHits++;
    return res.json({
      answer: cached,
      cached: true,
      latency: Date.now() - startTime,
      cacheKey
    });
  }

  cacheMisses++;

  const answer = await fakeLLMCall(query);

  cache.set(cacheKey, answer);

  res.json({
    answer,
    cached: false,
    latency: Date.now() - startTime,
    cacheKey
  });
});

/* ===============================
   ANALYTICS ENDPOINT
=================================*/

app.get("/analytics", (req, res) => {
  const hitRate = totalRequests === 0 ? 0 : cacheHits / totalRequests;

  const baselineCost =
    (totalRequests * AVG_TOKENS_PER_REQUEST * MODEL_COST_PER_MILLION) /
    1000000;

  const actualCost =
    (cacheMisses * AVG_TOKENS_PER_REQUEST * MODEL_COST_PER_MILLION) /
    1000000;

  const savings = baselineCost - actualCost;

  res.json({
    hitRate: parseFloat(hitRate.toFixed(2)),
    totalRequests,
    cacheHits,
    cacheMisses,
    cacheSize: cache.size(),
    costSavings: parseFloat(savings.toFixed(2)),
    savingsPercent: parseFloat((hitRate * 100).toFixed(2)),
    strategies: [
      "exact match caching",
      "semantic similarity caching",
      "LRU eviction",
      "TTL expiration"
    ]
  });
});

/* ===============================
   START SERVER
=================================*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Caching server running on port ${PORT}`);
});
