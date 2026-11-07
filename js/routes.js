import * as THREE from 'three';

const ROUTE_COLOR = { outbound: 0xf0a16e, inbound: 0x57d3c6 };

function disposeTree(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function createVehicle(vehicleName = '') {
  const group = new THREE.Group();
  group.name = 'animated-vehicle';
  const isMotorcycle = /xe máy/i.test(vehicleName);
  const scale = isMotorcycle ? 0.52 : 1;
  const bodyColor = isMotorcycle ? 0xf0a16e : 0xe4eee4;
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.54, metalness: 0.14 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x23383c, roughness: 0.8 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x35c6b5, roughness: 0.48, emissive: 0x0b3b37 });

  if (isMotorcycle) {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 1.05), bodyMaterial);
    chassis.position.y = 0.72;
    group.add(chassis);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.48), accentMaterial);
    crate.position.set(0, 1.05, -0.25);
    group.add(crate);
    for (const z of [-0.54, 0.56]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.14, 14), darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.31, z);
      group.add(wheel);
    }
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.64, 2.0), bodyMaterial);
    base.position.y = 0.72;
    group.add(base);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 1.15), accentMaterial);
    cargo.position.set(0, 1.38, -0.32);
    group.add(cargo);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.72, 0.64), bodyMaterial);
    cabin.position.set(0, 1.1, 0.62);
    group.add(cabin);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x51928d, roughness: 0.25, metalness: 0.18 }),
    );
    glass.position.set(0, 1.22, 0.955);
    group.add(glass);
    for (const x of [-0.62, 0.62]) {
      for (const z of [-0.62, 0.66]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14), darkMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.35, z);
        group.add(wheel);
      }
    }
  }
  group.scale.setScalar(scale);
  return group;
}

function makeCurve(route, positions) {
  const from = positions.get(route.from);
  const to = positions.get(route.to);
  if (!from || !to) return null;
  const a = new THREE.Vector3(Number(from.x) || 0, 0.28, Number(from.z) || 0);
  const b = new THREE.Vector3(Number(to.x) || 0, 0.28, Number(to.z) || 0);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  const lane = (route.direction === 'outbound' ? 1 : -1) * Math.min(1.25, length * 0.035);
  const normalX = -dz / length;
  const normalZ = dx / length;
  const p1 = new THREE.Vector3(a.x + dx * 0.34 + normalX * lane, 0.28, a.z + dz * 0.34 + normalZ * lane);
  const p2 = new THREE.Vector3(a.x + dx * 0.68 + normalX * lane, 0.28, a.z + dz * 0.68 + normalZ * lane);
  return new THREE.CatmullRomCurve3([a, p1, p2, b], false, 'centripetal', 0.25);
}

/** Tạo các đường route và xe theo dữ liệu; mọi hình học xe/đường là primitive. */
export function createRouteManager(scene, interaction, onHover = () => {}, onLeave = () => {}) {
  const layer = new THREE.Group();
  layer.name = 'transport-routes';
  scene.add(layer);
  const routeRecords = new Map();
  const unregister = new Map();
  const visibility = { outbound: true, inbound: true };

  function clear() {
    for (const remove of unregister.values()) remove();
    unregister.clear();
    for (const record of routeRecords.values()) disposeTree(record.group);
    routeRecords.clear();
    while (layer.children.length) layer.remove(layer.children[0]);
  }

  function sync(routes, nodes) {
    clear();
    const positions = new Map(nodes.map((node) => [node.id, node.position]));
    for (const route of routes) {
      const curve = makeCurve(route, positions);
      if (!curve) continue;
      const group = new THREE.Group();
      group.name = `route-${route.id}`;
      const color = ROUTE_COLOR[route.direction] || ROUTE_COLOR.outbound;
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 42, 0.12, 8, false),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.16, roughness: 0.52 }),
      );
      group.add(tube);

      // Mũi tên hình nón nhỏ làm rõ hướng chạy mà không cần texture/asset ngoài.
      const arrowT = 0.66;
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.29, 0.72, 9),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.5 }),
      );
      const arrowPoint = curve.getPointAt(arrowT);
      const tangent = curve.getTangentAt(arrowT).normalize();
      arrow.position.copy(arrowPoint);
      arrow.position.y += 0.14;
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      group.add(arrow);

      const vehicle = createVehicle(route.vehicle);
      vehicle.visible = false;
      group.add(vehicle);
      layer.add(group);
      const record = { route, group, curve, vehicle, tube };
      routeRecords.set(route.id, record);
      unregister.set(route.id, interaction.register(group, {
        onHover: (event) => onHover(route, event),
        onMove: (event) => onHover(route, event),
        onLeave: (event) => onLeave(route, event),
      }));
      setRouteVisibility(record);
    }
  }

  function setRouteVisibility(record) {
    const enabled = visibility[record.route.direction] !== false;
    record.tube.visible = enabled;
    // Mũi tên cũng ẩn khi route cùng chiều đang tắt.
    const arrow = record.group.children.find((child) => child !== record.vehicle && child !== record.tube);
    if (arrow) arrow.visible = enabled;
  }

  function setDirectionVisible(direction, value) {
    if (!(direction in visibility)) return;
    visibility[direction] = Boolean(value);
    for (const record of routeRecords.values()) setRouteVisibility(record);
  }

  function update(cycleMinute) {
    for (const record of routeRecords.values()) {
      const start = Number(record.route.startMinute) || 0;
      const duration = Math.max(1, Number(record.route.durationMin) || 1);
      const progress = (cycleMinute - start) / duration;
      const active = progress >= 0 && progress < 1;
      record.vehicle.visible = active && visibility[record.route.direction] !== false;
      if (!active) continue;
      const t = Math.max(0, Math.min(1, progress));
      const point = record.curve.getPointAt(t);
      const tangent = record.curve.getTangentAt(t).normalize();
      record.vehicle.position.copy(point);
      record.vehicle.position.y += 0.05;
      record.vehicle.rotation.y = Math.atan2(tangent.x, tangent.z);
    }
  }

  return {
    sync,
    clear,
    update,
    setDirectionVisible,
    dispose() { clear(); scene.remove(layer); },
  };
}
