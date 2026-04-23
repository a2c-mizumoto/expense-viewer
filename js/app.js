import { getAll, addMany, clearAll } from './store.js';
import { parseCSV, downloadCSV } from './csv.js';
import { renderCharts } from './charts.js';
import {
  listMonths,
  filterByMonth,
  renderMonthSelect,
  renderSummary,
  renderList,
  showToast,
} from './ui.js';

const state = {
  currentMonth: 'all',
  currentView: 'items',
};

function refresh() {
  const all = getAll();
  const months = listMonths(all);

  if (state.currentMonth !== 'all' && !months.includes(state.currentMonth)) {
    state.currentMonth = 'all';
  }

  const selectEl = document.getElementById('month-select');
  renderMonthSelect(selectEl, months, state.currentMonth);

  const filtered = filterByMonth(all, state.currentMonth);
  renderSummary(filtered, state.currentMonth);
  renderCharts(filtered);
  renderList(state.currentView, filtered);
}

function bindEvents() {
  document.getElementById('month-select').addEventListener('change', (e) => {
    state.currentMonth = e.target.value;
    refresh();
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentView = btn.dataset.view;
      document.querySelectorAll('.tab-btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      const container = document.getElementById('list-container');
      container.setAttribute('aria-labelledby', btn.id);
      refresh();
    });
  });

  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { items, errors } = parseCSV(text);
      if (items.length === 0 && errors.length > 0) {
        showToast(`インポート失敗: ${errors[0].message}`, 4500);
        e.target.value = '';
        return;
      }
      const { added, skipped } = addMany(items);
      const parts = [`${added} 件追加`];
      if (skipped > 0) parts.push(`${skipped} 件スキップ`);
      if (errors.length > 0) parts.push(`${errors.length} 件エラー`);
      showToast(parts.join(' / '), 4000);
      if (errors.length > 0) {
        console.warn('CSV import errors:', errors);
      }
      refresh();
    } catch (err) {
      showToast('読み込みエラー: ' + err.message, 4000);
    } finally {
      e.target.value = '';
    }
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    const all = getAll();
    if (all.length === 0) {
      showToast('エクスポートするデータがありません');
      return;
    }
    downloadCSV(all);
    showToast(`${all.length} 件を書き出しました`);
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    const all = getAll();
    if (all.length === 0) {
      showToast('削除するデータはありません');
      return;
    }
    if (!confirm(`保存済みの ${all.length} 件をすべて削除します。よろしいですか？`)) return;
    clearAll();
    state.currentMonth = 'all';
    refresh();
    showToast('すべてのデータを削除しました');
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

bindEvents();
refresh();
registerServiceWorker();
