const ITEMS_KEY = 'expense-viewer:items:v1';
const META_KEY = 'expense-viewer:meta:v1';

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function readRaw() {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), version: 1 }));
}

function dedupeKey(it) {
  return [it.date, it.shop, it.itemName, it.amount, it.receiptId].join('|');
}

export function getAll() {
  return readRaw();
}

export function addMany(newItems) {
  const current = readRaw();
  const seen = new Set(current.map(dedupeKey));
  let added = 0;
  let skipped = 0;
  for (const it of newItems) {
    const key = dedupeKey(it);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    current.push({ ...it, id: it.id || uuid() });
    added += 1;
  }
  writeRaw(current);
  return { added, skipped };
}

export function clearAll() {
  localStorage.removeItem(ITEMS_KEY);
  localStorage.removeItem(META_KEY);
}

export function getMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
