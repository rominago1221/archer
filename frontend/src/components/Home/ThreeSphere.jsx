/**
 * ThreeSphere — wireframe metallic icosahedron rendered with three.js r128.
 *
 * Ported from design-source/archer-hero-v3 (19).html lines 2368-2515, with
 * a strict lifecycle contract:
 *
 *   mount    → scene / camera / renderer / materials / geometry
 *   resize   → window resize + ResizeObserver on parent
 *   pause    → IntersectionObserver stops the rAF loop off-screen
 *   unmount  → cancelAnimationFrame + dispose geometries / materials /
 *              textures / renderTarget + renderer.forceContextLoss +
 *              renderer.dispose + remove listeners
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeSphere() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current || canvas?.parentElement;
    if (!canvas || !container) return undefined;

    // Track disposables so teardown is exhaustive.
    const disposables = {
      geometries: [],
      materials: [],
      textures: [],
      renderTargets: [],
    };
    let rafId = null;
    let isVisible = true;
    let cancelled = false;

    // ── Scene / camera / renderer ──────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    }

    // ── Wireframe metallic sphere (icosahedron edges → tubes + joints) ──
    const sphereGroup = new THREE.Group();
    sphereGroup.position.y = -0.1;
    scene.add(sphereGroup);

    const baseGeo = new THREE.IcosahedronGeometry(1.5, 2);
    const edges = new THREE.EdgesGeometry(baseGeo);
    const positions = edges.attributes.position;
    disposables.geometries.push(baseGeo, edges);

    const metalMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e40ff,
      metalness: 1.0,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.0,
    });
    disposables.materials.push(metalMat);

    const TUBE_RADIUS = 0.025;
    for (let i = 0; i < positions.count; i += 2) {
      const start = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
      const end = new THREE.Vector3(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
      const path = new THREE.LineCurve3(start, end);
      const tubeGeo = new THREE.TubeGeometry(path, 8, TUBE_RADIUS, 6, false);
      disposables.geometries.push(tubeGeo);
      sphereGroup.add(new THREE.Mesh(tubeGeo, metalMat));

      const jointGeo = new THREE.SphereGeometry(TUBE_RADIUS * 1.1, 8, 8);
      disposables.geometries.push(jointGeo);
      const sphereJoint = new THREE.Mesh(jointGeo, metalMat);
      sphereJoint.position.copy(start);
      sphereGroup.add(sphereJoint);
    }

    // ── Lights ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const keyLight = new THREE.PointLight(0x3b5fff, 12, 20);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6366f1, 8, 20);
    rimLight.position.set(-3, -2, 2);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0x06b6d4, 5, 20);
    fillLight.position.set(2, -3, -2);
    scene.add(fillLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // ── Procedural env map (blue / white / indigo gradient) ────────────
    const cubeRT = new THREE.WebGLCubeRenderTarget(256);
    cubeRT.texture.type = THREE.HalfFloatType;
    disposables.renderTargets.push(cubeRT);

    const envScene = new THREE.Scene();
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 512;
    envCanvas.height = 512;
    const ctx = envCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#0033ff');
    grad.addColorStop(0.3, '#3b5fff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(0.7, '#6366f1');
    grad.addColorStop(1.0, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const envTex = new THREE.CanvasTexture(envCanvas);
    disposables.textures.push(envTex);

    const envGeo = new THREE.SphereGeometry(50, 32, 32);
    const envMat = new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide });
    disposables.geometries.push(envGeo);
    disposables.materials.push(envMat);
    const envMesh = new THREE.Mesh(envGeo, envMat);
    envScene.add(envMesh);

    const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
    cubeCam.update(renderer, envScene);
    metalMat.envMap = cubeRT.texture;

    // ── IntersectionObserver: pause rAF when off-viewport ──────────────
    let intersectionObs = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObs = new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting; },
        { threshold: 0.05 }
      );
      intersectionObs.observe(canvas);
    }

    // ── Animation loop ─────────────────────────────────────────────────
    let time = 0;
    const animate = () => {
      if (cancelled) return;
      rafId = requestAnimationFrame(animate);
      if (!isVisible) return;

      time += 0.01;
      sphereGroup.rotation.y += 0.0015;
      sphereGroup.rotation.x += 0.0005;

      keyLight.position.x = Math.cos(time * 0.5) * 3;
      keyLight.position.z = Math.sin(time * 0.5) * 3;
      rimLight.position.x = Math.cos(time * 0.3 + Math.PI) * 3;
      rimLight.position.z = Math.sin(time * 0.3 + Math.PI) * 3;

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ────────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObs) intersectionObs.disconnect();

      // Pick up any geometry / material that slipped past the explicit tracking.
      const collect = (root) => root.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry && !disposables.geometries.includes(obj.geometry)) {
            disposables.geometries.push(obj.geometry);
          }
          if (obj.material && !disposables.materials.includes(obj.material)) {
            disposables.materials.push(obj.material);
          }
        }
      });
      collect(scene);
      collect(envScene);

      disposables.geometries.forEach((g) => g?.dispose && g.dispose());
      disposables.materials.forEach((m) => m?.dispose && m.dispose());
      disposables.textures.forEach((t) => t?.dispose && t.dispose());
      disposables.renderTargets.forEach((rt) => rt?.dispose && rt.dispose());

      try {
        renderer.forceContextLoss();
      } catch (_) { /* not all drivers support this */ }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      data-testid="three-sphere-container"
    >
      <canvas
        ref={canvasRef}
        id="canvas-3d"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />
    </div>
  );
}
