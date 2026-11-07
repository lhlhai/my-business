import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

/** Điều phối picking để node và tuyến dùng chung một raycaster. */
function createInteractionController(target, camera) {
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.8;
  const pointer = new THREE.Vector2();
  const registered = new Set();
  let hovered = null;
  let pointerDown = null;

  function interactionAt(event) {
    const bounds = target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...registered], true);
    for (const hit of hits) {
      let item = hit.object;
      while (item && !item.userData.sceneInteraction) item = item.parent;
      if (item?.userData.sceneInteraction) return item.userData.sceneInteraction;
    }
    return null;
  }

  function onPointerMove(event) {
    const next = interactionAt(event);
    if (next === hovered) {
      if (next?.onMove) next.onMove(event);
      return;
    }
    if (hovered?.onLeave) hovered.onLeave(event);
    hovered = next;
    target.style.cursor = hovered ? 'pointer' : 'grab';
    if (hovered?.onHover) hovered.onHover(event);
  }

  function onPointerDown(event) {
    pointerDown = { x: event.clientX, y: event.clientY, button: event.button };
  }

  function onPointerUp(event) {
    if (!pointerDown || pointerDown.button !== 0) {
      pointerDown = null;
      return;
    }
    const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (distance > 6) return;
    const hit = interactionAt(event);
    if (hit?.onClick) hit.onClick(event);
  }

  function onPointerLeave(event) {
    if (hovered?.onLeave) hovered.onLeave(event);
    hovered = null;
    target.style.cursor = 'grab';
  }

  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointerleave', onPointerLeave);

  return {
    register(object, handlers = {}) {
      object.userData.sceneInteraction = handlers;
      registered.add(object);
      return () => {
        registered.delete(object);
        delete object.userData.sceneInteraction;
        if (hovered === handlers) {
          hovered.onLeave?.(new PointerEvent('pointerleave'));
          hovered = null;
        }
      };
    },
    dispose() {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointerleave', onPointerLeave);
      registered.clear();
    },
  };
}

function addHighway(scene, z = -2.5) {
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x273b42, roughness: 0.95 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.035, z);
  road.receiveShadow = true;
  scene.add(road);

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x78928f, transparent: true, opacity: 0.55 });
  for (const edge of [-0.79, 0.79]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(100, 0.025, 0.035), edgeMaterial);
    stripe.position.set(0, 0.065, z + edge);
    scene.add(stripe);
  }
  const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xe8d9aa, transparent: true, opacity: 0.72 });
  for (let x = -47; x <= 47; x += 7) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.045), dashMaterial);
    dash.position.set(x, 0.068, z);
    scene.add(dash);
  }
}

/** Khởi tạo nền 3D và render loop; phần mô hình nghiệp vụ nằm ở các module riêng. */
export function createScene(container, mapConfig = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081c24);
  scene.fog = new THREE.Fog(0x081c24, 110, 240);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  camera.position.set(76, 82, 92);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setClearColor(0x081c24, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.className = 'three-canvas';
  renderer.domElement.setAttribute('aria-label', 'Bản đồ logistics 3D tương tác');
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.inset = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.target.set(0, 0, 0);
  controls.minDistance = 28;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  const defaultCamera = camera.position.clone();
  const defaultTarget = controls.target.clone();

  scene.add(new THREE.HemisphereLight(0xc6eee8, 0x193039, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffe4bd, 2.3);
  keyLight.position.set(-35, 70, 45);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x42c9c2, 0.9);
  fillLight.position.set(48, 28, -38);
  scene.add(fillLight);

  const mapSize = Number(mapConfig.size) || 100;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(mapSize, mapSize),
    new THREE.MeshStandardMaterial({ color: 0x102a32, roughness: 0.96, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(mapSize, 20, 0x3b6464, 0x25494e);
  grid.position.y = 0.018;
  for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
    material.transparent = true;
    material.opacity = 0.37;
  }
  scene.add(grid);
  addHighway(scene, Number(mapConfig.highwayZ) || -2.5);

  // Trục tọa độ mảnh giúp đọc hướng và khoảng cách trên nền bản đồ.
  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x6e9c92, transparent: true, opacity: 0.48 });
  const axis = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-49, 0.04, 0), new THREE.Vector3(49, 0.04, 0),
    new THREE.Vector3(0, 0.04, -49), new THREE.Vector3(0, 0.04, 49),
  ]);
  scene.add(new THREE.LineSegments(axis, axisMaterial));

  const interaction = createInteractionController(renderer.domElement, camera);
  let frameCallback = () => {};
  let previousTime = performance.now();
  let frameHandle = 0;
  let resizeObserver;

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
  }
  resize();
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
  } else {
    window.addEventListener('resize', resize);
  }

  function animate(now) {
    frameHandle = window.requestAnimationFrame(animate);
    const deltaSeconds = Math.min(0.1, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    frameCallback(deltaSeconds);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  frameHandle = window.requestAnimationFrame(animate);

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    controls,
    interaction,
    setFrameCallback(callback) { frameCallback = callback || (() => {}); },
    resetView() {
      camera.position.copy(defaultCamera);
      controls.target.copy(defaultTarget);
      controls.update();
    },
    dispose() {
      window.cancelAnimationFrame(frameHandle);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      interaction.dispose();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}
