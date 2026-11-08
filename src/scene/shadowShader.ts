import * as THREE from 'three';

/** Lumière réfractée par l'atmosphère terrestre : l'ombre de la Terre sur la Lune est rouge sombre, pas noire. */
export const UMBRA_TINT = new THREE.Color(0.25, 0.08, 0.05);

export interface ShadowUniforms {
  /** Centre de l'occulteur, en coordonnées monde (mutable : à mettre à jour à chaque frame). */
  occluder: THREE.Vector3;
  occluderRadius: number;
  /** Centre du Soleil, en coordonnées monde (mutable). */
  sun: THREE.Vector3;
  sunRadius: number;
  /** Teinte appliquée à la lumière directe dans l'ombre ; `UMBRA_TINT` par défaut. */
  tint?: THREE.Color;
}

/**
 * Transcription GLSL de `eclipseShadow` (src/astro/eclipseShadow.ts), en coordonnées monde.
 * Renvoie le facteur appliqué à la lumière directe : 1 hors ombre, `tint` dans l'ombre, mélange linéaire dans la pénombre.
 */
const SHADOW_FUNCTION = /* glsl */ `
uniform vec3 shadowOccluder;
uniform float shadowOccluderRadius;
uniform vec3 shadowSun;
uniform float shadowSunRadius;
uniform vec3 shadowTint;
varying vec3 vShadowWorldPos;

vec3 eclipseFactor(vec3 p) {
  vec3 axisVector = shadowOccluder - shadowSun;
  float sunDistance = length(axisVector);
  vec3 axis = axisVector / sunDistance;
  vec3 rel = p - shadowOccluder;
  float x = dot(rel, axis);
  if (x <= 0.0) return vec3(1.0);
  float radial = length(rel - axis * x);
  float umbraRadius = shadowOccluderRadius - x * (shadowSunRadius - shadowOccluderRadius) / sunDistance;
  float penumbraRadius = shadowOccluderRadius + x * (shadowSunRadius + shadowOccluderRadius) / sunDistance;
  float light = clamp((radial - umbraRadius) / (penumbraRadius - umbraRadius), 0.0, 1.0);
  return mix(shadowTint, vec3(1.0), light);
}
`;

/**
 * Ajoute l'ombre et la pénombre d'un occulteur à la lumière directe du matériau (la lumière ambiante et
 * l'émission, comme les lumières de ville de la Terre, restent inchangées). Se compose avec un
 * `onBeforeCompile` existant. Les rayons sont fixés à l'appel ; les positions sont lues à chaque frame.
 */
export function applyShadowShader(mat: THREE.MeshStandardMaterial, uniforms: ShadowUniforms): void {
  const previous = mat.onBeforeCompile;
  const previousKey = mat.customProgramCacheKey();
  const tint = uniforms.tint ?? UMBRA_TINT;
  mat.onBeforeCompile = (shader, renderer) => {
    previous.call(mat, shader, renderer);
    shader.uniforms.shadowOccluder = { value: uniforms.occluder };
    shader.uniforms.shadowOccluderRadius = { value: uniforms.occluderRadius };
    shader.uniforms.shadowSun = { value: uniforms.sun };
    shader.uniforms.shadowSunRadius = { value: uniforms.sunRadius };
    shader.uniforms.shadowTint = { value: new THREE.Vector3(tint.r, tint.g, tint.b) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShadowWorldPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShadowWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SHADOW_FUNCTION}`)
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        vec3 eclipseLight = eclipseFactor(vShadowWorldPos);
        reflectedLight.directDiffuse *= eclipseLight;
        reflectedLight.directSpecular *= eclipseLight;`,
      );
  };
  mat.customProgramCacheKey = () => `${previousKey}|eclipse-shadow`;
  mat.needsUpdate = true;
}
