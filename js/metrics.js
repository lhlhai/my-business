import { formatClock } from './simulation.js';

const CUSTOMER_LABELS = {
  wholesale: 'Thương lái nhỏ',
  retail: 'Khách lẻ',
  province: 'Khách tỉnh xa',
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function toNodeType(customerType) {
  if (customerType === 'retail') return 'retail';
  if (customerType === 'province') return 'province';
  return 'wholesale_customer';
}

function makeCustomerDelivery(customer, index, baseData, nodes, routes, tasks) {
  const id = customer.id;
  const position = customer.position || { x: 20, y: 0, z: 12 };
  const quantity = Math.max(1, Number(customer.kg ?? customer.volumeKg) || 0);
  const unitsPerKm = Number(baseData.map?.unitsPerKm) || 5;
  const distanceKm = Number(customer.distanceKm) || Math.hypot(position.x, position.z) / unitsPerKm;
  const defaults = baseData.customerDefaults || {};
  const duration = Math.max(12, Number(defaults.deliveryDurationMin) || 24);
  const startMinute = 360 + ((index * duration) % 120);
  const crewSize = Math.max(1, Number(defaults.crewSize) || 2);
  const vehicle = customer.type === 'retail' ? 'Xe máy' : 'Xe tải nhỏ';
  const roundTripKm = distanceKm * 2;
  const fuelVnd = Math.round(roundTripKm * (Number(defaults.fuelCostPerKm) || 13000));
  const laborVnd = Math.round((duration / 60) * crewSize * (Number(defaults.laborCostPerHour) || 35000));
  const nodeType = toNodeType(customer.type);

  nodes.push({
    id,
    label: customer.name || `${CUSTOMER_LABELS[customer.type] || 'Khách mới'} ${index + 1}`,
    type: nodeType,
    position: { x: Number(position.x) || 0, y: Number(position.y) || 0, z: Number(position.z) || 0 },
    distanceKm,
    volumeKg: quantity,
    customers: [customer.name || CUSTOMER_LABELS[customer.type] || 'Khách mới'],
    description: customer.description || `${CUSTOMER_LABELS[customer.type] || 'Khách mới'}; nhu cầu trung bình ${quantity.toLocaleString('vi-VN')} kg/ngày.`,
    customerType: customer.type,
  });

  const taskId = `customer-delivery-${id}`;
  tasks.push({
    id: taskId,
    name: `Giao hàng: ${customer.name || 'khách mới'}`,
    kind: 'customer_delivery',
    flow: 'outbound',
    startMinute,
    duration,
    workers: crewSize,
    crew: Array.from({ length: crewSize }, (_, member) => `crew-delivery-${member + 1}`),
    vehicle,
    cost: { fuelVnd, laborVnd },
    capacity: quantity,
    inventoryDeltaKg: -quantity,
    inventoryEffectAtEnd: true,
    countsInWorkload: true,
    description: `Giao ${quantity.toLocaleString('vi-VN')} kg cho ${CUSTOMER_LABELS[customer.type] || 'khách mới'}; ước tính ${roundTripKm.toFixed(1)} km khứ hồi.`,
  });

  const legDuration = duration / 2;
  const legFuel = Math.round(fuelVnd / 2);
  routes.push({
    id: `customer-route-${id}-out`,
    from: 'depot',
    to: id,
    direction: 'outbound',
    taskId,
    distanceKm,
    durationMin: legDuration,
    costVnd: legFuel,
    vehicle,
    startMinute,
    countsTowardDailyKm: true,
    description: `Tuyến giao ${customer.name || 'khách mới'} (${CUSTOMER_LABELS[customer.type] || 'khách mới'}).`,
  });
  routes.push({
    id: `customer-route-${id}-in`,
    from: id,
    to: 'depot',
    direction: 'inbound',
    taskId,
    distanceKm,
    durationMin: legDuration,
    costVnd: legFuel,
    vehicle,
    startMinute: startMinute + legDuration,
    countsTowardDailyKm: true,
    description: `Xe trở về vựa sau khi giao ${customer.name || 'khách mới'}.`,
  });
}

/** Sinh profile khách mới với tọa độ ổn định để lưu localStorage. */
export function createCustomerProfile(type, kg, count = 0) {
  const kind = ['wholesale', 'retail', 'province'].includes(type) ? type : 'wholesale';
  const labels = { wholesale: 'Thương lái', retail: 'Khách lẻ', province: 'Khách tỉnh' };
  const radius = kind === 'retail' ? 7 + (count % 4) * 2 : kind === 'province' ? 40 + (count % 4) * 2 : 18 + (count % 5) * 3;
  const angle = count * 2.399963229728653 + (kind === 'province' ? 1.3 : kind === 'retail' ? 0.6 : 0);
  const id = globalThis.crypto?.randomUUID?.() || `customer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const position = {
    x: Math.round(Math.cos(angle) * radius * 10) / 10,
    y: 0,
    z: Math.round(Math.sin(angle) * radius * 10) / 10,
  };
  return {
    id,
    name: `${labels[kind]} mới ${String(count + 1).padStart(2, '0')}`,
    type: kind,
    kg: Math.max(1, Number(kg) || 1),
    position,
    distanceKm: Math.round((Math.hypot(position.x, position.z) / 5) * 10) / 10,
    description: `Nhu cầu trung bình ${Number(kg).toLocaleString('vi-VN')} kg/ngày.`,
  };
}

/** Kết hợp dữ liệu gốc, preset A/B/C và khách tự thêm thành một mô hình thuần. */
export function buildScenarioModel(baseData, scenarioId = 'A', savedCustomers = []) {
  const model = {
    map: copy(baseData.map || {}),
    simulation: copy(baseData.simulation || {}),
    coldStorage: copy(baseData.coldStorage || {}),
    nodes: copy(baseData.nodes || []),
    routes: copy(baseData.routes || []),
    tasks: copy(baseData.tasks || []),
    scenarioId,
    scenarioLabel: baseData.scenarioPresets?.[scenarioId]?.label || 'Hiện trạng',
  };
  const preset = baseData.scenarioPresets?.[scenarioId] || {};
  for (const task of preset.additionalTasks || []) model.tasks.push(copy(task));
  for (const route of preset.additionalRoutes || []) model.routes.push(copy(route));

  const customers = [
    ...(preset.additionalCustomers || []).map((customer) => ({ ...customer, kg: customer.kg ?? customer.volumeKg })),
    ...savedCustomers,
  ];
  customers.forEach((customer, index) => makeCustomerDelivery(customer, index, baseData, model.nodes, model.routes, model.tasks));
  return model;
}

export function calculateColdLoad(model, cycleMinute) {
  const config = model.coldStorage || {};
  let used = Number(config.initialUsedKg) || 0;
  for (const task of model.tasks || []) {
    const delta = Number(task.inventoryDeltaKg) || 0;
    if (!delta) continue;
    const start = Number(task.startMinute) || 0;
    const duration = Math.max(1, Number(task.duration) || 1);
    if (task.inventoryEffectAtEnd) {
      if (cycleMinute >= start + duration) used += delta;
      else if (cycleMinute > start) used += delta * Math.min(1, (cycleMinute - start) / duration);
    } else if (cycleMinute >= start) {
      used += delta;
    }
  }
  return Math.max(0, used);
}

export function calculateMetrics(model) {
  const deliveryTasks = model.tasks.filter((task) => task.flow === 'outbound');
  const kgPerDay = deliveryTasks.reduce((sum, task) => sum + (Number(task.capacity) || 0), 0);
  const kmPerDay = model.routes
    .filter((route) => route.countsTowardDailyKm !== false)
    .reduce((sum, route) => sum + (Number(route.distanceKm) || 0), 0);
  const laborHours = model.tasks.reduce((sum, task) => sum + ((Number(task.duration) || 0) / 60) * (Number(task.workers) || 0), 0);
  const costVnd = model.tasks.reduce((sum, task) => sum + (Number(task.cost?.fuelVnd) || 0) + (Number(task.cost?.laborVnd) || 0), 0);
  return { kgPerDay, kmPerDay, laborHours, costVnd };
}

export function getHourlyLoads(model) {
  const values = Array(24).fill(0);
  const startHour = Number(model.simulation?.startHour) || 14;
  for (const task of model.tasks) {
    if (task.countsInWorkload === false) continue;
    const duration = Math.min(1440, Math.max(1, Number(task.duration) || 1));
    const capacity = Math.max(0, Number(task.capacity) || 0);
    if (!capacity) continue;
    const wallStart = (startHour * 60 + (Number(task.startMinute) || 0)) % 1440;
    const segments = wallStart + duration <= 1440
      ? [[wallStart, wallStart + duration]]
      : [[wallStart, 1440], [0, wallStart + duration - 1440]];
    for (let hour = 0; hour < 24; hour += 1) {
      const hourStart = hour * 60;
      const hourEnd = hourStart + 60;
      let overlap = 0;
      for (const [segmentStart, segmentEnd] of segments) {
        overlap += Math.max(0, Math.min(hourEnd, segmentEnd) - Math.max(hourStart, segmentStart));
      }
      values[hour] += capacity * (overlap / duration);
    }
  }
  return values.map((value) => Math.round(value));
}

export function getCurrentTasks(model, cycleMinute) {
  return model.tasks.filter((task) => {
    const start = Number(task.startMinute) || 0;
    const duration = Number(task.duration) || 0;
    const end = start + duration;
    return end <= 1440 ? cycleMinute >= start && cycleMinute < end : cycleMinute >= start || cycleMinute < end - 1440;
  });
}

export function getContinuousWorkWarnings(model, cycleMinute) {
  const threshold = Number(model.simulation?.laborAlertHours) || 4;
  const intervalsByCrew = new Map();
  for (const task of model.tasks) {
    const start = Number(task.startMinute) || 0;
    const end = Math.min(1440, start + (Number(task.duration) || 0));
    for (const crewId of task.crew || []) {
      if (!intervalsByCrew.has(crewId)) intervalsByCrew.set(crewId, []);
      intervalsByCrew.get(crewId).push({ start, end });
    }
  }
  const displayNames = { 'crew-lan': 'Lan', 'crew-hung': 'Hùng', 'crew-mai': 'Mai', 'crew-tuan': 'Tuấn' };
  const warnings = [];
  for (const [crewId, intervals] of intervalsByCrew) {
    intervals.sort((a, b) => a.start - b.start);
    const blocks = [];
    for (const interval of intervals) {
      const current = blocks[blocks.length - 1];
      if (current && interval.start <= current.end + 5) current.end = Math.max(current.end, interval.end);
      else blocks.push({ ...interval });
    }
    const activeBlock = blocks.find((block) => cycleMinute >= block.start && cycleMinute < block.end);
    if (!activeBlock) continue;
    const hours = (cycleMinute - activeBlock.start) / 60;
    if (hours > threshold) {
      warnings.push({
        type: 'labor',
        crewId,
        worker: displayNames[crewId] || crewId,
        hours,
        threshold,
        message: `${displayNames[crewId] || crewId} đã làm liên tục ${hours.toFixed(1)} giờ (ngưỡng ${threshold} giờ).`,
      });
    }
  }
  return warnings;
}

export function getWarnings(model, cycleMinute) {
  const capacity = Number(model.coldStorage?.capacityKg) || 1;
  const threshold = Number(model.coldStorage?.alertThreshold) || 0.9;
  const used = calculateColdLoad(model, cycleMinute);
  const warnings = [];
  if (used / capacity > threshold) {
    warnings.push({
      type: 'cold',
      usedKg: used,
      capacityKg: capacity,
      ratio: used / capacity,
      message: `Kho lạnh ${Math.round((used / capacity) * 100)}% công suất (${Math.round(used).toLocaleString('vi-VN')} / ${capacity.toLocaleString('vi-VN')} kg).`,
    });
  }
  warnings.push(...getContinuousWorkWarnings(model, cycleMinute));
  return warnings;
}

export function getShipmentStatus(model, cycleMinute) {
  const dispatch = model.tasks.find((task) => task.kind === 'provincial_dispatch');
  if (!dispatch) return null;
  const dueMinute = (Number(dispatch.startMinute) || 0) + (Number(dispatch.duration) || 720);
  if (cycleMinute === dueMinute) {
    return { remainingMinutes: 0, dueClock: formatClock(dueMinute, Number(model.simulation?.startHour) || 14), arrived: true, task: dispatch };
  }
  if (cycleMinute < dispatch.startMinute || cycleMinute > dueMinute) return null;
  return {
    remainingMinutes: dueMinute - cycleMinute,
    dueClock: formatClock(dueMinute, Number(model.simulation?.startHour) || 14),
    task: dispatch,
  };
}
