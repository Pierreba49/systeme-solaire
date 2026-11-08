import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createPlanetControls } from '../../src/chapters/planet';

function azimuth(camera: THREE.Camera): number {
  return Math.atan2(camera.position.x, camera.position.z);
}

function rotated(frames: number, dt: number): number {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  camera.position.set(0, 0, 3);
  const doc = { addEventListener() {}, removeEventListener() {} };
  const element = { ownerDocument: doc, addEventListener() {}, removeEventListener() {}, style: {}, setPointerCapture() {}, releasePointerCapture() {}, getRootNode: () => ({}) };
  const controls = createPlanetControls(camera, element as unknown as HTMLElement, 3);
  controls.enableDamping = false; // le lissage retarde l'effet sans changer le total ; on mesure la vitesse brute
  controls.update(dt);
  const start = azimuth(camera);
  for (let i = 0; i < frames; i++) controls.update(dt);
  let delta = azimuth(camera) - start;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return Math.abs(delta);
}

describe('rotation automatique du chapitre planète', () => {
  it('tourne de 0,3 rad/s quelle que soit la cadence', () => {
    expect(rotated(30, 1 / 30)).toBeCloseTo(0.3, 3);
    expect(rotated(60, 1 / 60)).toBeCloseTo(0.3, 3);
  });

  it('deux pas de 1/30 s valent quatre pas de 1/60 s (≈ 0,02 rad)', () => {
    const a = rotated(2, 1 / 30);
    const b = rotated(4, 1 / 60);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeCloseTo(0.02, 3);
  });
});
