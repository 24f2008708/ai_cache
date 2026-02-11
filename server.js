import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const MAX_CACHE_SIZE = 50;
const TTL = 24 * 60 * 60 * 1000;

const cache = new Map();

let totalRequests = 0;
let cacheHits = 0;
let cacheMisses = 0;

// ✅ IMPORTANT FIX: health route
app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

function cleanExpired() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > TTL) {
      cache.delete(key);
    }
  }
}

function enforceLRU() {
  if (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

app.post("/", async (req, res) => {
  const start = Date.now();
  totalRequests++;

  const query = req.body.query;
  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  cleanExpired();

  const key = crypto.createHash("md5").update(query).digest("hex");

  if (cache.has(key)) {
    cacheHits++;

    const cached = cache.get(key);

    cache.delete(key);
    cache.set(key, cached); // LRU refresh

    return res.json({
      answer: cached.answer,
      fromCache: true,
      latency: Date.now() - start
    });
  }

  cacheMisses++;

  const answer = `AI response for: ${query}`;

  cache.set(key, {
    answer,
    timestamp: Date.now()
  });

  enforceLRU();

  res.json({
    answer,
    fromCache: false,
    latency: Date.now() - start
  });
});

app.get("/analytics", (req, res) => {
  const hitRate =
    totalRequests === 0 ? 0 : cacheHits / totalRequests;

  const costSavings = cacheHits * 0.002;
  const savingsPercent =
    totalRequests === 0 ? 0 : (cacheHits / totalRequests) * 100;

  res.json({
    totalRequests,
    cacheHits,
    cacheMisses,
    cacheSize: cache.size,
    hitRate,
    costSavings,
    savingsPercent,
    strategies: [
      "exact match caching (MD5 hash)",
      "LRU eviction",
      "TTL expiration (24h)"
    ]
  });
});

app.post("/analytics", (req, res) => {
  totalRequests = 0;
  cacheHits = 0;
  cacheMisses = 0;
  cache.clear();

  res.json({ message: "Analytics reset successful" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
