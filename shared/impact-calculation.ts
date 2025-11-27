// Cálculo de impacto basado en 7 criterios específicos
export interface ImpactFactors {
  infrastructure: number; // 1-5: Infraestructura - Interrupción de operaciones
  reputation: number; // 1-5: Reputación - Cobertura mediática
  economic: number; // 1-5: Económico - Pérdidas financieras
  permits: number; // 1-5: Permisos - Impacto regulatorio/legal
  knowhow: number; // 1-5: Knowhow - Transferencia de conocimiento
  people: number; // 1-5: Personas - Impacto en salud/seguridad
  information: number; // 1-5: Información - Filtración de datos
}

// Pesos por defecto para cada factor de impacto (en porcentajes, suman 100)
export const IMPACT_WEIGHTS = {
  infrastructure: 15, // 15%
  reputation: 15, // 15%
  economic: 25, // 25% - Mayor peso por impacto financiero directo
  permits: 20, // 20% - Alto peso por implicaciones regulatorias
  knowhow: 10, // 10%
  people: 10, // 10%
  information: 5, // 5%
} as const;

// Interface para pesos configurables de impacto
export interface ImpactWeights {
  infrastructure: number;
  reputation: number;
  economic: number;
  permits: number;
  knowhow: number;
  people: number;
  information: number;
}

/**
 * Calcula el impacto final seleccionando la dimensión que tenga mayor nivel
 * Retorna un valor entre 1 y 5 (el máximo de todos los factores)
 * @param factors Los factores de impacto (1-5 cada uno)
 * @param weights Pesos configurables opcionales. No se usan en esta implementación, se mantiene por compatibilidad
 */
export function calculateImpact(factors: ImpactFactors, weights?: ImpactWeights): number {
  // Validar y asegurar que los factores estén entre 1 y 5
  const validatedFactors = {
    infrastructure: Math.max(1, Math.min(5, factors.infrastructure)),
    reputation: Math.max(1, Math.min(5, factors.reputation)),
    economic: Math.max(1, Math.min(5, factors.economic)),
    permits: Math.max(1, Math.min(5, factors.permits)),
    knowhow: Math.max(1, Math.min(5, factors.knowhow)),
    people: Math.max(1, Math.min(5, factors.people)),
    information: Math.max(1, Math.min(5, factors.information)),
  };

  // Seleccionar el mayor nivel de todas las dimensiones
  const maxImpact = Math.max(
    validatedFactors.infrastructure,
    validatedFactors.reputation,
    validatedFactors.economic,
    validatedFactors.permits,
    validatedFactors.knowhow,
    validatedFactors.people,
    validatedFactors.information
  );

  return maxImpact;
}

/**
 * Obtiene la descripción textual de un factor de infraestructura
 */
export function getInfrastructureDescription(value: number): string {
  const descriptions = {
    1: "Zona/oficina: menos de 1 día de interrupción",
    2: "Zona/oficina: 1 día a menos de 1 semana de interrupción",
    3: "Zona/oficina: 1 semana o más de interrupción",
    4: "Operaciones de la compañía: 1 día a menos de 1 semana de interrupción",
    5: "Operaciones de la compañía: 1 semana o más de interrupción"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de reputación
 */
export function getReputationDescription(value: number): string {
  const descriptions = {
    1: "Difusión a nivel interno (proceso, equipo de trabajo)",
    2: "Cobertura adversa puntual en medios a nivel local",
    3: "Cobertura adversa de amplia difusión en medios a nivel regional/nacional",
    4: "Cobertura nacional con pérdida grave de credibilidad de grupos de interés",
    5: "Cobertura adversa de amplia difusión en medios a nivel internacional"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor económico
 */
export function getEconomicDescription(value: number): string {
  const descriptions = {
    1: "Pérdidas económicas menores $10M USD",
    2: "Pérdidas económicas entre $10M-$100M USD",
    3: "Pérdidas económicas entre $100M-$250M USD",
    4: "Pérdidas económicas entre $250M-$500M USD",
    5: "Pérdidas mayores a $500M USD"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de permisos/regulatorio
 */
export function getPermitsDescription(value: number): string {
  const descriptions = {
    1: "Incumplimiento regulatorio que no implica sanciones",
    2: "Sanciones menores por incumplimiento contractual. Demandas laborales",
    3: "Sanciones por incumplimientos provenientes del ente regulador. Inspección del trabajo",
    4: "Cierre definitivo de planta o terminal marítimo. Prohibición de celebrar contratos con organismos del Estado",
    5: "Disolución de la persona jurídica. Multas máximas del tribunal de libre competencia. Sentencia condenatoria para miembros del directorio y altos ejecutivos"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de knowhow
 */
export function getKnowhowDescription(value: number): string {
  const descriptions = {
    1: "Ineficiencia administrativa por no disponer de tecnología o conocimientos requeridos",
    2: "Pérdida de tecnología crítica interna (requiere rediseño/implementación)",
    3: "Divulgación no autorizada de conocimiento o tecnología operacional a terceros",
    4: "Divulgación no autorizada de conocimiento o tecnología estratégica a terceros",
    5: "Divulgación no autorizada de conocimiento o tecnología crítica a terceros"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de personas
 */
export function getPeopleDescription(value: number): string {
  const descriptions = {
    1: "Primeros auxilios (atención primaria)",
    2: "Daño reversible en la salud que provoque incapacidad temporal por menos de 15 días",
    3: "Daño reversible en la salud que provoque incapacidad temporal por sobre 15 días",
    4: "Daño irreversible en la salud que provoque incapacidad permanente",
    5: "Fatalidad de una o más personas"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de información
 */
export function getInformationDescription(value: number): string {
  const descriptions = {
    1: "Error en operaciones internas de algunas transacciones",
    2: "Filtración de información interna no relevante",
    3: "Filtración de información confidencial sin publicidad",
    4: "Filtración de información confidencial con publicidad",
    5: "Filtración de información 'Confidencial Externa' con/sin publicidad negativa"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene el nivel de riesgo en texto español
 */
export function getImpactLevelText(level: number): string {
  const texts = ["Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"];
  return texts[level - 1] || "Medio";
}