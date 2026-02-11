const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// --------------------
// In-Memory Cache
// --------------------
const cache = {};

const stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0
};

function getLatency(startTime) {
  const diff = Date.now() - startTime;
  return diff <= 0 ? 1 : diff;
}

// Helper: normalize query for exact match caching
function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

// --------------------
// ROOT CHECK
// --------------------
app.get("/", (req, res) => {
  res.send("AI Cache Server is running 🚀");
});

// --------------------
// MAIN ENDPOINT (POST /)
// --------------------
app.post("/", (req, res) => {
  const startTime = Date.now();
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      response: { error: "Query is required" }, // wrapped in "response"
      cached: false,
      latency: getLatency(startTime)
    });
  }

  stats.totalRequests++;

  const key = normalizeQuery(query);

  // Exact Match Cache
  if (cache[key]) {
    stats.cacheHits++;
    return res.json({
      answer: cache[key],
      cached: true,
      latency: getLatency(startTime)
    });
  }

  // Simulated LLM response
  const generatedAnswer = `Summary of document: ${query}`;

  cache[key] = generatedAnswer;
  stats.cacheMisses++;

  res.json({
    answer: generatedAnswer,
    cached: false,
    latency: getLatency(startTime)
  });
});

// --------------------
// Analytics Builder
// --------------------
function buildAnalytics() {
  const hitRate =
    stats.totalRequests === 0
      ? 0
      : (stats.cacheHits / stats.totalRequests) * 100;

  return {
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
  };
}

// --------------------
// ANALYTICS ENDPOINTS
// --------------------
app.get("/analytics", (req, res) => {
  const startTime = Date.now();
  const analytics = buildAnalytics();
  res.json({
    response: analytics, // wrapped in "response"
    cached: false,
    latency: getLatency(startTime)
  });
});

app.post("/analytics", (req, res) => {
  const startTime = Date.now();
  const analytics = buildAnalytics();
  res.json({
    response: analytics, // wrapped in "response"
    cached: false,
    latency: getLatency(startTime)
  });
});

// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Caching server running on port ${PORT}`);
});
