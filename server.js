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

  // 🔥 EXACT MATCH ON FULL REQUEST BODY
  const cacheKey = generateKey(JSON.stringify(req.body));

  // -------- CACHE HIT --------
  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey);

    if (Date.now() - entry.timestamp < TTL) {
      stats.cacheHits++;
      stats.totalTokensSaved += AVG_TOKENS;

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
