import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AgroSense Database Seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.discountOffer.deleteMany();
  await prisma.telemetryRecord.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.produceType.deleteMany();

  console.log('Creating Produce Types...');
  const strawberries = await prisma.produceType.create({
    data: {
      id: 'strawberries',
      name: 'Organic Strawberries',
      tempRef: 4.0,
      shelfLifeRef: 168.0, // 7 days in hours
      q10: 2.1,
      rhMin: 85.0,
      rhMax: 95.0,
      rhPenaltyCoeff: 0.02,
      icon: '🍓',
      color: '#ef4444',
      description: 'Delicate berries requiring strict cold-chain management near 4°C and high humidity.'
    }
  });

  const leafyGreens = await prisma.produceType.create({
    data: {
      id: 'leafy-greens',
      name: 'Crisp Leafy Greens',
      tempRef: 2.0,
      shelfLifeRef: 240.0, // 10 days in hours
      q10: 2.3,
      rhMin: 90.0,
      rhMax: 98.0,
      rhPenaltyCoeff: 0.025,
      icon: '🥬',
      color: '#22c55e',
      description: 'High respiration rate produce requiring strict 2°C refrigeration to prevent wilting.'
    }
  });

  const tomatoes = await prisma.produceType.create({
    data: {
      id: 'tomatoes',
      name: 'Vine-Ripened Tomatoes',
      tempRef: 10.0,
      shelfLifeRef: 336.0, // 14 days in hours
      q10: 1.8,
      rhMin: 80.0,
      rhMax: 90.0,
      rhPenaltyCoeff: 0.015,
      icon: '🍅',
      color: '#f97316',
      description: 'Chilling-sensitive fruit; optimal storage at 10°C. Temperature spikes accelerate spoilage.'
    }
  });

  const avocados = await prisma.produceType.create({
    data: {
      id: 'avocados',
      name: 'Hass Avocados',
      tempRef: 6.0,
      shelfLifeRef: 480.0, // 20 days in hours
      q10: 2.0,
      rhMin: 85.0,
      rhMax: 90.0,
      rhPenaltyCoeff: 0.018,
      icon: '🥑',
      color: '#84cc16',
      description: 'Climacteric fruit with moderate shelf life at 6°C; rapid softening above 15°C.'
    }
  });

  console.log('Creating Retailers...');
  const freshMarket = await prisma.retailer.create({
    data: {
      id: 'ret-freshmarket',
      name: 'FreshMarket Co-op',
      location: 'Downtown San Jose, CA',
      contactEmail: 'purchasing@freshmarket.coop',
      contactPhone: '+1 (555) 234-5678',
      preferredProduceTypes: 'strawberries,leafy-greens'
    }
  });

  const greenGrocer = await prisma.retailer.create({
    data: {
      id: 'ret-greengrocer',
      name: 'GreenGrocer Express',
      location: 'Metro Distribution Hub, Oakland, CA',
      contactEmail: 'bids@greengrocer.com',
      contactPhone: '+1 (555) 876-5432',
      preferredProduceTypes: 'strawberries,tomatoes,avocados'
    }
  });

  const bayOrganics = await prisma.retailer.create({
    data: {
      id: 'ret-bayorganics',
      name: 'Bay Area Organics',
      location: 'North Harbor, San Francisco, CA',
      contactEmail: 'supply@bayorganics.org',
      contactPhone: '+1 (555) 345-6789',
      preferredProduceTypes: 'leafy-greens,tomatoes'
    }
  });

  console.log('Creating Sample Shipments & Initial Telemetry...');

  // Shipment 1: Strawberries - STABLE
  const ship1 = await prisma.shipment.create({
    data: {
      trackingNumber: 'AGRO-8942-STR',
      produceTypeId: strawberries.id,
      origin: 'Salinas Valley Farm #4',
      destination: 'Central Distribution Center, San Jose',
      quantityKg: 1200,
      initialPricePerKg: 6.50,
      status: 'OPTIMAL',
      scenario: 'stable',
      initialShelfLifeHours: 168.0,
      remainingShelfLifeHours: 156.4,
      consumedFraction: 0.069,
      simulating: true,
      simIntervalSeconds: 5
    }
  });

  // Seed 5 telemetry points for Ship1
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const elapsed = i * 2.0; // every 2 hours
    const recordTime = new Date(now.getTime() - (10 - i * 2) * 3600 * 1000);
    await prisma.telemetryRecord.create({
      data: {
        shipmentId: ship1.id,
        timestamp: recordTime,
        temperature: 3.8 + (Math.random() * 0.4 - 0.2), // ~3.8 °C
        humidity: 91.5 + (Math.random() * 1.0 - 0.5),
        transitTimeHours: elapsed,
        consumedFractionStep: 0.0119,
        cumulativeConsumedFraction: 0.0119 * (i + 1),
        remainingShelfLifeHours: 168.0 * (1 - 0.0119 * (i + 1))
      }
    });
  }

  // Shipment 2: Leafy Greens - GRADUAL WARMUP (WARNING)
  const ship2 = await prisma.shipment.create({
    data: {
      trackingNumber: 'AGRO-4109-LFG',
      produceTypeId: leafyGreens.id,
      origin: 'Imperial Valley Ranch',
      destination: 'Bay Area Grocery Depot',
      quantityKg: 2400,
      initialPricePerKg: 4.20,
      status: 'WARNING',
      scenario: 'gradual_warmup',
      initialShelfLifeHours: 240.0,
      remainingShelfLifeHours: 132.5,
      consumedFraction: 0.448,
      simulating: true,
      simIntervalSeconds: 5
    }
  });

  // Seed telemetry showing gradual warmup for Ship2
  for (let i = 0; i < 8; i++) {
    const elapsed = i * 6.0; // every 6 hours over 48h
    const recordTime = new Date(now.getTime() - (48 - i * 6) * 3600 * 1000);
    const temp = 2.0 + (i * 1.3); // 2°C up to ~11.1°C
    const rh = 94.0 - (i * 1.2); // humidity drops slightly
    const cumulativeFraction = 0.025 + (i * 0.053);

    await prisma.telemetryRecord.create({
      data: {
        shipmentId: ship2.id,
        timestamp: recordTime,
        temperature: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(rh.toFixed(1)),
        transitTimeHours: elapsed,
        consumedFractionStep: 0.053,
        cumulativeConsumedFraction: parseFloat(cumulativeFraction.toFixed(3)),
        remainingShelfLifeHours: parseFloat((240.0 * (1 - cumulativeFraction)).toFixed(1))
      }
    });
  }

  // Shipment 3: Tomatoes - SUDDEN EXCURSION (CRITICAL & LIQUIDATING)
  const ship3 = await prisma.shipment.create({
    data: {
      trackingNumber: 'AGRO-7731-TOM',
      produceTypeId: tomatoes.id,
      origin: 'Central Valley Greenhouse',
      destination: 'Metro Wholesale Market',
      quantityKg: 3500,
      initialPricePerKg: 3.80,
      status: 'LIQUIDATING',
      scenario: 'sudden_excursion',
      initialShelfLifeHours: 336.0,
      remainingShelfLifeHours: 85.0, // Only 25.3% shelf life remaining!
      consumedFraction: 0.747,
      simulating: false,
      simIntervalSeconds: 5
    }
  });

  // Telemetry for Ship3 (sudden temperature spike)
  for (let i = 0; i < 10; i++) {
    const elapsed = i * 4.0; // 40 hours total
    const recordTime = new Date(now.getTime() - (40 - i * 4) * 3600 * 1000);
    // sudden excursion after step 4
    const temp = i < 4 ? 10.2 : 24.5 + (Math.random() * 1.5);
    const rh = i < 4 ? 85.0 : 68.0; // dry air during cooling failure
    const cumulativeFraction = i < 4 ? (i + 1) * 0.02 : 0.08 + (i - 3) * 0.095;

    await prisma.telemetryRecord.create({
      data: {
        shipmentId: ship3.id,
        timestamp: recordTime,
        temperature: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(rh.toFixed(1)),
        transitTimeHours: elapsed,
        consumedFractionStep: i < 4 ? 0.02 : 0.095,
        cumulativeConsumedFraction: parseFloat(Math.min(1.0, cumulativeFraction).toFixed(3)),
        remainingShelfLifeHours: parseFloat(Math.max(0, 336.0 * (1 - cumulativeFraction)).toFixed(1))
      }
    });
  }

  // Create active Discount Offer for Ship3
  const offer1 = await prisma.discountOffer.create({
    data: {
      shipmentId: ship3.id,
      retailerId: greenGrocer.id,
      discountPercent: 35.0,
      originalPricePerKg: 3.80,
      discountedPricePerKg: 2.47,
      remainingShelfLifeHoursAtOffer: 85.0,
      status: 'PENDING'
    }
  });

  const offer2 = await prisma.discountOffer.create({
    data: {
      shipmentId: ship3.id,
      retailerId: bayOrganics.id,
      discountPercent: 35.0,
      originalPricePerKg: 3.80,
      discountedPricePerKg: 2.47,
      remainingShelfLifeHoursAtOffer: 85.0,
      status: 'PENDING'
    }
  });

  // Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      shipmentId: ship3.id,
      eventType: 'MODEL_RECALCULATED',
      summary: 'Temperature Excursion Detected: 25.2°C logged for AGRO-7731-TOM',
      details: JSON.stringify({
        temperature: 25.2,
        humidity: 68.0,
        transitTimeHours: 36.0,
        consumedFraction: 0.71,
        remainingShelfLifeHours: 97.4,
        status: 'CRITICAL'
      })
    }
  });

  await prisma.auditLog.create({
    data: {
      shipmentId: ship3.id,
      eventType: 'DISCOUNT_TRIGGERED',
      summary: 'Automated 35% Liquidation Discount triggered for AGRO-7731-TOM',
      details: JSON.stringify({
        shipmentId: ship3.id,
        trackingNumber: ship3.trackingNumber,
        remainingShelfLifeHours: 85.0,
        remainingFraction: 0.253,
        discountPercent: 35.0,
        notifiedRetailers: [greenGrocer.name, bayOrganics.name]
      })
    }
  });

  console.log('✅ AgroSense Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
