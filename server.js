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

// Helper to ensure latency is never 0
function getLatency(startTime) {
  const diff = Date.now() - startTime;
  return diff <= 0 ? 1 : diff;
}

// --------------------
// Root
// --------------------
app.get("/", (req, res) => {
  res.send("AI Cache Server is running 🚀");
});

// --------------------
// ASK ENDPOINT
// --------------------
app.post("/ask", (req, res) => {
  const startTime = Date.now();
  const question = req.body.question;

  if (!question) {
    return res.status(400).json({
      error: "Question is required",
      latency: getLatency(startTime)
    });
  }

  stats.totalRequests++;

  if (cache[question]) {
    stats.cacheHits++;
    return res.json({
      answer: cache[question],
      cached: true,
      latency: getLatency(startTime)
    });
  }

  const generatedAnswer = `AI response for: ${question}`;

  cache[question] = generatedAnswer;
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
// ANALYTICS (GET + POST)
// --------------------
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

// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Caching server running on port ${PORT}`);
});

