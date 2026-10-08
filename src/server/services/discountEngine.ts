export interface DiscountEvaluationInput {
  remainingShelfLifeHours: number;
  initialShelfLifeHours: number;
  consumedFraction: number;
  originalPricePerKg: number;
}

export interface DiscountTier {
  triggered: boolean;
  discountPercent: number;
  discountedPricePerKg: number;
  tierName: string;
}

/**
 * Calculates dynamic liquidation discount tier based on remaining shelf life.
 */
export function calculateDiscountTier(input: DiscountEvaluationInput): DiscountTier {
  const { remainingShelfLifeHours, initialShelfLifeHours, consumedFraction, originalPricePerKg } = input;
  
  const remainingFraction = 1.0 - consumedFraction;
  const isThresholdMet = remainingFraction <= 0.35 || remainingShelfLifeHours <= 48.0;

  if (!isThresholdMet || remainingFraction >= 1.0) {
    return {
      triggered: false,
      discountPercent: 0.0,
      discountedPricePerKg: originalPricePerKg,
      tierName: 'Standard'
    };
  }

  let discountPercent = 0.0;
  let tierName = 'Standard';

  if (consumedFraction >= 1.0 || remainingShelfLifeHours <= 0) {
    discountPercent = 80.0;
    tierName = 'Spoilage Clearance';
  } else if (consumedFraction >= 0.85 || remainingFraction <= 0.15) {
    discountPercent = 60.0;
    tierName = 'Flash Sale Liquidation';
  } else if (consumedFraction >= 0.75 || remainingFraction <= 0.25) {
    discountPercent = 40.0;
    tierName = 'Urgent Liquidation';
  } else {
    discountPercent = 20.0;
    tierName = 'Early Warning Discount';
  }

  const discountedPricePerKg = parseFloat((originalPricePerKg * (1.0 - discountPercent / 100.0)).toFixed(2));

  return {
    triggered: true,
    discountPercent,
    discountedPricePerKg,
    tierName
  };
}
