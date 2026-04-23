// Workers KV を使った日次レート制限。KV バインディング RATELIMIT が未設定なら透過させる。

export async function checkAndIncrement(env) {
  const limit = Number(env.DAILY_LIMIT || '30');
  if (!env.RATELIMIT) {
    return { ok: true, remaining: limit };
  }
  const today = new Date().toISOString().slice(0, 10);
  const raw = await env.RATELIMIT.get(today);
  const current = raw ? Number(raw) : 0;

  if (current >= limit) {
    return { ok: false, resetAt: nextMidnightIso() };
  }

  await env.RATELIMIT.put(today, String(current + 1), { expirationTtl: 60 * 60 * 48 });
  return { ok: true, remaining: limit - current - 1 };
}

function nextMidnightIso() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.toISOString();
}
