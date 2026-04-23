import { findByName, findById } from '../data/categories.js';

const HEADER = ['日付', '店舗', '商品名', '金額', 'カテゴリ', 'レシートID'];

function splitCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        fields.push(cur);
        cur = '';
      } else if (ch === '"' && cur === '') {
        inQuote = true;
      } else {
        cur += ch;
      }
    }
  }
  fields.push(cur);
  return fields;
}

function escapeField(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function parseCSV(text) {
  const stripped = text.replace(/^﻿/, '');
  const lines = stripped.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { items: [], errors: [{ line: 0, message: '空のファイルです' }] };
  }
  const header = splitCSVLine(lines[0]).map((h) => h.trim());
  const headerOk = HEADER.every((h, i) => header[i] === h);
  if (!headerOk) {
    return {
      items: [],
      errors: [{ line: 1, message: `ヘッダー行が不正です。期待値: ${HEADER.join(',')}` }],
    };
  }
  const items = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const fields = splitCSVLine(raw);
    if (fields.length < 6) {
      errors.push({ line: i + 1, message: `列数不足: ${raw}` });
      continue;
    }
    const [date, shop, itemName, amountStr, categoryName, receiptId] = fields.map((f) => f.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ line: i + 1, message: `日付形式が不正: ${date}` });
      continue;
    }
    const amount = Number(amountStr.replace(/[,¥\s]/g, ''));
    if (!Number.isFinite(amount)) {
      errors.push({ line: i + 1, message: `金額が数値ではない: ${amountStr}` });
      continue;
    }
    const cat = findByName(categoryName);
    if (!cat) {
      errors.push({ line: i + 1, message: `未定義カテゴリ: ${categoryName}` });
      continue;
    }
    items.push({
      date,
      shop,
      itemName,
      amount: Math.round(amount),
      categoryId: cat.id,
      receiptId: receiptId || '',
    });
  }
  return { items, errors };
}

export function buildCSV(items) {
  const lines = [HEADER.join(',')];
  for (const it of items) {
    const cat = findById(it.categoryId);
    const row = [
      it.date,
      it.shop,
      it.itemName,
      String(it.amount),
      cat ? cat.name : '',
      it.receiptId || '',
    ].map(escapeField).join(',');
    lines.push(row);
  }
  return '﻿' + lines.join('\n') + '\n';
}

export function downloadCSV(items) {
  const csv = buildCSV(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fname = `expense-private-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
