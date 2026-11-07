import { createScene } from './js/scene.js';
import { createNodeManager } from './js/nodes.js';
import { createRouteManager } from './js/routes.js';
import { createSimulation } from './js/simulation.js';
import {
  buildScenarioModel,
  calculateColdLoad,
  calculateMetrics,
  createCustomerProfile,
  getCurrentTasks,
  getHourlyLoads,
  getShipmentStatus,
  getWarnings,
} from './js/metrics.js';
import { createUI } from './js/ui.js';

const CUSTOMER_STORAGE_KEY = 'vuatwin.customers.v1';
const SCENARIO_STORAGE_KEY = 'vuatwin.scenario.v1';
const mapContainer = document.getElementById('scene-container');
const loadingMessage = document.getElementById('map-loading');
let sceneView;

function readLocalCustomers() {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item) => item && item.id && Number(item.kg) > 0) : [];
  } catch {
    return [];
  }
}

function readScenario() {
  try {
    const saved = localStorage.getItem(SCENARIO_STORAGE_KEY);
    return ['A', 'B', 'C'].includes(saved) ? saved : 'A';
  } catch {
    return 'A';
  }
}

function saveLocalState(customers, scenario) {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
    localStorage.setItem(SCENARIO_STORAGE_KEY, scenario);
  } catch (error) {
    console.warn('Không lưu được trạng thái vào localStorage:', error);
  }
}

function showStartupError(error) {
  console.error(error);
  loadingMessage.textContent = 'Không tải được dữ liệu mô phỏng. Hãy chạy app qua HTTP và kiểm tra data.json.';
  const errorPanel = document.getElementById('dashboard-error');
  errorPanel.textContent = `Lỗi khởi tạo: ${error.message || error}`;
  errorPanel.hidden = false;
}

async function startApp() {
  try {
    const response = await fetch(new URL('./data.json', import.meta.url));
    if (!response.ok) throw new Error(`Không tải được data.json (HTTP ${response.status}).`);
    const baseData = await response.json();
    const customers = readLocalCustomers();
    let activeScenario = readScenario();
    let model = buildScenarioModel(baseData, activeScenario, customers);
    const coldConfig = baseData.coldStorage || {};
    const ui = createUI({
      onTimelineChange: (minute) => simulation?.setMinute(minute),
      onPlayToggle: () => simulation?.toggle(),
      onResetView: () => sceneView?.resetView(),
      onToggleLabels: (visible) => nodeManager?.setLabelsVisible(visible),
      onToggleRoute: (direction, visible) => routeManager?.setDirectionVisible(direction, visible),
      onScenarioChange: (scenario) => {
        if (!['A', 'B', 'C'].includes(scenario)) return;
        activeScenario = scenario;
        saveLocalState(customers, activeScenario);
        rebuildModel();
        ui.setActiveScenario(activeScenario);
        refresh(simulation?.minute ?? 0, simulation?.playing ?? false);
      },
      onAddCustomer: ({ type, kg }) => {
        const count = customers.filter((customer) => customer.type === type).length;
        customers.push(createCustomerProfile(type, kg, count));
        saveLocalState(customers, activeScenario);
        ui.setCustomers(customers);
        rebuildModel();
        refresh(simulation?.minute ?? 0, simulation?.playing ?? false);
      },
      onRemoveCustomer: (id) => {
        const index = customers.findIndex((customer) => customer.id === id);
        if (index < 0) return;
        customers.splice(index, 1);
        saveLocalState(customers, activeScenario);
        ui.setCustomers(customers);
        rebuildModel();
        refresh(simulation?.minute ?? 0, simulation?.playing ?? false);
      },
    });

    sceneView = createScene(mapContainer, baseData.map);
    const nodeManager = createNodeManager(sceneView.scene, sceneView.labelRenderer, sceneView.interaction, (node) => ui.showNodeTooltip(node));
    const routeManager = createRouteManager(
      sceneView.scene,
      sceneView.interaction,
      (route, event) => ui.showRouteTooltip(route, event),
      () => ui.hideTooltip(),
    );

    let comparisonRows = [];
    function rebuildModel() {
      model = buildScenarioModel(baseData, activeScenario, customers);
      nodeManager.sync(model.nodes);
      routeManager.sync(model.routes, model.nodes);
      nodeManager.setColdLoad(coldConfig.initialUsedKg, coldConfig.capacityKg, coldConfig.alertThreshold);
      nodeManager.setLabelsVisible(document.getElementById('toggle-labels').getAttribute('aria-pressed') === 'true');
      comparisonRows = ['A', 'B', 'C'].map((id) => {
        const scenarioModel = buildScenarioModel(baseData, id, customers);
        return { id, metrics: calculateMetrics(scenarioModel) };
      });
      ui.setCustomers(customers);
      ui.setActiveScenario(activeScenario);
    }

    function refresh(minute, playing) {
      const currentMetrics = calculateMetrics(model);
      const coldLoad = calculateColdLoad(model, minute);
      const warnings = getWarnings(model, minute);
      const currentTasks = getCurrentTasks(model, minute);
      const shipment = getShipmentStatus(model, minute);
      nodeManager.setColdLoad(coldLoad, coldConfig.capacityKg, coldConfig.alertThreshold);
      routeManager.update(minute);
      ui.render({
        minute,
        playing,
        model,
        metrics: currentMetrics,
        warnings,
        hourlyLoads: getHourlyLoads(model),
        comparisons: comparisonRows,
        currentTasks,
        shipment,
        coldLoad,
      });
    }

    let simulation;
    // Tạo controller sau khi hàm refresh đã sẵn sàng; play bắt đầu từ 14:00.
    simulation = createSimulation(baseData.simulation, (minute, playing) => refresh(minute, playing));
    rebuildModel();
    ui.setActiveScenario(activeScenario);
    sceneView.setFrameCallback((deltaSeconds) => simulation.update(deltaSeconds));
    refresh(simulation.minute, simulation.playing);
    document.getElementById('cycle-label').textContent = `CHU KỲ ${String(baseData.simulation.startHour).padStart(2, '0')}:00 → ${String(baseData.simulation.startHour).padStart(2, '0')}:00`;
  } catch (error) {
    showStartupError(error);
  }
}

startApp();
