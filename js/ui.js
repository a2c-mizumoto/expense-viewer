import { findById } from '../data/categories.js';

function yen(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

function toMonthKey(date) {
  return date.slice(0, 7);
}

function formatMonthLabel(key) {
  const [y, m] = key.split('-');
  return `${y}年${Number(m)}月`;
}

function formatDateShort(date) {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function listMonths(items) {
  const set = new Set(items.map((it) => toMonthKey(it.date)));
  return [...set].sort().reverse();
}

export function filterByMonth(items, month) {
  if (!month || month === 'all') return items;
  return items.filter((it) => toMonthKey(it.date) === month);
}

export function renderMonthSelect(selectEl, months, current) {
  const options = [['all', '全期間'], ...months.map((m) => [m, formatMonthLabel(m)])];
  selectEl.innerHTML = '';
  for (const [value, label] of options) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === current) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

export function renderSummary(items, month) {
  const labelEl = document.getElementById('summary-label');
  const totalEl = document.getElementById('summary-total');
  const foodEl = document.getElementById('summary-food');
  const nonfoodEl = document.getElementById('summary-nonfood');

  labelEl.textContent = month === 'all' ? '全期間' : formatMonthLabel(month);

  let total = 0;
  let food = 0;
  let nonfood = 0;
  for (const it of items) {
    total += it.amount;
    const cat = findById(it.categoryId);
    if (!cat) continue;
    if (cat.group === 'food') food += it.amount;
    else nonfood += it.amount;
  }
  totalEl.textContent = yen(total);
  foodEl.textContent = yen(food);
  nonfoodEl.textContent = yen(nonfood);
}

function buildItemCard(it) {
  const cat = findById(it.categoryId);
  const card = document.createElement('article');
  card.className = 'item-card';

  const name = document.createElement('div');
  name.className = 'item-name';
  name.textContent = it.itemName;

  const amount = document.createElement('div');
  amount.className = 'item-amount';
  amount.textContent = yen(it.amount);

  const meta = document.createElement('div');
  meta.className = 'item-meta';

  const date = document.createElement('span');
  date.textContent = formatDateShort(it.date);

  const shop = document.createElement('span');
  shop.textContent = it.shop;

  const badge = document.createElement('span');
  badge.className = 'category-badge';
  if (cat) {
    badge.style.setProperty('--badge-color', cat.color);
    badge.textContent = cat.name;
  } else {
    badge.textContent = '未分類';
  }

  meta.append(date, shop, badge);
  if (it.receiptId) {
    const rid = document.createElement('span');
    rid.textContent = it.receiptId;
    meta.appendChild(rid);
  }

  card.append(name, amount, meta);
  return card;
}

function renderItemsView(containerEl, items) {
  containerEl.innerHTML = '';
  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  for (const it of sorted) {
    containerEl.appendChild(buildItemCard(it));
  }
}

function renderReceiptsView(containerEl, items) {
  containerEl.innerHTML = '';
  const groups = new Map();
  for (const it of items) {
    const key = it.receiptId || `__single__${it.date}|${it.shop}|${it.itemName}|${it.amount}`;
    if (!groups.has(key)) {
      groups.set(key, { receiptId: it.receiptId, date: it.date, shop: it.shop, items: [] });
    }
    groups.get(key).items.push(it);
  }

  const groupList = [...groups.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  for (const g of groupList) {
    const total = g.items.reduce((s, it) => s + it.amount, 0);

    const wrap = document.createElement('section');
    wrap.className = 'receipt-group';

    const header = document.createElement('header');
    header.className = 'receipt-header';
    const meta = document.createElement('div');
    meta.className = 'receipt-meta';
    const date = document.createElement('span');
    date.textContent = formatDateShort(g.date);
    const shop = document.createElement('span');
    shop.textContent = g.shop;
    meta.append(date, shop);
    if (g.receiptId) {
      const rid = document.createElement('span');
      rid.textContent = g.receiptId;
      meta.appendChild(rid);
    }
    const totalEl = document.createElement('div');
    totalEl.className = 'receipt-total';
    totalEl.textContent = yen(total);
    header.append(meta, totalEl);

    const ul = document.createElement('ul');
    ul.className = 'receipt-items';
    for (const it of g.items) {
      const cat = findById(it.categoryId);
      const li = document.createElement('li');
      li.className = 'receipt-item';

      const nm = document.createElement('span');
      nm.className = 'receipt-item-name';
      nm.textContent = it.itemName;

      const badge = document.createElement('span');
      badge.className = 'category-badge';
      if (cat) {
        badge.style.setProperty('--badge-color', cat.color);
        badge.textContent = cat.name;
      } else {
        badge.textContent = '未分類';
      }

      const amt = document.createElement('span');
      amt.className = 'receipt-item-amount';
      amt.textContent = yen(it.amount);

      li.append(nm, badge, amt);
      ul.appendChild(li);
    }

    wrap.append(header, ul);
    containerEl.appendChild(wrap);
  }
}

export function renderList(view, items) {
  const container = document.getElementById('list-container');
  const empty = document.getElementById('empty-state');
  if (items.length === 0) {
    container.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  if (view === 'receipts') {
    renderReceiptsView(container, items);
  } else {
    renderItemsView(container, items);
  }
}

export function showToast(message, durationMs = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, durationMs);
}
