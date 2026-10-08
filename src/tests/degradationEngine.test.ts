import { describe, it, expect } from 'vitest';
import {
  calculateTempFactor,
  calculateHumidityPenalty,
  computeDegradation,
  ProduceParameters
} from '../server/services/degradationEngine.js';

describe('Arrhenius Shelf-Life Degradation Model (Hand-Computed Verification)', () => {
  const strawberryParams: ProduceParameters = {
    tempRef: 4.0,
    shelfLifeRef: 168.0, // 7 days = 168 hours
    q10: 2.1,
    rhMin: 85.0,
    rhMax: 95.0,
    rhPenaltyCoeff: 0.02
  };

  const leafyGreenParams: ProduceParameters = {
    tempRef: 2.0,
    shelfLifeRef: 240.0, // 10 days = 240 hours
    q10: 2.3,
    rhMin: 90.0,
    rhMax: 98.0,
    rhPenaltyCoeff: 0.025
  };

  describe('Temperature Factor (k_T)', () => {
    it('returns baseline rate (1 / L_ref) when T <= tempRef', () => {
      // Hand value: 1 / 168 = 0.00595238095
      const k = calculateTempFactor(4.0, strawberryParams.tempRef, strawberryParams.shelfLifeRef, strawberryParams.q10);
      expect(k).toBeCloseTo(1 / 168.0, 6);
    });

    it('returns exact Q10 boosted rate for 10°C temperature excursion', () => {
      // T = 14°C (10°C above 4°C reference)
      // Formula: (1 / 168.0) * (2.1)^((14 - 4)/10) = 2.1 / 168 = 0.0125 fraction/hour
      const k = calculateTempFactor(14.0, strawberryParams.tempRef, strawberryParams.shelfLifeRef, strawberryParams.q10);
      expect(k).toBeCloseTo(0.0125, 6);
    });

    it('returns exact rate for 20°C temperature excursion on leafy greens', () => {
      // T = 22°C (20°C above 2°C reference), Q10 = 2.3, L_ref = 240
      // Formula: (1 / 240.0) * (2.3)^((22 - 2)/10) = (1 / 240) * 2.3^2 = 5.29 / 240 = 0.0220416666
      const k = calculateTempFactor(22.0, leafyGreenParams.tempRef, leafyGreenParams.shelfLifeRef, leafyGreenParams.q10);
      expect(k).toBeCloseTo(5.29 / 240.0, 6);
    });
  });

  describe('Humidity Penalty Factor (f_RH)', () => {
    it('returns 1.0 when RH is within optimal range [85%, 95%]', () => {
      const f = calculateHumidityPenalty(90.0, 85.0, 95.0, 0.02);
      expect(f).toBe(1.0);
    });

    it('applies linear penalty for low humidity desiccation', () => {
      // RH = 75% (10% below min RH 85%)
      // Penalty: 1.0 + (0.02 * 10) = 1.20 (20% increased spoilage rate)
      const f = calculateHumidityPenalty(75.0, 85.0, 95.0, 0.02);
      expect(f).toBeCloseTo(1.20, 6);
    });

    it('applies linear penalty for excessive humidity decay', () => {
      // RH = 99% (4% above max RH 95%)
      // Penalty: 1.0 + (0.02 * 4) = 1.08
      const f = calculateHumidityPenalty(99.0, 85.0, 95.0, 0.02);
      expect(f).toBeCloseTo(1.08, 6);
    });
  });

  describe('Full Degradation Model Integration (computeDegradation)', () => {
    it('computes exact consumed fraction and remaining hours over 5h excursion step', () => {
      // Strawberries subjected to T = 14°C, RH = 75% for dt = 5 hours
      // k_T = 2.1 / 168 = 0.0125
      // f_RH = 1.0 + 0.02 * 10 = 1.20
      // instantaneous rate r = 0.0125 * 1.20 = 0.015 fraction/hour
      // stepFraction = 0.015 * 5 = 0.075
      // cumulativeConsumedFraction = 0 + 0.075 = 0.075
      // remainingShelfLifeHours = (1 - 0.075) * 168 = 0.925 * 168 = 155.4 hours
      const result = computeDegradation({
        temperature: 14.0,
        humidity: 75.0,
        dtHours: 5.0,
        currentConsumedFraction: 0.0,
        produceParams: strawberryParams
      });

      expect(result.temperatureFactor).toBeCloseTo(0.0125, 6);
      expect(result.humidityPenaltyFactor).toBeCloseTo(1.20, 6);
      expect(result.instantaneousRate).toBeCloseTo(0.015, 6);
      expect(result.stepFraction).toBeCloseTo(0.075, 6);
      expect(result.cumulativeConsumedFraction).toBeCloseTo(0.075, 6);
      expect(result.remainingShelfLifeHours).toBeCloseTo(155.4, 4);
      expect(result.status).toBe('OPTIMAL');
    });

    it('transitions to CRITICAL status when remaining shelf life drops below 35%', () => {
      const result = computeDegradation({
        temperature: 20.0,
        humidity: 70.0,
        dtHours: 10.0,
        currentConsumedFraction: 0.60, // starting at 60% consumed
        produceParams: strawberryParams
      });

      expect(result.cumulativeConsumedFraction).toBeGreaterThan(0.65);
      expect(result.status).toBe('CRITICAL');
    });
  });
});
