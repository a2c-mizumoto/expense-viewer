import { VALID_IDS } from './_lib/categories.js';
import { buildSystemPrompt, USER_INSTRUCTION } from './_lib/prompt.js';
import { checkAndIncrement } from './_lib/ratelimit.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.APP_SECRET || !env.ANTHROPIC_API_KEY) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const url = new URL(request.url);
  if (url.searchParams.get('key') !== env.APP_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }

  const gate = await checkAndIncrement(env);
  if (!gate.ok) {
    return json({ error: 'rate_limited', resetAt: gate.resetAt }, 429);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'invalid_image', detail: 'form parse failed' }, 400);
  }
  const image = form.get('image');
  const clientReceiptId = form.get('receiptId');
  if (!image || typeof image.arrayBuffer !== 'function') {
    return json({ error: 'invalid_image', detail: 'image field missing' }, 400);
  }
  const buf = await image.arrayBuffer();
  if (buf.byteLength === 0) {
    return json({ error: 'invalid_image', detail: 'empty' }, 400);
  }
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    return json({ error: 'invalid_image', detail: 'too_large' }, 400);
  }

  const rawMedia = (image.type || 'image/jpeg').toLowerCase();
  const mediaType = ALLOWED_MEDIA.has(rawMedia) ? rawMedia : 'image/jpeg';
  const base64 = arrayBufferToBase64(buf);

  let claudeRes;
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: USER_INSTRUCTION },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    return json({ error: 'upstream_failed', detail: String(err) }, 502);
  }

  if (!claudeRes.ok) {
    const detail = await claudeRes.text().catch(() => '');
    return json({ error: 'upstream_failed', status: claudeRes.status, detail: detail.slice(0, 500) }, 502);
  }

  const claudeJson = await claudeRes.json().catch(() => null);
  const text = claudeJson?.content?.[0]?.text || '';
  const parsed = tryParseJson(text);
  if (!parsed) {
    return json({ error: 'ocr_parse_failed', rawExcerpt: text.slice(0, 500) }, 422);
  }

  const warnings = [];
  const items = Array.isArray(parsed.items) ? parsed.items.map((it, idx) => {
    let categoryId = String(it.categoryId || '').trim();
    if (!VALID_IDS.has(categoryId)) {
      warnings.push({ index: idx, message: `invalid categoryId "${categoryId}" → food_other` });
      categoryId = 'food_other';
    }
    return {
      itemName: String(it.itemName || '').trim(),
      amount: Math.round(Number(it.amount) || 0),
      categoryId,
      confidence: typeof it.confidence === 'number' ? it.confidence : null,
    };
  }) : [];

  return json({
    receiptId: clientReceiptId ? String(clientReceiptId) : generateReceiptId(),
    shop: String(parsed.shop || '').trim(),
    date: String(parsed.date || new Date().toISOString().slice(0, 10)),
    items,
    warnings,
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function tryParseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  return null;
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function generateReceiptId(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `R-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
