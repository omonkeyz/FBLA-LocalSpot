import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── Pure Three.js 3D pin — no @react-three/fiber dependency ──────────────────
// Avoids the its-fine dispatcher conflict with react-leaflet hooks.
export default function BusinessPin3D({ color = '#6366f1', emoji = '📍' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width  = mount.clientWidth  || 220;
    const height = 220;

    // ── Scene / Camera / Renderer ─────────────────────────────────────────────
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const pinColor = new THREE.Color(color);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 4, 2);
    scene.add(dirLight);
    const pt1 = new THREE.PointLight(pinColor, 0.5);
    pt1.position.set(-2, 2, -2);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(pinColor, 0.3);
    pt2.position.set(2, -1, 2);
    scene.add(pt2);

    // ── Pin group (Y-rotation) ────────────────────────────────────────────────
    const pinGroup = new THREE.Group();
    scene.add(pinGroup);

    // Glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 32, 32),
      new THREE.MeshStandardMaterial({
        color: pinColor, emissive: pinColor, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.12, side: THREE.BackSide,
      }),
    );
    halo.position.set(0, 0.72, 0);
    pinGroup.add(halo);

    // Main sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 64, 64),
      new THREE.MeshStandardMaterial({
        color: pinColor, emissive: pinColor, emissiveIntensity: 0.45,
        metalness: 0.15, roughness: 0.25,
      }),
    );
    sphere.position.set(0, 0.72, 0);
    pinGroup.add(sphere);

    // Pulsing torus ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: pinColor, emissive: pinColor, emissiveIntensity: 2,
      transparent: true, opacity: 0.4,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.03, 16, 80), ringMat);
    ring.position.set(0, 0.72, 0);
    pinGroup.add(ring);

    // Cone body (tip points down)
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 1.1, 32),
      new THREE.MeshStandardMaterial({
        color: pinColor, emissive: pinColor, emissiveIntensity: 0.25,
        metalness: 0.2, roughness: 0.4,
      }),
    );
    cone.rotation.x = Math.PI;
    cone.position.set(0, -0.22, 0);
    pinGroup.add(cone);

    // Shadow disc on ground
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -0.79, 0);
    pinGroup.add(shadow);

    // ── Rotating ground platform ──────────────────────────────────────────────
    const platformMat = new THREE.MeshStandardMaterial({
      color: pinColor, emissive: pinColor, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    });
    const platform = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.0, 80), platformMat);
    platform.rotation.x = -Math.PI / 2;
    platform.position.set(0, -0.85, 0);
    scene.add(platform);

    // ── Ambient floating particles ────────────────────────────────────────────
    const particleData = Array.from({ length: 24 }, (_, i) => {
      const mat  = new THREE.MeshBasicMaterial({ color: pinColor, transparent: true, opacity: 0.3 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), mat);
      mesh.position.set(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
      );
      scene.add(mesh);
      return { mesh, offset: i * 0.4 };
    });

    // ── Emoji sprite (canvas texture) ─────────────────────────────────────────
    const emojiCanvas = document.createElement('canvas');
    emojiCanvas.width  = 128;
    emojiCanvas.height = 128;
    const ctx = emojiCanvas.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    const emojiTex = new THREE.CanvasTexture(emojiCanvas);
    const emojiSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex, transparent: true }));
    emojiSprite.scale.set(0.55, 0.55, 1);
    emojiSprite.position.set(0, 0.72, 0.5);
    pinGroup.add(emojiSprite);

    // ── Animation loop ────────────────────────────────────────────────────────
    let t = 0;
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.016;

      // Rotate whole pin on Y axis
      pinGroup.rotation.y = t * 0.6;

      // Float sphere / halo / ring / emoji up & down
      const float = Math.sin(t * 2.5) * 0.08;
      sphere.position.y     = 0.72 + float;
      halo.position.y       = 0.72 + float;
      ring.position.y       = 0.72 + float;
      emojiSprite.position.y = 0.72 + float;

      // Pulse ring scale + opacity
      const pulse = 1 + Math.sin(t * 2) * 0.06;
      ring.scale.setScalar(pulse);
      ringMat.opacity = 0.35 + Math.sin(t * 2) * 0.15;

      // Slowly rotate platform
      platform.rotation.z = t * 0.15;

      // Animate particles
      particleData.forEach(({ mesh, offset }) => {
        const pt = t + offset;
        mesh.position.y     += Math.sin(pt * 0.8) * 0.003;
        mesh.material.opacity = 0.2 + Math.sin(pt) * 0.15;
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      emojiTex.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [color, emoji]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '220px' }}
      aria-label="3D rotating location pin"
      role="img"
    />
  );
}
