type RateLimitRule = {
  key: string;
  limit: number;
  windowSeconds: number;
};

function requireRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required"
    );
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function redisIncrWithExpire(key: string, ttlSeconds: number) {
  const { url, token } = requireRedisEnv();
  const encodedKey = encodeURIComponent(key);
  const incrResponse = await fetch(`${url}/incr/${encodedKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!incrResponse.ok) {
    const text = await incrResponse.text().catch(() => "");
    throw new Error(`Redis error: ${incrResponse.status} ${text}`);
  }

  const incrPayload = (await incrResponse.json()) as { result?: number };
  const count = Number(incrPayload.result || 0);

  if (count === 1) {
    const expireResponse = await fetch(
      `${url}/expire/${encodedKey}/${ttlSeconds}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!expireResponse.ok) {
      const text = await expireResponse.text().catch(() => "");
      throw new Error(`Redis error: ${expireResponse.status} ${text}`);
    }
  }

  return count;
}

export async function enforceRateLimit(rule: RateLimitRule) {
  try {
    const count = await redisIncrWithExpire(rule.key, rule.windowSeconds);
    return {
      allowed: count <= rule.limit,
      retryAfter: rule.windowSeconds,
    };
  } catch (error) {
    return {
      allowed: false,
      retryAfter: rule.windowSeconds,
      error:
        error instanceof Error ? error.message : "Security service unavailable",
    };
  }
}
