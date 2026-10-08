export interface ProduceParameters {
  tempRef: number;          // Reference temperature (°C)
  shelfLifeRef: number;     // Reference shelf life (hours)
  q10: number;              // Temperature sensitivity factor (Q10)
  rhMin: number;            // Minimum optimal humidity (%)
  rhMax: number;            // Maximum optimal humidity (%)
  rhPenaltyCoeff: number;   // Penalty rate per % RH deviation
}

export interface DegradationInput {
  temperature: number;
  humidity: number;
  dtHours: number;                    // Elapsed time step in hours
  currentConsumedFraction: number;    // Accumulated fraction before this reading (0.0 to 1.0)
  produceParams: ProduceParameters;
}

export interface DegradationOutput {
  temperatureFactor: number;          // k_T(T)
  humidityPenaltyFactor: number;      // f_RH(RH)
  instantaneousRate: number;          // r(T, RH) in fraction/hour
  stepFraction: number;               // Delta D in this step
  cumulativeConsumedFraction: number; // Updated total fraction D_new
  remainingShelfLifeHours: number;    // L_rem in hours
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
}

/**
 * Calculates Arrhenius temperature rate multiplier k_T(T)
 * Formula: k_T = (1 / L_ref) * Q10^((T - T_ref) / 10) for T > T_ref, else 1 / L_ref
 */
export function calculateTempFactor(T: number, tempRef: number, shelfLifeRef: number, q10: number): number {
  const baseRate = 1.0 / shelfLifeRef;
  if (T <= tempRef) {
    return baseRate;
  }
  const deltaT = T - tempRef;
  return baseRate * Math.pow(q10, deltaT / 10.0);
}

/**
 * Calculates Relative Humidity penalty factor f_RH(RH)
 * Penalty applies if RH is outside [rhMin, rhMax] range.
 */
export function calculateHumidityPenalty(RH: number, rhMin: number, rhMax: number, rhPenaltyCoeff: number): number {
  if (RH < rhMin) {
    const deviation = rhMin - RH;
    return 1.0 + (rhPenaltyCoeff * deviation);
  }
  if (RH > rhMax) {
    const deviation = RH - rhMax;
    return 1.0 + (rhPenaltyCoeff * deviation);
  }
  return 1.0;
}

/**
 * Primary deterministic degradation function
 */
export function computeDegradation(input: DegradationInput): DegradationOutput {
  const { temperature, humidity, dtHours, currentConsumedFraction, produceParams } = input;
  const { tempRef, shelfLifeRef, q10, rhMin, rhMax, rhPenaltyCoeff } = produceParams;

  const tempFactor = calculateTempFactor(temperature, tempRef, shelfLifeRef, q10);
  const rhFactor = calculateHumidityPenalty(humidity, rhMin, rhMax, rhPenaltyCoeff);
  
  // Instantaneous rate of spoilage (fraction of total shelf life per hour)
  const instantaneousRate = tempFactor * rhFactor;

  // Fraction of shelf life consumed in this specific dt step
  const stepFraction = instantaneousRate * dtHours;

  // Updated cumulative fraction consumed
  const cumulativeConsumedFraction = Math.min(1.0, currentConsumedFraction + stepFraction);

  // Remaining shelf life in hours
  const remainingShelfLifeHours = Math.max(0.0, (1.0 - cumulativeConsumedFraction) * shelfLifeRef);

  // Status classification
  let status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED' = 'OPTIMAL';
  if (cumulativeConsumedFraction >= 1.0 || remainingShelfLifeHours <= 0) {
    status = 'EXPIRED';
  } else if (cumulativeConsumedFraction >= 0.65 || remainingShelfLifeHours <= 0.35 * shelfLifeRef) {
    status = 'CRITICAL';
  } else if (cumulativeConsumedFraction >= 0.35 || remainingShelfLifeHours <= 0.65 * shelfLifeRef) {
    status = 'WARNING';
  }

  return {
    temperatureFactor: tempFactor,
    humidityPenaltyFactor: rhFactor,
    instantaneousRate,
    stepFraction,
    cumulativeConsumedFraction,
    remainingShelfLifeHours,
    status
  };
}
