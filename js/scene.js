// =========================================================
// "The Core" — interactive 3D orbit scene for the hero.
// A glowing glass core + two orbiting rings (frontend /
// backend) + drifting data particles (API calls), with
// mouse-parallax and gentle idle rotation.
// =========================================================
import * as THREE from 'three';

export function initHeroScene(canvas) {
  const container = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 9);

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x404060, 1.2));

  const keyLight = new THREE.PointLight(0x5eead4, 6, 30);
  keyLight.position.set(4, 3, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xa78bfa, 5, 30);
  rimLight.position.set(-5, -2, -4);
  scene.add(rimLight);

  const warmLight = new THREE.PointLight(0xfbbf24, 2.4, 25);
  warmLight.position.set(0, -4, 3);
  scene.add(warmLight);

  // ---------- the core ----------
  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  const coreGeo = new THREE.IcosahedronGeometry(1.5, 2);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1420,
    metalness: 0.2,
    roughness: 0.15,
    transmission: 0.9,
    thickness: 1.2,
    ior: 1.4,
    transparent: true,
    opacity: 0.95,
    emissive: 0x5eead4,
    emissiveIntensity: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.1
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  coreGroup.add(core);

  const wireGeo = new THREE.IcosahedronGeometry(1.52, 1);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });
  coreGroup.add(new THREE.Mesh(wireGeo, wireMat));

  // ---------- orbit rings (frontend / backend) ----------
  function makeRing(radius, tube, color, tiltX, tiltZ) {
    const geo = new THREE.TorusGeometry(radius, tube, 16, 120);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = tiltX;
    mesh.rotation.z = tiltZ;
    return mesh;
  }

  const ringA = makeRing(2.6, 0.012, 0x5eead4, Math.PI / 2.4, 0.3);
  const ringB = makeRing(3.3, 0.01, 0xa78bfa, Math.PI / 1.8, -0.5);
  scene.add(ringA, ringB);

  // small "node" markers riding the rings (frontend/backend endpoints)
  function makeNode(color, size) {
    const geo = new THREE.SphereGeometry(size, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geo, mat);
  }
  const nodeA = makeNode(0x5eead4, 0.07);
  const nodeB = makeNode(0xa78bfa, 0.06);
  scene.add(nodeA, nodeB);

  // ---------- drifting particles (API calls / data) ----------
  const particleCount = 260;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    const r = 3.6 + Math.random() * 2.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = r * Math.cos(phi);
    speeds[i] = 0.15 + Math.random() * 0.3;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xfbbf24,
    size: 0.035,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ---------- interaction state ----------
  let targetRotX = 0, targetRotY = 0;
  let currentRotX = 0, currentRotY = 0;
  let pointerActive = false;

  function onPointerMove(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
    targetRotY = nx * 0.35;
    targetRotX = ny * 0.22;
    pointerActive = true;
  }

  window.addEventListener('pointermove', (e) => onPointerMove(e.clientX, e.clientY));
  window.addEventListener('pointerleave', () => { pointerActive = false; });

  // ---------- resize ----------
  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ---------- animation loop ----------
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const speed = reducedMotion ? 0.15 : 1;

    currentRotX += (targetRotX - currentRotX) * 0.04;
    currentRotY += (targetRotY - currentRotY) * 0.04;

    coreGroup.rotation.y = t * 0.18 * speed + currentRotY;
    coreGroup.rotation.x = Math.sin(t * 0.15) * 0.08 * speed + currentRotX;

    ringA.rotation.z += 0.0022 * speed;
    ringB.rotation.z -= 0.0016 * speed;

    nodeA.position.set(
      2.6 * Math.cos(t * 0.4 * speed),
      2.6 * Math.sin(t * 0.4 * speed) * Math.sin(Math.PI / 2.4),
      2.6 * Math.sin(t * 0.4 * speed) * Math.cos(Math.PI / 2.4)
    );
    nodeB.position.set(
      3.3 * Math.cos(-t * 0.28 * speed + 2),
      3.3 * Math.sin(-t * 0.28 * speed + 2) * Math.sin(Math.PI / 1.8),
      3.3 * Math.sin(-t * 0.28 * speed + 2) * Math.cos(Math.PI / 1.8)
    );

    particles.rotation.y = t * 0.03 * speed;
    particles.rotation.x = t * 0.015 * speed;

    camera.position.x = Math.sin(t * 0.05 * speed) * 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  return { renderer, scene, camera };
}