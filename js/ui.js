import { cycleDay, formatClock, formatDuration } from './simulation.js';

const viNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const CUSTOMER_TYPE_LABELS = {
  wholesale: 'Thương lái nhỏ',
  wholesale_customer: 'Thương lái nhỏ',
  retail: 'Khách lẻ',
  province: 'Khách tỉnh xa',
};

function shortMoney(value) {
  const amount = Number(value) || 0;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (amount >= 1000) return `${Math.round(amount / 1000).toLocaleString('vi-VN')}k`;
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}

function addTooltipPair(container, label, value) {
  const key = document.createElement('span');
  key.textContent = label;
  const val = document.createElement('strong');
  val.textContent = value;
  container.append(key, val);
}

/** Nối toàn bộ điều khiển HTML; không tạo lại Three.js scene khi thay đổi dashboard. */
export function createUI(callbacks = {}) {
  const byId = (id) => document.getElementById(id);
  const elements = {
    loading: byId('map-loading'),
    tooltip: byId('map-tooltip'),
    scene: byId('scene-container'),
    phase: byId('map-phase'),
    currentClock: byId('current-clock'),
    timelineClock: byId('timeline-clock'),
    dayMarker: byId('day-marker'),
    slider: byId('timeline-slider'),
    playButton: byId('play-toggle'),
    playIcon: byId('play-icon'),
    playLabel: byId('play-label'),
    state: byId('timeline-status'),
    statusDot: byId('timeline-status-dot'),
    timelineRange: byId('timeline-slider'),
    kpiKg: byId('kpi-kg'),
    kpiKm: byId('kpi-km'),
    kpiHours: byId('kpi-hours'),
    kpiCost: byId('kpi-cost'),
    alertList: byId('alert-list'),
    alertCount: byId('alert-count'),
    compare: byId('scenario-comparison'),
    customerForm: byId('customer-form'),
    customerType: byId('customer-type'),
    customerKg: byId('customer-kg'),
    customerError: byId('customer-error'),
    customerList: byId('customer-list'),
    dashboardError: byId('dashboard-error'),
  };

  let chart = null;
  let activeScenario = 'A';
  let chartReady = false;
  let lastChartData = '';

  if (typeof window.Chart === 'function' && byId('load-chart')) {
    const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
    chart = new window.Chart(byId('load-chart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Khối lượng xử lý',
          data: Array(24).fill(0),
          backgroundColor: Array(24).fill('rgba(9, 150, 140, .58)'),
          hoverBackgroundColor: '#09968c',
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 13,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: { label: (context) => `${viNumber.format(context.raw)} kg xử lý` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#70827e',
              font: { size: 9 },
              maxRotation: 0,
              autoSkip: false,
              callback(value, index) { return index % 4 === 0 ? this.getLabelForValue(value) : ''; },
            },
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: 'rgba(38, 65, 67, .09)' },
            ticks: { color: '#70827e', font: { size: 9 }, maxTicksLimit: 4 },
          },
        },
      },
    });
    chartReady = true;
  }

  function setPlayState(playing) {
    elements.playButton.setAttribute('aria-pressed', String(Boolean(playing)));
    elements.playIcon.textContent = playing ? 'Ⅱ' : '▶';
    elements.playLabel.textContent = playing ? 'Tạm dừng' : 'Tiếp tục';
    elements.statusDot.classList.toggle('is-playing', Boolean(playing));
  }

  function hideTooltip() {
    elements.tooltip.hidden = true;
    elements.tooltip.classList.remove('is-pinned');
  }

  function showNodeTooltip(node) {
    const tooltip = elements.tooltip;
    tooltip.replaceChildren();
    tooltip.classList.add('is-pinned');
    tooltip.style.left = '18px';
    tooltip.style.top = '68px';

    const title = document.createElement('h3');
    title.className = 'tooltip-title';
    title.textContent = node.label || node.id;
    tooltip.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'tooltip-grid';
    addTooltipPair(grid, 'Khoảng cách tới vựa', `${Number(node.distanceKm || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`);
    addTooltipPair(grid, 'Sản lượng/ngày', `${viNumber.format(Number(node.volumeKg) || 0)} kg`);
    const related = Array.isArray(node.customers) ? node.customers.join(', ') : (node.customers || '—');
    addTooltipPair(grid, 'Khách liên quan', related || '—');
    if (node.description) addTooltipPair(grid, 'Ghi chú', node.description);
    tooltip.appendChild(grid);
    tooltip.hidden = false;
  }

  function showRouteTooltip(route, event) {
    const tooltip = elements.tooltip;
    tooltip.replaceChildren();
    tooltip.classList.remove('is-pinned');
    const title = document.createElement('h3');
    title.className = 'tooltip-title';
    title.textContent = route.description || 'Chi tiết tuyến vận chuyển';
    tooltip.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'tooltip-grid';
    addTooltipPair(grid, 'Quãng đường', `${viNumber.format(Number(route.distanceKm) || 0)} km`);
    addTooltipPair(grid, 'Thời gian', formatDuration(Number(route.durationMin) || 0));
    addTooltipPair(grid, 'Chi phí ước tính', `${(Number(route.costVnd) || 0).toLocaleString('vi-VN')} ₫`);
    addTooltipPair(grid, 'Chiều', route.direction === 'inbound' ? 'Về vựa' : 'Rời vựa');
    tooltip.appendChild(grid);

    const bounds = elements.scene.getBoundingClientRect();
    const maxLeft = Math.max(12, bounds.width - 280);
    const maxTop = Math.max(60, bounds.height - 135);
    tooltip.style.left = `${Math.max(12, Math.min(maxLeft, event.clientX - bounds.left + 14))}px`;
    tooltip.style.top = `${Math.max(62, Math.min(maxTop, event.clientY - bounds.top + 12))}px`;
    tooltip.hidden = false;
  }

  function renderAlerts(warnings, coldLoad, coldCapacity) {
    elements.alertList.replaceChildren();
    elements.alertCount.textContent = String(warnings.length);
    if (!warnings.length) {
      const okay = document.createElement('div');
      okay.className = 'alert-item alert-item--info';
      okay.textContent = `Vận hành ổn định · kho lạnh ${Math.round((coldLoad / Math.max(1, coldCapacity)) * 100)}% công suất.`;
      elements.alertList.appendChild(okay);
      return;
    }
    for (const warning of warnings) {
      const row = document.createElement('div');
      row.className = 'alert-item alert-item--critical';
      row.textContent = warning.message;
      elements.alertList.appendChild(row);
    }
  }

  function renderComparison(rows) {
    elements.compare.replaceChildren();
    for (const item of rows) {
      const row = document.createElement('div');
      row.className = 'compare-row';
      row.classList.toggle('is-active', item.id === activeScenario);
      const label = document.createElement('span');
      label.textContent = `Kịch bản ${item.id}`;
      const values = document.createElement('strong');
      values.textContent = `${viNumber.format(item.metrics.kgPerDay)} kg · ${viNumber.format(item.metrics.kmPerDay)} km · ${shortMoney(item.metrics.costVnd)}`;
      row.append(label, values);
      elements.compare.appendChild(row);
    }
  }

  function renderCustomers(customers) {
    elements.customerList.replaceChildren();
    if (!customers.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-copy';
      empty.textContent = 'Chưa có khách tự thêm. Thêm khách để xem tác động lên tuyến và công suất.';
      elements.customerList.appendChild(empty);
      return;
    }
    for (const customer of customers) {
      const item = document.createElement('li');
      item.className = 'customer-row';
      const meta = document.createElement('div');
      meta.className = 'customer-meta';
      const title = document.createElement('strong');
      title.textContent = customer.name;
      const detail = document.createElement('span');
      detail.textContent = `${CUSTOMER_TYPE_LABELS[customer.type] || 'Khách mới'} · ${viNumber.format(customer.kg)} kg/ngày`;
      meta.append(title, detail);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'customer-remove';
      remove.textContent = 'Xóa';
      remove.setAttribute('aria-label', `Xóa ${customer.name}`);
      remove.addEventListener('click', () => callbacks.onRemoveCustomer?.(customer.id));
      item.append(meta, remove);
      elements.customerList.appendChild(item);
    }
  }

  function bind() {
    elements.playButton.addEventListener('click', () => callbacks.onPlayToggle?.());
    elements.timelineRange.addEventListener('input', (event) => callbacks.onTimelineChange?.(Number(event.currentTarget.value)));
    byId('reset-view').addEventListener('click', () => callbacks.onResetView?.());
    byId('toggle-labels').addEventListener('click', (event) => {
      const button = event.currentTarget;
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(next));
      callbacks.onToggleLabels?.(next);
    });
    byId('toggle-outbound').addEventListener('click', (event) => {
      const button = event.currentTarget;
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(next));
      callbacks.onToggleRoute?.('outbound', next);
    });
    byId('toggle-inbound').addEventListener('click', (event) => {
      const button = event.currentTarget;
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(next));
      callbacks.onToggleRoute?.('inbound', next);
    });
    document.querySelectorAll('[data-scenario]').forEach((button) => {
      button.addEventListener('click', () => callbacks.onScenarioChange?.(button.dataset.scenario));
    });
    elements.customerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const type = elements.customerType.value;
      const kg = Number(elements.customerKg.value);
      if (!Number.isFinite(kg) || kg < 1 || kg > 10000) {
        elements.customerError.textContent = 'Nhập khối lượng từ 1 đến 10.000 kg/ngày.';
        elements.customerError.hidden = false;
        elements.customerKg.focus();
        return;
      }
      elements.customerError.hidden = true;
      callbacks.onAddCustomer?.({ type, kg });
    });
  }
  bind();

  function render({ minute, playing, model, metrics, warnings, hourlyLoads, comparisons, currentTasks, shipment, coldLoad }) {
    const startHour = Number(model.simulation?.startHour) || 14;
    const clock = formatClock(minute, startHour);
    const day = cycleDay(minute, startHour);
    elements.currentClock.textContent = clock;
    elements.timelineClock.textContent = clock;
    elements.dayMarker.textContent = `NGÀY ${day}`;
    elements.slider.value = String(Math.min(1440, Math.round(minute / 5) * 5));
    elements.slider.style.setProperty('--progress', `${(minute / 1440) * 100}%`);
    elements.kpiKg.textContent = viNumber.format(metrics.kgPerDay);
    elements.kpiKm.textContent = viNumber.format(metrics.kmPerDay);
    elements.kpiHours.textContent = viNumber.format(metrics.laborHours);
    elements.kpiCost.textContent = shortMoney(metrics.costVnd);
    setPlayState(playing);

    const primaryTask = currentTasks.find((task) => task.kind !== 'provincial_dispatch') || currentTasks[0];
    let stateText = primaryTask ? primaryTask.name : 'Đang chờ tác vụ tiếp theo';
    if (shipment?.arrived) {
      stateText += ` · Hàng tỉnh đã đến lúc ${shipment.dueClock} sáng nay`;
    } else if (shipment) {
      const morning = minute < 600 ? 'sáng mai' : 'sáng nay';
      stateText += ` · Còn ${formatDuration(shipment.remainingMinutes)} · Nhận hàng lúc ${shipment.dueClock} ${morning}`;
    }
    elements.state.textContent = stateText;
    elements.phase.textContent = primaryTask ? primaryTask.name : 'Không có tác vụ đang chạy';

    const capacity = Number(model.coldStorage?.capacityKg) || 1;
    renderAlerts(warnings, coldLoad, capacity);
    renderComparison(comparisons);

    if (chart && hourlyLoads) {
      const chartKey = hourlyLoads.join(',');
      if (chartKey !== lastChartData) {
        lastChartData = chartKey;
        const max = Math.max(1, ...hourlyLoads);
        chart.data.datasets[0].data = hourlyLoads;
        chart.data.datasets[0].backgroundColor = hourlyLoads.map((value) => value >= max * 0.78 ? 'rgba(201, 74, 50, .76)' : 'rgba(9, 150, 140, .58)');
        chart.update('none');
      }
    }
    elements.loading.hidden = true;
    elements.dashboardError.hidden = true;
  }

  return {
    render,
    showNodeTooltip,
    showRouteTooltip,
    hideTooltip,
    setActiveScenario(id) {
      activeScenario = id;
      document.querySelectorAll('[data-scenario]').forEach((button) => {
        const selected = button.dataset.scenario === id;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    },
    setCustomers: renderCustomers,
    showError(message) {
      elements.loading.hidden = true;
      elements.dashboardError.textContent = message;
      elements.dashboardError.hidden = false;
    },
    chartAvailable: chartReady,
  };
}
