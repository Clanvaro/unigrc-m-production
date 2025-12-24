/**
 * Construye cache keys estables y canónicas
 * Evita problemas con JSON.stringify (orden, undefined, etc.)
 * 
 * Garantiza que la misma combinación de parámetros siempre genere la misma key
 */
export function buildStableCacheKey(
  prefix: string,
  params: Record<string, any>
): string {
  // Solo incluir keys presentes (no undefined/null/empty string)
  const presentParams: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      // Normalizar valores a string
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Para objetos, ordenar keys y stringify
        const sorted = Object.keys(value)
          .sort()
          .reduce((acc, k) => {
            if (value[k] !== undefined && value[k] !== null && value[k] !== '') {
              acc[k] = value[k];
            }
            return acc;
          }, {} as Record<string, any>);
        
        // Solo agregar si el objeto tiene al menos una propiedad
        if (Object.keys(sorted).length > 0) {
          presentParams[key] = JSON.stringify(sorted);
        }
      } else if (Array.isArray(value)) {
        // Para arrays, ordenar y stringify
        const sorted = [...value].sort();
        presentParams[key] = JSON.stringify(sorted);
      } else {
        presentParams[key] = String(value);
      }
    }
  }
  
  // Ordenar keys para consistencia
  const sortedKeys = Object.keys(presentParams).sort();
  const keyParts = sortedKeys.map(k => `${k}:${presentParams[k]}`);
  
  return `${prefix}:${keyParts.join(':')}`;
}

/**
 * Helper para construir cache keys con version
 */
export function buildVersionedCacheKey(
  prefix: string,
  version: string,
  params: Record<string, any>
): string {
  return buildStableCacheKey(`${prefix}:${version}`, params);
}

