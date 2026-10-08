import { describe, it, expect } from 'vitest';
import { calculateDiscountTier } from '../server/services/discountEngine.js';

describe('Dynamic Liquidation Discount Engine (Unit Tests)', () => {
  const originalPricePerKg = 5.00;

  it('returns untriggered standard tier when produce is fresh (consumed fraction < 0.65)', () => {
    const result = calculateDiscountTier({
      remainingShelfLifeHours: 120.0,
      initialShelfLifeHours: 168.0,
      consumedFraction: 0.28,
      originalPricePerKg
    });

    expect(result.triggered).toBe(false);
    expect(result.discountPercent).toBe(0.0);
    expect(result.discountedPricePerKg).toBe(5.00);
    expect(result.tierName).toBe('Standard');
  });

  it('triggers Early Warning Discount tier (20% off) when consumed fraction reaches 0.65', () => {
    // 20% discount on $5.00 -> $4.00
    const result = calculateDiscountTier({
      remainingShelfLifeHours: 58.8,
      initialShelfLifeHours: 168.0,
      consumedFraction: 0.68,
      originalPricePerKg
    });

    expect(result.triggered).toBe(true);
    expect(result.discountPercent).toBe(20.0);
    expect(result.discountedPricePerKg).toBe(4.00);
    expect(result.tierName).toBe('Early Warning Discount');
  });

  it('triggers Urgent Liquidation tier (40% off) when remaining shelf life drops below 25%', () => {
    // 40% discount on $5.00 -> $3.00
    const result = calculateDiscountTier({
      remainingShelfLifeHours: 35.0,
      initialShelfLifeHours: 168.0,
      consumedFraction: 0.79,
      originalPricePerKg
    });

    expect(result.triggered).toBe(true);
    expect(result.discountPercent).toBe(40.0);
    expect(result.discountedPricePerKg).toBe(3.00);
    expect(result.tierName).toBe('Urgent Liquidation');
  });

  it('triggers Flash Sale Liquidation tier (60% off) when remaining shelf life drops below 15%', () => {
    // 60% discount on $5.00 -> $2.00
    const result = calculateDiscountTier({
      remainingShelfLifeHours: 18.0,
      initialShelfLifeHours: 168.0,
      consumedFraction: 0.89,
      originalPricePerKg
    });

    expect(result.triggered).toBe(true);
    expect(result.discountPercent).toBe(60.0);
    expect(result.discountedPricePerKg).toBe(2.00);
    expect(result.tierName).toBe('Flash Sale Liquidation');
  });

  it('triggers Spoilage Clearance tier (80% off) when produce is expired', () => {
    // 80% discount on $5.00 -> $1.00
    const result = calculateDiscountTier({
      remainingShelfLifeHours: 0.0,
      initialShelfLifeHours: 168.0,
      consumedFraction: 1.0,
      originalPricePerKg
    });

    expect(result.triggered).toBe(true);
    expect(result.discountPercent).toBe(80.0);
    expect(result.discountedPricePerKg).toBe(1.00);
    expect(result.tierName).toBe('Spoilage Clearance');
  });
});
