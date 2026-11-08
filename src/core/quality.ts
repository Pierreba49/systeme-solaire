export type QualityTier = 'high' | 'low';

export interface DeviceCapabilities {
  maxTextureSize: number;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
}

export function detectQualityTier(i: DeviceCapabilities): QualityTier {
  const memoryOk = i.deviceMemoryGb === undefined || i.deviceMemoryGb >= 4;
  return i.maxTextureSize >= 8192 && i.hardwareConcurrency >= 4 && memoryOk ? 'high' : 'low';
}

const QUERY_VALUES: Record<string, QualityTier> = { haute: 'high', basse: 'low' };

/** Priorité : ?qualite=haute|basse, puis la valeur conservée dans localStorage, puis la détection. */
export function resolveQualityTier(detected: QualityTier, search: string, stored: string | null): QualityTier {
  const fromUrl = QUERY_VALUES[new URLSearchParams(search).get('qualite') ?? ''];
  if (fromUrl) return fromUrl;
  if (stored === 'high' || stored === 'low') return stored;
  return detected;
}
