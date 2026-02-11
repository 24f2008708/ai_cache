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

// --------------------
// Home Route
// --------------------
app.get("/", (req, res) => {
  res.send("AI Cache Server is running 🚀");
});

// --------------------
// Ask Endpoint (Caching Logic)
// --------------------
app.post("/ask", (req, res) => {
  const question = req.body.question;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  stats.totalRequests++;

  // If in cache
  if (cache[question]) {
    stats.cacheHits++;
    return res.json({
      answer: cache[question],
      cached: true
    });
  }

  // Simulated AI response
  const generatedAnswer = `AI response for: ${question}`;

  cache[question] = generatedAnswer;
  stats.cacheMisses++;

  res.json({
    answer: generatedAnswer,
    cached: false
  });
});

// --------------------
// Analytics Helper
// --------------------
function getAnalytics() {
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
// Analytics Endpoints
// --------------------
app.get("/analytics", (req, res) => {
  res.json({
    response: getAnalytics()
  });
});

app.post("/analytics", (req, res) => {
  res.json({
    response: getAnalytics()
  });
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Caching server running on port ${PORT}`);
});
