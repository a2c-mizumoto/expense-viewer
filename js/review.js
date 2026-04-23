import { foodCategories, nonfoodCategories } from '../data/categories.js';

let state = null;

export function renderReview(container, ocr, { onConfirm, onCancel }) {
  state = {
    receiptId: ocr.receiptId,
    shop: ocr.shop || '',
    date: normalizeDate(ocr.date),
    rows: (ocr.items || []).map((it) => ({
      itemName: it.itemName || '',
      amount: Number(it.amount) || 0,
      categoryId: it.categoryId || 'food_other',
      confidence: typeof it.confidence === 'number' ? it.confidence : null,
    })),
  };

  container.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-body modal-review">
      <h2 class="modal-title">内容を確認</h2>
      ${(ocr.warnings && ocr.warnings.length > 0) ? `<p class="modal-warning">⚠ ${ocr.warnings.length} 件を自動補正しました</p>` : ''}
      <div class="review-header">
        <label class="review-label">店舗
          <input type="text" id="review-shop" value="${escapeAttr(state.shop)}" />
        </label>
        <label class="review-label">日付
          <input type="date" id="review-date" value="${escapeAttr(state.date)}" />
        </label>
        <p class="review-receiptid">receiptId: ${escapeHtml(state.receiptId)}</p>
      </div>
      <ul class="review-list" id="review-list"></ul>
      <button class="btn" id="review-add-row" type="button">+ 行を追加</button>
      <div class="modal-footer">
        <button class="btn" id="review-cancel" type="button">キャンセル</button>
        <button class="btn btn-primary" id="review-confirm" type="button">登録</button>
      </div>
    </div>
  `;

  renderRows(container);

  container.querySelector('#review-shop').addEventListener('input', (e) => {
    state.shop = e.target.value;
  });
  container.querySelector('#review-date').addEventListener('input', (e) => {
    state.date = e.target.value;
  });
  container.querySelector('#review-add-row').addEventListener('click', () => {
    state.rows.push({ itemName: '', amount: 0, categoryId: 'food_other', confidence: null });
    renderRows(container);
  });
  container.querySelector('#review-cancel').addEventListener('click', () => onCancel && onCancel());
  container.querySelector('#review-confirm').addEventListener('click', () => {
    const items = buildItems();
    if (items.length === 0) {
      alert('登録できる行がありません。商品名と金額(1円以上)を入力してください。');
      return;
    }
    onConfirm && onConfirm(items);
  });
}

function renderRows(container) {
  const list = container.querySelector('#review-list');
  list.innerHTML = state.rows.map((row, idx) => rowHtml(row, idx)).join('');
  list.querySelectorAll('input[data-field]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.index);
      const f = e.target.dataset.field;
      state.rows[i][f] = f === 'amount' ? (Number(e.target.value) || 0) : e.target.value;
    });
  });
  list.querySelectorAll('select[data-field]').forEach((el) => {
    el.addEventListener('change', (e) => {
      const i = Number(e.target.dataset.index);
      state.rows[i][e.target.dataset.field] = e.target.value;
    });
  });
  list.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.index);
      state.rows.splice(i, 1);
      renderRows(container);
    });
  });
}

function rowHtml(row, idx) {
  const low = typeof row.confidence === 'number' && row.confidence < 0.7;
  const opts = (cats) => cats.map((c) =>
    `<option value="${c.id}"${c.id === row.categoryId ? ' selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');
  return `
    <li class="review-row${low ? ' is-lowconf' : ''}">
      <input class="review-input review-name" type="text" data-index="${idx}" data-field="itemName" value="${escapeAttr(row.itemName)}" placeholder="商品名" />
      <input class="review-input review-amount" type="number" inputmode="numeric" step="1" min="0" data-index="${idx}" data-field="amount" value="${Math.round(Number(row.amount) || 0)}" />
      <select class="review-select" data-index="${idx}" data-field="categoryId">
        <optgroup label="食品">${opts(foodCategories())}</optgroup>
        <optgroup label="食品以外">${opts(nonfoodCategories())}</optgroup>
      </select>
      <button class="review-delete" type="button" aria-label="この行を削除" data-delete data-index="${idx}">×</button>
    </li>
  `;
}

function buildItems() {
  return state.rows
    .filter((r) => r.itemName.trim() && Math.round(Number(r.amount) || 0) > 0)
    .map((r) => ({
      date: state.date,
      shop: state.shop.trim(),
      itemName: r.itemName.trim(),
      amount: Math.round(Number(r.amount) || 0),
      categoryId: r.categoryId,
      receiptId: state.receiptId,
    }));
}

function normalizeDate(s) {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}
