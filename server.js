const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory cache
let cache = {};
let stats = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0
};

// Health route
app.get("/", (req, res) => {
  res.send("AI Cache Server is running 🚀");
});

// Analytics route
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

// Example cache route
app.post("/ask", (req, res) => {
  const { question } = req.body;
  stats.totalRequests++;

  if (cache[question]) {
    stats.cacheHits++;
    return res.json({ answer: cache[question], cached: true });
  }

  stats.cacheMisses++;
  const fakeAnswer = "This is a generated response for: " + question;

  cache[question] = fakeAnswer;

  res.json({ answer: fakeAnswer, cached: false });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
