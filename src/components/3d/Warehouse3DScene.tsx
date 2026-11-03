import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useUIStore } from '../../store/useUIStore';
import { Robot, WarehouseNode, ChargingStation, PackingStation, DeliveryNode } from '../../core/types';

export const Warehouse3DScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  const engine = useSimulationStore((s) => s.engine);
  const syncState = useSimulationStore((s) => s.syncState);
  const config = useSimulationStore((s) => s.config);

  const cameraMode = useUIStore((s) => s.cameraMode);
  const viewMode = useUIStore((s) => s.viewMode);
  const isFreeView = useUIStore((s) => s.isFreeView);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const showPaths = useUIStore((s) => s.layers.paths);
  const showGrid = useUIStore((s) => s.layers.grid);
  const isObstacleMode = useUIStore((s) => s.isObstacleMode);
  const selectRobot = useUIStore((s) => s.selectRobot);
  const selectStation = useUIStore((s) => s.selectStation);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const robotMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const pathLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const shelfMeshesRef = useRef<THREE.Group[]>([]);
  const stationMeshesRef = useRef<THREE.Group[]>([]);
  const deliveryNodeMeshesRef = useRef<THREE.Group[]>([]);
  const floorGridRef = useRef<THREE.GridHelper | null>(null);
  const zonePlanesRef = useRef<THREE.Group | null>(null);
  const obstacleMeshesRef = useRef<THREE.Group[]>([]);
  const animCratesRef = useRef<THREE.Group[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c1322');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(config.width * 0.5, Math.max(config.width, config.length) * 1.1, config.length * 1.3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(config.width / 2, 0, config.length / 2);
    controlsRef.current = controls;
    buildLighting(scene, config.width, config.length);
    buildWarehouseFloor(scene, config.width, config.length);
    buildShelves(scene, engine.shelfNodes);
    buildStations(scene, engine.chargingStations, engine.packingStations, engine.pickupStations);
    buildDeliveryNodes(scene, engine.deliveryNodes);
    buildWaitingBays(scene, engine.waitingNodes);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (useUIStore.getState().isObstacleMode) {
        for (const hit of intersects) {
          if (hit.point) {
            const gx = Math.round(hit.point.x);
            const gy = Math.round(hit.point.z);
            if (gx >= 0 && gx < config.width && gy >= 0 && gy < config.length) {
              engine.toggleObstacleAt({ x: gx, y: gy });
              syncState();
              return;
            }
          }
        }
        return;
      }
      for (const hit of intersects) {
        let curr: THREE.Object3D | null = hit.object;
        while (curr && curr !== scene) {
          if (curr.userData?.robotId) {
            selectRobot(curr.userData.robotId);
            return;
          }
          if (curr.userData?.stationId) {
            selectStation(curr.userData.stationId);
            return;
          }
          if (curr.userData?.deliveryNodeId) {
            selectStation(curr.userData.deliveryNodeId);
            return;
          }
          curr = curr.parent;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    let lastTime = performance.now();
    let animationFrameId: number;
    let syncThrottle = 0;

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      updateRobotVisuals(scene, engine.robotMap.values(), selectedRobotId, delta);
      updatePathRibbons(scene, engine.robotMap.values(), showPaths);
      updateObstacles(scene, engine.nodes);
      if (viewMode === 'isometric') {
        const isoTarget = new THREE.Vector3(config.width * 1.15, Math.max(config.width, config.length) * 1.25, config.length * 1.15);
        camera.position.lerp(isoTarget, 0.06);
        controls.target.lerp(new THREE.Vector3(config.width / 2, 0, config.length / 2), 0.06);
      } else if (cameraMode === 'top_down') {
        const targetPos = new THREE.Vector3(config.width / 2, Math.max(config.width, config.length) * 1.5, config.length / 2);
        camera.position.lerp(targetPos, 0.06);
        controls.target.lerp(new THREE.Vector3(config.width / 2, 0, config.length / 2), 0.06);
      } else if (cameraMode === 'follow_robot' && selectedRobotId) {
        const selRobot = engine.robotMap.get(selectedRobotId);
        if (selRobot) {
          const robTarget = new THREE.Vector3(selRobot.position.x, 0.25, selRobot.position.z);
          controls.target.lerp(robTarget, 0.08);
          const camFollowPos = new THREE.Vector3(
            selRobot.position.x + 4,
            6,
            selRobot.position.z + 5
          );
          camera.position.lerp(camFollowPos, 0.06);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [config.width, config.length]);
  useEffect(() => {
    if (!isFreeView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const mult = e.shiftKey ? 2 : e.ctrlKey ? 0.5 : 1;
      const step = 0.8 * mult;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      if (e.key === 'w' || e.key === 'W') {
        camera.position.addScaledVector(forward, step);
        controls.target.addScaledVector(forward, step);
      } else if (e.key === 's' || e.key === 'S') {
        camera.position.addScaledVector(forward, -step);
        controls.target.addScaledVector(forward, -step);
      } else if (e.key === 'a' || e.key === 'A') {
        camera.position.addScaledVector(right, -step);
        controls.target.addScaledVector(right, -step);
      } else if (e.key === 'd' || e.key === 'D') {
        camera.position.addScaledVector(right, step);
        controls.target.addScaledVector(right, step);
      } else if (e.key === 'q' || e.key === 'Q') {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.05 * mult);
        camera.position.copy(controls.target).add(offset);
      } else if (e.key === 'e' || e.key === 'E') {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.05 * mult);
        camera.position.copy(controls.target).add(offset);
      } else if (e.code === 'Space') {
        e.preventDefault();
        camera.position.set(config.width * 0.5, Math.max(config.width, config.length) * 1.1, config.length * 1.3);
        controls.target.set(config.width / 2, 0, config.length / 2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFreeView, config.width, config.length]);
  const buildLighting = (scene: THREE.Scene, width: number, length: number) => {
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#334155', 1.35);
    hemiLight.position.set(width * 0.5, 40, length * 0.5);
    scene.add(hemiLight);
    const ambientLight = new THREE.AmbientLight('#f8fafc', 1.0);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight('#ffffff', 2.5);
    dirLight.position.set(width * 0.5, 30, length * 0.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    const d = Math.max(width, length);
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);
    const chargingLight = new THREE.PointLight('#00f0ff', 3.5, 30);
    chargingLight.position.set(width / 2, 4.5, 1);
    scene.add(chargingLight);
    const deliveryLight = new THREE.PointLight('#10b981', 3.5, 30);
    deliveryLight.position.set(width / 2, 4.5, length - 1);
    scene.add(deliveryLight);
    for (let x = 2; x < width; x += 4) {
      for (let z = 2; z < length; z += 4) {
        const ceilLight = new THREE.PointLight('#ffffff', 1.5, 18, 1.2);
        ceilLight.position.set(x, 6.5, z);
        scene.add(ceilLight);
        const fixtureGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.12, 16);
        const fixtureMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          metalness: 0.8,
          roughness: 0.2,
        });
        const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
        fixture.position.set(x, 6.6, z);
        scene.add(fixture);
        const lensGeo = new THREE.CircleGeometry(0.32, 16);
        const lensMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 6.53, z);
        scene.add(lens);
      }
    }
  };
  const buildWarehouseFloor = (scene: THREE.Scene, width: number, length: number) => {
    const floorGeo = new THREE.PlaneGeometry(width + 4, length + 4);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#1e293b', 
      roughness: 0.55,  
      metalness: 0.35,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(width / 2 - 0.5, -0.01, length / 2 - 0.5);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    const grid = new THREE.GridHelper(Math.max(width, length) + 4, Math.max(width, length) + 4, '#00f0ff', '#334155');
    grid.position.set(width / 2 - 0.5, 0.005, length / 2 - 0.5);
    scene.add(grid);
    floorGridRef.current = grid;

    const zonesGroup = new THREE.Group();
    const chargeStripGeo = new THREE.PlaneGeometry(width, 1.2);
    const chargeStripMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const chargeStrip = new THREE.Mesh(chargeStripGeo, chargeStripMat);
    chargeStrip.rotation.x = -Math.PI / 2;
    chargeStrip.position.set(width / 2 - 0.5, 0.01, 0);
    zonesGroup.add(chargeStrip);
    const deliveryStripGeo = new THREE.PlaneGeometry(width, 1.2);
    const deliveryStripMat = new THREE.MeshBasicMaterial({
      color: '#10b981',
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const deliveryStrip = new THREE.Mesh(deliveryStripGeo, deliveryStripMat);
    deliveryStrip.rotation.x = -Math.PI / 2;
    deliveryStrip.position.set(width / 2 - 0.5, 0.01, length - 1);
    zonesGroup.add(deliveryStrip);

    scene.add(zonesGroup);
    zonePlanesRef.current = zonesGroup;
  };
  const buildShelves = (scene: THREE.Scene, shelves: WarehouseNode[]) => {
    for (const g of shelfMeshesRef.current) {
      scene.remove(g);
    }
    shelfMeshesRef.current = [];

    const frameGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.4,
      metalness: 0.6,
    });

    const boxColors = ['#3b82f6', '#a855f7', '#00f0ff', '#10b981', '#f59e0b', '#ec4899'];

    for (const shelf of shelves) {
      const group = new THREE.Group();
      group.position.set(shelf.x, 0.9, shelf.y);
      group.userData = { shelfId: shelf.shelfId, type: 'shelf' };

      const rack = new THREE.Mesh(frameGeo, frameMat);
      rack.castShadow = true;
      rack.receiveShadow = true;
      group.add(rack);
      for (let level = 0; level < 3; level++) {
        const binGeo = new THREE.BoxGeometry(0.32, 0.25, 0.32);
        const col = boxColors[(shelf.x + shelf.y + level) % boxColors.length];
        const binMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });

        const bin1 = new THREE.Mesh(binGeo, binMat);
        bin1.position.set(-0.18, -0.5 + level * 0.5, -0.15);
        bin1.castShadow = true;
        group.add(bin1);

        const bin2 = new THREE.Mesh(binGeo, binMat);
        bin2.position.set(0.18, -0.5 + level * 0.5, 0.15);
        bin2.castShadow = true;
        group.add(bin2);
      }

      scene.add(group);
      shelfMeshesRef.current.push(group);
    }
  };

  const buildStations = (
    scene: THREE.Scene,
    charging: ChargingStation[],
    packing: PackingStation[],
    pickup: { id: string; nodeId: string; coord: { x: number; y: number }; name: string }[]
  ) => {
    for (const g of stationMeshesRef.current) {
      scene.remove(g);
    }
    stationMeshesRef.current = [];

    for (const cs of charging) {
      const group = new THREE.Group();
      group.position.set(cs.coord.x, 0, cs.coord.y);
      group.userData = { stationId: cs.id, type: 'charging' };

      const padGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16);
      const padMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.3 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = 0.04;
      group.add(pad);

      const ringGeo = new THREE.RingGeometry(0.3, 0.42, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#00f0ff', side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.085;
      group.add(ring);

      const totemGeo = new THREE.BoxGeometry(0.2, 1.2, 0.2);
      const totemMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6 });
      const totem = new THREE.Mesh(totemGeo, totemMat);
      totem.position.set(0, 0.6, -0.35);
      group.add(totem);

      const lightGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: '#00f0ff' });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(0, 1.15, -0.22);
      group.add(light);

      scene.add(group);
      stationMeshesRef.current.push(group);
    }
  };
  const buildDeliveryNodes = (scene: THREE.Scene, deliveryNodes: DeliveryNode[]) => {
    for (const g of deliveryNodeMeshesRef.current) {
      scene.remove(g);
    }
    deliveryNodeMeshesRef.current = [];

    for (const dn of deliveryNodes) {
      const group = new THREE.Group();
      group.position.set(dn.coord.x, 0, dn.coord.y);
      group.userData = { deliveryNodeId: dn.id, type: 'delivery' };

      const platformGeo = new THREE.BoxGeometry(0.9, 0.12, 0.9);
      const platformMat = new THREE.MeshStandardMaterial({ color: '#064e3b', roughness: 0.4, metalness: 0.6 });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = 0.06;
      platform.receiveShadow = true;
      group.add(platform);

      const ringGeo = new THREE.RingGeometry(0.32, 0.42, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#10b981', side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.125;
      group.add(ring);

      const totemGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
      const totemMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.7 });
      const totem = new THREE.Mesh(totemGeo, totemMat);
      totem.position.set(0, 0.55, 0.35);
      group.add(totem);

      const beaconGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: '#10b981' });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 1.1, 0.35);
      group.add(beacon);

      scene.add(group);
      deliveryNodeMeshesRef.current.push(group);
    }
  };

  const buildWaitingBays = (scene: THREE.Scene, waitingNodes: import('../../core/types').WaitingNode[]) => {
    for (const wn of waitingNodes) {
      const group = new THREE.Group();
      group.position.set(wn.coord.x, 0, wn.coord.y);
      group.userData = { waitingNodeId: wn.id, type: 'waiting' };

      const padGeo = new THREE.BoxGeometry(0.85, 0.04, 0.85);
      const padMat = new THREE.MeshStandardMaterial({ color: '#1e1b4b', roughness: 0.5, metalness: 0.4 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.y = 0.02;
      pad.receiveShadow = true;
      group.add(pad);

      const ringGeo = new THREE.RingGeometry(0.28, 0.38, 20);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#a855f7', side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.045;
      group.add(ring);

      scene.add(group);
      stationMeshesRef.current.push(group);
    }
  };

  const updateRobotVisuals = (scene: THREE.Scene, robots: Robot[], selectedId: string | null, delta: number) => {
    const registry = robotMeshesRef.current;

    for (const robot of robots) {
      let group = registry.get(robot.id);

      if (!group) {
        group = new THREE.Group();
        group.userData = { robotId: robot.id };

        const chassisGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.22, 20);
        const chassisMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          metalness: 0.8,
          roughness: 0.3,
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 0.15;
        chassis.castShadow = true;
        group.add(chassis);

        const underglowGeo = new THREE.RingGeometry(0.3, 0.44, 24);
        const underglowMat = new THREE.MeshBasicMaterial({
          color: robot.color,
          side: THREE.DoubleSide,
        });
        const underglow = new THREE.Mesh(underglowGeo, underglowMat);
        underglow.name = 'underglow';
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.03;
        group.add(underglow);

        const headGeo = new THREE.BoxGeometry(0.12, 0.08, 0.1);
        const headMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const headlight = new THREE.Mesh(headGeo, headMat);
        headlight.position.set(0, 0.18, 0.36);
        group.add(headlight);

        const liftGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);
        const liftMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7 });
        const lift = new THREE.Mesh(liftGeo, liftMat);
        lift.position.y = 0.28;
        group.add(lift);
        const cargoGroup = new THREE.Group();
        cargoGroup.name = 'cargoGroup';

        for (let b = 0; b < 3; b++) {
          const crateGeo = new THREE.BoxGeometry(0.28, 0.18, 0.28);
          const crateMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4 });
          const crate = new THREE.Mesh(crateGeo, crateMat);
          crate.name = `crate_${b}`;
          crate.position.set(0, 0.4 + b * 0.2, 0);
          crate.castShadow = true;
          crate.visible = false;
          cargoGroup.add(crate);
        }
        group.add(cargoGroup);

        const selGeo = new THREE.RingGeometry(0.48, 0.54, 24);
        const selMat = new THREE.MeshBasicMaterial({ color: '#00f0ff', side: THREE.DoubleSide });
        const selRing = new THREE.Mesh(selGeo, selMat);
        selRing.name = 'selectionRing';
        selRing.rotation.x = -Math.PI / 2;
        selRing.position.y = 0.04;
        selRing.visible = false;
        group.add(selRing);

        const warnGeo = new THREE.ConeGeometry(0.18, 0.35, 4);
        const warnMat = new THREE.MeshBasicMaterial({ color: '#ef4444', wireframe: true });
        const warnHolo = new THREE.Mesh(warnGeo, warnMat);
        warnHolo.name = 'warnHolo';
        warnHolo.position.y = 1.0;
        warnHolo.visible = false;
        group.add(warnHolo);

        scene.add(group);
        registry.set(robot.id, group);
      }
      group.position.set(robot.position.x, 0, robot.position.z);

      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, robot.heading, 0.15);

      const underglow = group.getObjectByName('underglow') as THREE.Mesh;
      if (underglow && underglow.material instanceof THREE.MeshBasicMaterial) {
        if (robot.state === 'breakdown') {
          underglow.material.color.set('#ef4444'); 
        } else if (robot.state === 'charging' || robot.state === 'going_to_charge') {
          underglow.material.color.set('#eab308'); 
        } else if (robot.state === 'picking_up' || robot.state === 'loading') {
          underglow.material.color.set('#00f0ff'); 
        } else if (robot.state === 'delivering' || robot.state === 'unloading') {
          underglow.material.color.set('#10b981'); 
        } else if (robot.cargoCount > 0) {
          underglow.material.color.set('#f59e0b'); 
        } else if (robot.state === 'moving_to_pickup') {
          underglow.material.color.set('#3b82f6'); 
        } else if (robot.state === 'waiting_for_path' || robot.state === 'waiting') {
          underglow.material.color.set('#f43f5e'); 
        } else {
          underglow.material.color.set('#10b981'); 
        }
      }
      const cargoGroup = group.getObjectByName('cargoGroup') as THREE.Group;
      if (cargoGroup) {
        for (let b = 0; b < 3; b++) {
          const crate = cargoGroup.getObjectByName(`crate_${b}`);
          if (crate) {
            crate.visible = b < robot.cargoCount;
          }
        }
      }
      const selRing = group.getObjectByName('selectionRing') as THREE.Mesh;
      if (selRing) {
        selRing.visible = robot.id === selectedId;
      }
      const warnHolo = group.getObjectByName('warnHolo') as THREE.Mesh;
      if (warnHolo) {
        warnHolo.visible = robot.state === 'breakdown';
        if (warnHolo.visible) {
          warnHolo.rotation.y += 0.05;
        }
      }
    }
  };
  const updatePathRibbons = (scene: THREE.Scene, robots: Robot[], isVisible: boolean) => {
    const lines = pathLinesRef.current;

    for (const robot of robots) {
      let line = lines.get(robot.id);

      if (!isVisible || robot.currentRoute.length <= 1 || robot.state === 'breakdown' || robot.state === 'charging') {
        if (line) {
          line.visible = false;
        }
        continue;
      }

      const points: THREE.Vector3[] = [];
      points.push(new THREE.Vector3(robot.position.x, 0.08, robot.position.z));

      for (let i = robot.currentRouteIndex; i < robot.currentRoute.length; i++) {
        const pt = robot.currentRoute[i];
        points.push(new THREE.Vector3(pt.x, 0.08, pt.y));
      }

      if (!line) {
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: '#4ADE80',
          linewidth: 3,
          transparent: true,
          opacity: 0.9,
        });
        line = new THREE.Line(geo, mat);
        scene.add(line);
        lines.set(robot.id, line);
      } else {
        line.visible = true;
        line.geometry.setFromPoints(points);
      }
    }
  };
  const updateObstacles = (scene: THREE.Scene, nodes: WarehouseNode[]) => {
    const blockedAisles = nodes.filter((n) => n.type === 'aisle' && n.isBlocked);

    if (blockedAisles.length !== obstacleMeshesRef.current.length) {
      for (const obs of obstacleMeshesRef.current) {
        scene.remove(obs);
      }
      obstacleMeshesRef.current = [];

      for (const node of blockedAisles) {
        const group = new THREE.Group();
        group.position.set(node.x, 0, node.y);
        const crateGeo = new THREE.BoxGeometry(0.75, 0.6, 0.75);
        const crateMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.3 });
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.y = 0.3;
        crate.castShadow = true;
        group.add(crate);
        const baseGeo = new THREE.BoxGeometry(0.85, 0.04, 0.85);
        const baseMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.02;
        group.add(base);

        scene.add(group);
        obstacleMeshesRef.current.push(group);
      }
    }
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {}
      {isObstacleMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500/90 text-black px-4 py-1.5 rounded-full font-mono text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce z-10 pointer-events-none">
          <span>⚠️ OBSTACLE MODE ACTIVE: Click any aisle to place/remove blockages</span>
        </div>
      )}
    </div>
  );
};
