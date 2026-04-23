import { findById, foodCategories, nonfoodCategories } from '../data/categories.js';

const charts = { food: null, nonfood: null };

function yen(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

function aggregate(items, groupCategories) {
  const totals = new Map();
  for (const cat of groupCategories) totals.set(cat.id, 0);
  for (const it of items) {
    const cat = findById(it.categoryId);
    if (cat && totals.has(cat.id)) {
      totals.set(cat.id, totals.get(cat.id) + it.amount);
    }
  }
  return totals;
}

function renderLegend(containerEl, totals) {
  containerEl.innerHTML = '';
  const visible = [...totals.entries()].filter(([, v]) => v > 0);
  if (visible.length === 0) {
    const li = document.createElement('li');
    li.className = 'chart-empty';
    li.textContent = 'データなし';
    containerEl.appendChild(li);
    return;
  }
  visible.sort((a, b) => b[1] - a[1]);
  for (const [catId, amount] of visible) {
    const cat = findById(catId);
    const li = document.createElement('li');

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = cat.color;

    const name = document.createElement('span');
    name.className = 'legend-name';
    name.textContent = cat.name;

    const amt = document.createElement('span');
    amt.className = 'legend-amount';
    amt.textContent = yen(amount);

    li.append(swatch, name, amt);
    containerEl.appendChild(li);
  }
}

function drawChart(key, canvasEl, centerEl, legendEl, items, groupCategories) {
  if (typeof Chart === 'undefined') return;
  const totals = aggregate(items, groupCategories);
  const visible = [...totals.entries()].filter(([, v]) => v > 0);
  const total = visible.reduce((s, [, v]) => s + v, 0);

  centerEl.textContent = total > 0 ? yen(total) : '';
  renderLegend(legendEl, totals);

  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }

  if (visible.length === 0) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    return;
  }

  const labels = visible.map(([id]) => findById(id).name);
  const data = visible.map(([, v]) => v);
  const colors = visible.map(([id]) => findById(id).color);

  charts[key] = new Chart(canvasEl, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue('--color-surface') || '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${yen(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

export function renderCharts(items) {
  drawChart(
    'food',
    document.getElementById('chart-food'),
    document.getElementById('chart-food-center'),
    document.getElementById('legend-food'),
    items,
    foodCategories(),
  );
  drawChart(
    'nonfood',
    document.getElementById('chart-nonfood'),
    document.getElementById('chart-nonfood-center'),
    document.getElementById('legend-nonfood'),
    items,
    nonfoodCategories(),
  );
}
