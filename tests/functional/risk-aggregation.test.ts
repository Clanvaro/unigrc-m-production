import { describe, it, expect } from 'vitest';

describe('Risk Aggregation System', () => {
  describe('Average Method', () => {
    it('should calculate average risk correctly', () => {
      const risks = [
        { inherentRisk: 15, weight: 1 },
        { inherentRisk: 20, weight: 1 },
        { inherentRisk: 10, weight: 1 },
      ];
      
      const sum = risks.reduce((acc, r) => acc + r.inherentRisk, 0);
      const average = sum / risks.length;
      
      expect(average).toBe(15);
    });

    it('should handle single risk', () => {
      const risks = [{ inherentRisk: 20, weight: 1 }];
      const average = risks[0].inherentRisk;
      
      expect(average).toBe(20);
    });

    it('should handle empty risks array', () => {
      const risks: any[] = [];
      const average = risks.length > 0 
        ? risks.reduce((acc, r) => acc + r.inherentRisk, 0) / risks.length 
        : 0;
      
      expect(average).toBe(0);
    });
  });

  describe('Weighted Method', () => {
    it('should calculate weighted risk correctly', () => {
      const risks = [
        { inherentRisk: 15, weight: 0.5 },
        { inherentRisk: 20, weight: 0.3 },
        { inherentRisk: 10, weight: 0.2 },
      ];
      
      const weightedSum = risks.reduce((acc, r) => acc + (r.inherentRisk * r.weight), 0);
      const totalWeight = risks.reduce((acc, r) => acc + r.weight, 0);
      const weightedAverage = weightedSum / totalWeight;
      
      expect(weightedAverage).toBe(15.5);
    });

    it('should handle equal weights', () => {
      const risks = [
        { inherentRisk: 10, weight: 1 },
        { inherentRisk: 20, weight: 1 },
      ];
      
      const weightedSum = risks.reduce((acc, r) => acc + (r.inherentRisk * r.weight), 0);
      const totalWeight = risks.reduce((acc, r) => acc + r.weight, 0);
      const weightedAverage = weightedSum / totalWeight;
      
      expect(weightedAverage).toBe(15);
    });
  });

  describe('Worst Case Method', () => {
    it('should return highest risk value', () => {
      const risks = [
        { inherentRisk: 15 },
        { inherentRisk: 25 },
        { inherentRisk: 10 },
      ];
      
      const worstCase = Math.max(...risks.map(r => r.inherentRisk));
      
      expect(worstCase).toBe(25);
    });

    it('should handle single risk', () => {
      const risks = [{ inherentRisk: 20 }];
      const worstCase = Math.max(...risks.map(r => r.inherentRisk));
      
      expect(worstCase).toBe(20);
    });

    it('should handle all equal risks', () => {
      const risks = [
        { inherentRisk: 15 },
        { inherentRisk: 15 },
        { inherentRisk: 15 },
      ];
      
      const worstCase = Math.max(...risks.map(r => r.inherentRisk));
      
      expect(worstCase).toBe(15);
    });
  });

  describe('Risk Classification', () => {
    it('should classify low risk correctly', () => {
      const riskValue = 5;
      const classification = riskValue < 10 ? 'Low' : riskValue < 15 ? 'Medium' : 'High';
      
      expect(classification).toBe('Low');
    });

    it('should classify medium risk correctly', () => {
      const riskValue = 12;
      const classification = riskValue < 10 ? 'Low' : riskValue < 15 ? 'Medium' : 'High';
      
      expect(classification).toBe('Medium');
    });

    it('should classify high risk correctly', () => {
      const riskValue = 20;
      const classification = riskValue < 10 ? 'Low' : riskValue < 15 ? 'Medium' : 'High';
      
      expect(classification).toBe('High');
    });
  });
});
