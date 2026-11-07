import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0.08, ...options });
}

function addBox(parent, size, position, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, options));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, position, color, radialSegments = 20) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments),
    material(color),
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function makeNodeLabel(node, typeClass) {
  const element = document.createElement('div');
  element.className = `node-label ${typeClass}`;
  const title = document.createElement('span');
  title.className = 'node-label-title';
  title.textContent = node.label || node.id;
  element.appendChild(title);
  if (node.distanceKm > 0) {
    const distance = document.createElement('small');
    distance.textContent = `${Number(node.distanceKm).toLocaleString('vi-VN')} km`;
    element.appendChild(distance);
  }
  return element;
}

function addColdStore(parent) {
  const cold = new THREE.Group();
  cold.name = 'cold-store';
  cold.position.set(3.2, 0, 0.2);
  parent.add(cold);
  addBox(cold, [2.65, 2.35, 2.3], [0, 1.22, 0], 0x367f7c, { roughness: 0.48, metalness: 0.12 });
  addBox(cold, [2.34, 2.02, 0.055], [0, 1.25, 1.18], 0x173e43, { roughness: 0.52 });
  addBox(cold, [0.06, 1.82, 0.06], [0.87, 1.25, 1.225], 0x79ddd0);

  const frame = addBox(cold, [2.0, 0.19, 0.13], [0, 2.82, 1.2], 0x18353c);
  frame.userData.decoration = true;
  const fill = addBox(cold, [1.84, 0.11, 0.1], [-0.08, 2.82, 1.29], 0x43d6cc);
  fill.userData.decoration = true;
  const snow = document.createElement('div');
  snow.className = 'cold-label';
  snow.textContent = '❄';
  const snowLabel = new CSS2DObject(snow);
  snowLabel.position.set(-0.78, 2.05, 1.23);
  cold.add(snowLabel);

  return { group: cold, fill, snow };
}

function buildDepot(group) {
  addCylinder(group, 2.45, 2.65, 0.3, [0, 0.17, 0], 0x34545a, 28);
  addBox(group, [4.2, 2.2, 3.7], [0, 1.35, 0], 0xd7c59e);
  addBox(group, [4.5, 0.25, 4.0], [0, 2.58, 0], 0x5eb9ae);
  addBox(group, [0.82, 1.2, 0.12], [0.82, 0.83, 1.91], 0x365d5e);
  addBox(group, [1.05, 0.16, 0.14], [0.82, 1.49, 2.01], 0xe8a267);
  addBox(group, [0.18, 0.18, 0.15], [1.13, 0.85, 2.02], 0xf2d69e);
  const coldAssets = addColdStore(group);
  addBox(group, [1.15, 0.2, 1.0], [-2.0, 0.58, 2.0], 0xb68552);
  addBox(group, [1.15, 0.2, 1.0], [-2.0, 0.82, 2.0], 0xe0c99a);
  return coldAssets;
}

function buildPort(group, isPortB = false) {
  addCylinder(group, 2.2, 2.45, 0.28, [0, 0.14, 0], 0x34555b, 24);
  addBox(group, [4.6, 0.45, 3.3], [0.35, 0.39, 0.15], 0x677c75);
  addBox(group, [0.7, 0.35, 5.7], [-2.4, 0.33, 0.1], 0x4e8f8d);
  addBox(group, [1.5, 1.3, 1.3], [-0.9, 1.25, -0.4], isPortB ? 0x74aaa0 : 0xd1a979);
  addBox(group, [1.35, 1.0, 1.3], [0.75, 1.1, 0.5], isPortB ? 0xd1a979 : 0x74aaa0);
  addBox(group, [0.12, 2.6, 0.12], [1.85, 1.45, -0.8], 0xe8bd73);
  addBox(group, [1.35, 0.13, 0.13], [2.45, 2.55, -0.8], 0xe8bd73);
}

function buildCustomer(group, type) {
  addCylinder(group, 1.55, 1.8, 0.22, [0, 0.12, 0], 0x4a6663, 20);
  if (type === 'retail') {
    addBox(group, [2.4, 1.55, 1.8], [0, 1.0, 0], 0xe2c48f);
    addBox(group, [2.65, 0.2, 2.0], [0, 1.88, 0], 0x5fc1b4);
    addBox(group, [0.72, 1.0, 0.12], [-0.45, 0.72, 0.94], 0x8f7154);
  } else {
    addBox(group, [2.35, 1.5, 1.9], [0, 0.9, 0], 0xb7895c);
    addBox(group, [2.55, 0.22, 2.1], [0, 1.78, 0], 0xdcc394);
    addBox(group, [1.0, 0.18, 0.12], [0, 1.35, 1.02], 0x48aca7);
  }
}

function buildBusStation(group) {
  addCylinder(group, 2.0, 2.25, 0.28, [0, 0.15, 0], 0x405d5e, 24);
  addBox(group, [4.2, 0.28, 2.7], [0, 2.0, 0], 0x52aaa3);
  addBox(group, [0.22, 1.9, 0.22], [-1.75, 1.0, -1.0], 0xdac59a);
  addBox(group, [0.22, 1.9, 0.22], [1.75, 1.0, -1.0], 0xdac59a);
  addBox(group, [2.2, 0.52, 0.18], [0, 1.35, 1.4], 0x274b50);
  addBox(group, [1.55, 0.16, 0.08], [0, 1.4, 1.51], 0xe8d5ab);
}

function disposeTree(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((item) => item.dispose());
    }
  });
}

/** Dựng node và label từ data.json; geometry chỉ dùng primitive Three.js. */
export function createNodeManager(scene, labelRenderer, interaction, onSelect = () => {}) {
  const layer = new THREE.Group();
  layer.name = 'business-nodes';
  scene.add(layer);
  const records = new Map();
  const unregister = new Map();
  let labelsVisible = true;
  let coldStore = null;

  function clear() {
    for (const remove of unregister.values()) remove();
    unregister.clear();
    for (const record of records.values()) disposeTree(record.group);
    records.clear();
    while (layer.children.length) layer.remove(layer.children[0]);
    coldStore = null;
  }

  function sync(nodes) {
    clear();
    for (const node of nodes) {
      const group = new THREE.Group();
      group.name = `node-${node.id}`;
      const position = node.position || { x: 0, y: 0, z: 0 };
      group.position.set(Number(position.x) || 0, Number(position.y) || 0, Number(position.z) || 0);
      group.userData.nodeId = node.id;

      let coldAssets = null;
      if (node.type === 'depot') coldAssets = buildDepot(group);
      else if (node.type === 'port') buildPort(group, node.id === 'port-b');
      else if (node.type === 'bus-station' || node.type === 'bus_station') buildBusStation(group);
      else buildCustomer(group, node.type === 'retail' ? 'retail' : 'wholesale');

      const typeClass = node.type === 'depot'
        ? 'node-label--depot'
        : node.type === 'port'
          ? 'node-label--port'
          : ['customer', 'retail', 'wholesale', 'province', 'wholesale_customer'].includes(node.type)
            ? 'node-label--customer'
            : ['bus-station', 'bus_station'].includes(node.type)
              ? 'node-label--port'
              : '';
      const labelElement = makeNodeLabel(node, typeClass);
      const label = new CSS2DObject(labelElement);
      label.position.set(0, node.type === 'depot' ? 5.0 : ['bus-station', 'bus_station'].includes(node.type) ? 4.4 : 3.7, 0);
      label.visible = labelsVisible;
      group.add(label);
      layer.add(group);

      const record = { node, group, label };
      records.set(node.id, record);
      if (coldAssets) coldStore = coldAssets;

      unregister.set(node.id, interaction.register(group, {
        onClick: () => onSelect(node),
      }));
    }
  }

  function setLabelsVisible(value) {
    labelsVisible = Boolean(value);
    for (const { label } of records.values()) label.visible = labelsVisible;
  }

  function setColdLoad(usedKg, capacityKg, alertThreshold = 0.9) {
    if (!coldStore?.fill) return;
    const capacity = Math.max(1, Number(capacityKg) || 1);
    const used = Math.max(0, Number(usedKg) || 0);
    const ratio = Math.min(1.18, used / capacity);
    const width = 1.84;
    coldStore.fill.scale.x = ratio;
    coldStore.fill.position.x = -0.08 - width / 2 + (width * ratio) / 2;
    coldStore.fill.material.color.set(used / capacity > alertThreshold ? 0xf0705c : 0x43d6cc);
    if (coldStore.snow?.element) {
      coldStore.snow.element.textContent = `❄ ${Math.round(used).toLocaleString('vi-VN')} / ${capacity.toLocaleString('vi-VN')} kg`;
    }
  }

  return {
    sync,
    clear,
    getDataMap() { return new Map([...records].map(([id, record]) => [id, record.node])); },
    setLabelsVisible,
    setColdLoad,
    dispose() { clear(); scene.remove(layer); },
  };
}
