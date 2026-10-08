import { z } from 'zod';

export const TelemetryIngestSchema = z.object({
  temperature: z.number({ required_error: 'temperature is required' })
    .min(-50, 'Temperature cannot be below -50°C')
    .max(100, 'Temperature cannot exceed 100°C'),
  humidity: z.number({ required_error: 'humidity is required' })
    .min(0, 'Humidity cannot be below 0%')
    .max(100, 'Humidity cannot exceed 100%'),
  timestamp: z.string().optional(),
  transitTimeHours: z.number().optional()
});

export const CreateShipmentSchema = z.object({
  produceTypeId: z.string().min(1, 'produceTypeId is required'),
  origin: z.string().min(1, 'origin is required'),
  destination: z.string().min(1, 'destination is required'),
  quantityKg: z.number().positive('quantityKg must be positive'),
  initialQuantityKg: z.number().positive('initialQuantityKg must be positive').optional(),
  initialPricePerKg: z.number().positive('initialPricePerKg must be positive').optional().default(5.0),
  scenario: z.enum(['stable', 'gradual_warmup', 'sudden_excursion', 'door_open_spike']).default('stable'),
  simulating: z.boolean().optional().default(true),
  simIntervalSeconds: z.number().int().min(1).max(60).optional().default(5)
});

export const ToggleSimulatorSchema = z.object({
  simulating: z.boolean(),
  scenario: z.enum(['stable', 'gradual_warmup', 'sudden_excursion', 'door_open_spike']).optional(),
  simIntervalSeconds: z.number().int().min(1).max(60).optional()
});

export const RespondOfferSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
  responseNotes: z.string().optional()
});

export const PurchaseOfferSchema = z.object({
  quantityKg: z.number().positive('quantityKg must be greater than zero'),
  notes: z.string().optional()
});
