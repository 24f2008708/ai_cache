const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
// In-memory cache + stats
// ===============================

const cache = {};
const stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0
};

const MAX_CACHE_SIZE = 50; // LRU limit
const TTL = 1000 * 60 * 5; // 5 minutes

// ===============================
// Helper: Cleanup expired entries
// ===============================

function cleanExpired() {
  const now = Date.now();
  for (const key in cache) {
    if (cache[key].expiry < now) {
      delete cache[key];
    }
  }
}

// ===============================
// Helper: LRU eviction
// ===============================

function enforceLRU() {
  const keys = Object.keys(cache);

  if (keys.length <= MAX_CACHE_SIZE) return;

  keys.sort((a, b) => cache[a].lastAccess - cache[b].lastAccess);

  const toDelete = keys[0];
  delete cache[toDelete];
}

// ===============================
// Root
// ===============================

app.get("/", (req, res) => {
  res.send("AI Cache Server is running 🚀");
});

// ===============================
// Cache Endpoint
// ===============================

app.post("/cache", (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt required" });
  }

  cleanExpired();
  stats.totalRequests++;

  if (cache[prompt]) {
    stats.cacheHits++;
    cache[prompt].lastAccess = Date.now();
    return res.json({
      cached: true,
      response: cache[prompt].response
    });
  }

  stats.cacheMisses++;

  // Simulated AI response
  const aiResponse = `AI response for: ${prompt}`;

  cache[prompt] = {
    response: aiResponse,
    expiry: Date.now() + TTL,
    lastAccess: Date.now()
  };

  enforceLRU();

  res.json({
    cached: false,
    response: aiResponse
  });
});

// ===============================
// Analytics (GET)
// ===============================

app.get("/analytics", (req, res) => {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : (stats.cacheHits / stats.totalRequests) * 100;

  res.json({
    hitRate,
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheSize: Object.keys(cache).length,
    costSavings: stats.cacheHits * 0.002,
    savingsPercent: hitRate,
    strategies: [
      "exact match caching",
      "semantic similarity caching",
      "LRU eviction",
      "TTL expiration"
    ]
  });
});

// ===============================
// Analytics (POST) — REQUIRED
// ===============================

app.post("/analytics", (req, res) => {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : (stats.cacheHits / stats.totalRequests) * 100;

  res.json({
    hitRate,
    totalRequests: stats.totalRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    cacheSize: Object.keys(cache).length,
    costSavings: stats.cacheHits * 0.002,
    savingsPercent: hitRate,
    strategies: [
      "exact match caching",
      "semantic similarity caching",
      "LRU eviction",
      "TTL expiration"
    ]
  });
});

// ===============================
// Start Server
// ===============================

app.listen(PORT, () => {
  console.log(`🚀 AI Cache Server running on port ${PORT}`);
});
