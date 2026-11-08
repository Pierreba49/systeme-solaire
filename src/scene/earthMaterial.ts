import * as THREE from 'three';

export const ATMOSPHERE_COLOR = 0x4d8cff;

export interface EarthMaterial {
  material: THREE.MeshStandardMaterial;
  /** Position monde du Soleil (mutable) ; l'origine par défaut. */
  sunWorld: THREE.Vector3;
}

/**
 * Terre : carte de jour éclairée normalement, carte de nuit (lumières des villes)
 * ajoutée en émission selon smoothstep(-0.1, 0.1, dot(N, L)) côté nuit seulement.
 */
export function createEarthMaterial(day: THREE.Texture, night: THREE.Texture): EarthMaterial {
  const sunWorld = new THREE.Vector3();
  const material = new THREE.MeshStandardMaterial({ map: day, roughness: 1, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.nightMap = { value: night };
    shader.uniforms.sunWorld = { value: sunWorld };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldNormal;\nvarying vec3 vWorldPos;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D nightMap;\nuniform vec3 sunWorld;\nvarying vec3 vWorldNormal;\nvarying vec3 vWorldPos;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float sunFacing = dot(normalize(vWorldNormal), normalize(sunWorld - vWorldPos));
        float nightWeight = 1.0 - smoothstep(-0.1, 0.1, sunFacing);
        totalEmissiveRadiance += texture2D(nightMap, vMapUv).rgb * nightWeight;`,
      );
  };
  return { material, sunWorld };
}

/** Coque d'atmosphère : Fresnel additif bleu, face arrière, vue de l'extérieur. */
export function createAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(ATMOSPHERE_COLOR) } },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        // face arrière : la normale s'éloigne de l'observateur, le terme est maximal près du limbe de la planète
        float f = clamp(-dot(normalize(vNormalView), normalize(vViewDir)) * 4.0, 0.0, 1.0);
        float a = pow(f, 2.0);
        gl_FragColor = vec4(color * a, a);
      }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}
