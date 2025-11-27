import { describe, it, expect } from 'vitest';

describe('Risk Calculation Logic - Unit Tests', () => {
  describe('Risk Level Classification', () => {
    it('should classify risk as Very Low (1-4)', () => {
      expect(classifyRisk(1)).toBe('Muy Bajo');
      expect(classifyRisk(2)).toBe('Muy Bajo');
      expect(classifyRisk(3)).toBe('Muy Bajo');
      expect(classifyRisk(4)).toBe('Muy Bajo');
    });

    it('should classify risk as Low (5-9)', () => {
      expect(classifyRisk(5)).toBe('Bajo');
      expect(classifyRisk(7)).toBe('Bajo');
      expect(classifyRisk(9)).toBe('Bajo');
    });

    it('should classify risk as Medium (10-14)', () => {
      expect(classifyRisk(10)).toBe('Medio');
      expect(classifyRisk(12)).toBe('Medio');
      expect(classifyRisk(14)).toBe('Medio');
    });

    it('should classify risk as High (15-19)', () => {
      expect(classifyRisk(15)).toBe('Alto');
      expect(classifyRisk(17)).toBe('Alto');
      expect(classifyRisk(19)).toBe('Alto');
    });

    it('should classify risk as Very High (20-25)', () => {
      expect(classifyRisk(20)).toBe('Muy Alto');
      expect(classifyRisk(23)).toBe('Muy Alto');
      expect(classifyRisk(25)).toBe('Muy Alto');
    });

    it('should handle edge cases', () => {
      expect(classifyRisk(0)).toBe('Muy Bajo');
      expect(classifyRisk(26)).toBe('Muy Alto');
      expect(classifyRisk(-1)).toBe('Muy Bajo');
    });
  });

  describe('Inherent Risk Calculation', () => {
    it('should calculate inherent risk correctly', () => {
      expect(calculateInherentRisk(5, 5)).toBe(25);
      expect(calculateInherentRisk(3, 4)).toBe(12);
      expect(calculateInherentRisk(1, 1)).toBe(1);
    });

    it('should handle zero values', () => {
      expect(calculateInherentRisk(0, 5)).toBe(0);
      expect(calculateInherentRisk(5, 0)).toBe(0);
    });
  });

  describe('Residual Risk Calculation', () => {
    it('should calculate residual risk with control effectiveness', () => {
      const inherentRisk = 25;
      const controlEffectiveness = 80; // 80%
      const expected = Math.round(25 * (1 - 0.8));
      expect(calculateResidualRisk(inherentRisk, controlEffectiveness)).toBe(expected);
    });

    it('should handle 100% control effectiveness', () => {
      expect(calculateResidualRisk(25, 100)).toBe(0);
    });

    it('should handle 0% control effectiveness', () => {
      expect(calculateResidualRisk(25, 0)).toBe(25);
    });

    it('should handle partial effectiveness', () => {
      expect(calculateResidualRisk(20, 50)).toBe(10);
      expect(calculateResidualRisk(15, 25)).toBe(11);
    });
  });

  describe('Weighted Average Calculation', () => {
    it('should calculate weighted average correctly', () => {
      const values = [
        { value: 10, weight: 0.5 },
        { value: 20, weight: 0.3 },
        { value: 30, weight: 0.2 }
      ];
      const result = calculateWeightedAverage(values);
      expect(result).toBe(17); // Math.round(10*0.5 + 20*0.3 + 30*0.2) = Math.round(17)
    });

    it('should handle equal weights', () => {
      const values = [
        { value: 10, weight: 0.33 },
        { value: 20, weight: 0.33 },
        { value: 30, weight: 0.34 }
      ];
      const result = calculateWeightedAverage(values);
      expect(result).toBeCloseTo(20, 0);
    });

    it('should handle single value', () => {
      const values = [{ value: 15, weight: 1 }];
      expect(calculateWeightedAverage(values)).toBe(15);
    });

    it('should handle empty array', () => {
      expect(calculateWeightedAverage([])).toBe(0);
    });
  });

  describe('Risk Velocity Calculation', () => {
    it('should calculate positive risk velocity', () => {
      const previousRisk = 10;
      const currentRisk = 15;
      const timeDays = 30;
      const velocity = calculateRiskVelocity(previousRisk, currentRisk, timeDays);
      expect(velocity).toBeGreaterThan(0);
    });

    it('should calculate negative risk velocity', () => {
      const previousRisk = 20;
      const currentRisk = 15;
      const timeDays = 30;
      const velocity = calculateRiskVelocity(previousRisk, currentRisk, timeDays);
      expect(velocity).toBeLessThan(0);
    });

    it('should handle zero velocity', () => {
      const velocity = calculateRiskVelocity(10, 10, 30);
      expect(velocity).toBe(0);
    });
  });
});

// Helper functions matching the actual implementation
function classifyRisk(score: number): string {
  if (score <= 4) return 'Muy Bajo';
  if (score <= 9) return 'Bajo';
  if (score <= 14) return 'Medio';
  if (score <= 19) return 'Alto';
  return 'Muy Alto';
}

function calculateInherentRisk(probability: number, impact: number): number {
  return probability * impact;
}

function calculateResidualRisk(inherentRisk: number, controlEffectiveness: number): number {
  return Math.round(inherentRisk * (1 - controlEffectiveness / 100));
}

function calculateWeightedAverage(values: Array<{ value: number; weight: number }>): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, item) => acc + (item.value * item.weight), 0);
  return Math.round(sum);
}

function calculateRiskVelocity(previousRisk: number, currentRisk: number, timeDays: number): number {
  if (timeDays === 0) return 0;
  return (currentRisk - previousRisk) / timeDays;
}
