/**
 * Redis Cache Service
 * Redis-only caching layer for API responses.
 */
const { createClient } = require("redis");
const logger = require("./logger");

const CACHE_CONFIG = {
  defaultTTL: 60,
  keyPrefixes: {
    auth: "auth",
  },
  ttlByType: {
    auth: 180,
  },
};

let redisClient = null;
let redisAvailable = false;
let initPromise = null;
let normalizedRedisUrl = null;

function getNormalizedRedisUrl() {
  const rawUrl = process.env.REDIS_URL;
  if (!rawUrl) {
    throw new Error("REDIS_URL is required for cache service");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    throw new Error(`Invalid REDIS_URL: ${error.message}`, { cause: error });
  }

  if (parsed.protocol === "redis:" && parsed.hostname.endsWith("upstash.io")) {
    parsed.protocol = "rediss:";
    logger.warn(
      "REDIS_URL was redis:// for Upstash; switched to rediss:// automatically",
    );
  }

  return parsed.toString();
}

function assertRedisConfigured() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required for cache service");
  }
}

function assertRedisReady() {
  if (!redisClient || !redisClient.isOpen || !redisAvailable) {
    throw new Error("Redis cache is not connected");
  }
}

async function initRedis() {
  assertRedisConfigured();
  normalizedRedisUrl = normalizedRedisUrl || getNormalizedRedisUrl();

  if (redisClient && redisClient.isOpen) {
    redisAvailable = true;
    return redisClient;
  }

  if (initPromise) {
    return initPromise;
  }

  redisClient = createClient({
    url: normalizedRedisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy(retries) {
        if (retries > 10) {
          return new Error("Redis reconnect retry limit exceeded");
        }
        return Math.min(retries * 200, 2000);
      },
    },
  });

  redisClient.on("connect", () => {
    logger.info("Redis cache connected");
  });

  redisClient.on("ready", () => {
    redisAvailable = true;
    logger.info("Redis cache ready");
  });

  redisClient.on("error", (err) => {
    redisAvailable = false;
    logger.error(`Redis cache error: ${err.message}`);
  });

  redisClient.on("end", () => {
    redisAvailable = false;
    logger.warn("Redis cache connection closed");
  });

  initPromise = redisClient
    .connect()
    .then(() => redisClient.ping())
    .then(() => {
      redisAvailable = true;
      return redisClient;
    })
    .catch((error) => {
      redisAvailable = false;
      logger.error("Failed to initialize Redis cache", {
        error: error.message,
      });
      throw error;
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

async function ensureRedis() {
  if (!redisClient || !redisClient.isOpen || !redisAvailable) {
    await initRedis();
  }
  assertRedisReady();
}

async function get(key) {
  try {
    await ensureRedis();
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error("Cache get error", { key, error: error.message });
    throw error;
  }
}

async function set(key, value, ttl = CACHE_CONFIG.defaultTTL) {
  try {
    await ensureRedis();
    const payload = JSON.stringify(value);

    if (ttl > 0) {
      if (typeof redisClient.setEx === "function") {
        await redisClient.setEx(key, ttl, payload);
      } else {
        await redisClient.set(key, payload, { EX: ttl });
      }
      return;
    }

    await redisClient.set(key, payload);
  } catch (error) {
    logger.error("Cache set error", { key, ttl, error: error.message });
    throw error;
  }
}

async function del(key) {
  try {
    await ensureRedis();
    await redisClient.del(key);
  } catch (error) {
    logger.error("Cache delete error", { key, error: error.message });
    throw error;
  }
}

async function delPattern(pattern) {
  try {
    await ensureRedis();

    if (typeof redisClient.scanIterator === "function") {
      const keys = [];
      for await (const key of redisClient.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })) {
        keys.push(key);
      }
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return;
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    logger.error("Cache delPattern error", { pattern, error: error.message });
    throw error;
  }
}

async function getOrSet(key, fetchFn, ttl = CACHE_CONFIG.defaultTTL) {
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  await set(key, value, ttl);
  return value;
}
async function getStats() {
  const stats = {
    type: "redis",
    connected: !!(redisClient && redisClient.isOpen && redisAvailable),
    urlConfigured: !!process.env.REDIS_URL,
  };

  if (!stats.connected) {
    return stats;
  }

  try {
    const memory = await redisClient.info("memory");
    const keyspace = await redisClient.info("keyspace");
    stats.redisInfo = { memory, keyspace };
  } catch (error) {
    stats.redisError = error.message;
  }

  return stats;
}

function cacheMiddleware(keyFn, ttl = CACHE_CONFIG.defaultTTL) {
  return async (req, res, next) => {
    try {
      const key = typeof keyFn === "function" ? keyFn(req) : keyFn;

      const cached = await get(key);
      if (cached !== null) {
        res.set("X-Cache", "HIT");
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        await set(key, data, ttl);
        res.set("X-Cache", "MISS");
        return originalJson(data);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
module.exports = {
  initRedis,
  get,
  set,
  del,
  delPattern,
  getOrSet,
  getStats,
  cacheMiddleware,
  CACHE_CONFIG,
};
