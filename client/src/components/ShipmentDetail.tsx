import React from 'react';
import { Shipment } from '../types';
import { TelemetryChart } from './TelemetryChart';
import { SimulatorControl } from './SimulatorControl';
import { DiscountPanel } from './DiscountPanel';
import { getStatusConfig } from '../theme';
import {
  Thermometer,
  Droplets,
  Clock,
  Activity,
  ArrowLeft,
  MapPin,
  TrendingDown,
  Info,
} from 'lucide-react';

interface ShipmentDetailProps {
  shipment: Shipment;
  onBack: () => void;
  onUpdateSimulator: (simulating: boolean, scenario?: string) => Promise<void>;
  onInjectTelemetry: (temp: number, humidity: number) => Promise<void>;
  onRespondOffer: (offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) => Promise<void>;
}

export const ShipmentDetail: React.FC<ShipmentDetailProps> = ({
  shipment,
  onBack,
  onUpdateSimulator,
  onInjectTelemetry,
  onRespondOffer,
}) => {
  const { produceType, telemetryRecords = [], discountOffers = [] } = shipment;
  const latestTelemetry = telemetryRecords.length > 0 ? telemetryRecords[telemetryRecords.length - 1] : null;

  const currentTemp = latestTelemetry ? latestTelemetry.temperature : produceType.tempRef;
  const currentRh = latestTelemetry ? latestTelemetry.humidity : (produceType.rhMin + produceType.rhMax) / 2;
  const statusCfg = getStatusConfig(shipment.status);

  // Determine current market price
  const latestOffer = discountOffers[0];
  const currentPricePerKg = latestOffer
    ? latestOffer.discountedPricePerKg
    : shipment.initialPricePerKg;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <button
            id="btn-back-to-grid"
            onClick={onBack}
            aria-label="Back to dashboard shipments grid"
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              {produceType.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-2xl text-slate-100">
                  {produceType.name}
                </h2>
                <span className="font-mono-code text-xs px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-cyan-400 font-semibold">
                  {shipment.trackingNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{shipment.origin} → {shipment.destination}</span>
                <span>•</span>
                <span>{shipment.quantityKg} kg bulk payload</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <span className="text-xs font-bold text-slate-400">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder} ${statusCfg.glow}`}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Primary Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Temperature */}
        <div className="glass-panel p-4 flex flex-col justify-between rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-bold">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              Live Temperature
            </span>
            <span className="font-mono-code text-[11px] text-slate-400">Ref: {produceType.tempRef}°C</span>
          </div>

          <div className="my-1">
            <span className="font-mono-code font-extrabold text-2xl text-slate-100">
              {currentTemp.toFixed(1)}°C
            </span>
          </div>

          <div className="text-[11px] font-medium text-slate-400">
            {currentTemp > produceType.tempRef ? (
              <span className="text-amber-400 font-semibold">
                +{(currentTemp - produceType.tempRef).toFixed(1)}°C above ref
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">Optimal storage temp</span>
            )}
          </div>
        </div>

        {/* Metric 2: Relative Humidity */}
        <div className="glass-panel p-4 flex flex-col justify-between rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-bold">
              <Droplets className="w-4 h-4 text-emerald-400" />
              Relative Humidity
            </span>
            <span className="font-mono-code text-[11px] text-slate-400">Opt: {produceType.rhMin}-{produceType.rhMax}%</span>
          </div>

          <div className="my-1">
            <span className="font-mono-code font-extrabold text-2xl text-slate-100">
              {currentRh.toFixed(1)}%
            </span>
          </div>

          <div className="text-[11px] font-medium text-slate-400">
            {currentRh < produceType.rhMin ? (
              <span className="text-rose-400 font-semibold">Low RH desiccation</span>
            ) : currentRh > produceType.rhMax ? (
              <span className="text-amber-400 font-semibold">High RH decay risk</span>
            ) : (
              <span className="text-emerald-400 font-semibold">Ideal RH range</span>
            )}
          </div>
        </div>

        {/* Metric 3: Remaining Shelf Life */}
        <div className="glass-panel p-4 flex flex-col justify-between rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-amber-400" />
              Remaining Shelf Life
            </span>
            <span className="font-mono-code text-[11px] text-slate-400">Init: {shipment.initialShelfLifeHours}h</span>
          </div>

          <div className="my-1">
            <span className="font-mono-code font-extrabold text-2xl text-amber-300">
              {shipment.remainingShelfLifeHours.toFixed(1)}h
            </span>
          </div>

          <div className="text-[11px] font-medium text-slate-400">
            <span>{(shipment.consumedFraction * 100).toFixed(1)}% consumed</span>
          </div>
        </div>

        {/* Metric 4: Market Value per Kg */}
        <div className="glass-panel p-4 flex flex-col justify-between rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-bold">
              <TrendingDown className="w-4 h-4 text-purple-400" />
              Current Price / kg
            </span>
            <span className="font-mono-code text-[11px] line-through text-slate-400">
              ${shipment.initialPricePerKg.toFixed(2)}
            </span>
          </div>

          <div className="my-1">
            <span className="font-mono-code font-extrabold text-2xl text-emerald-400">
              ${currentPricePerKg.toFixed(2)}
            </span>
          </div>

          <div className="text-[11px] font-medium text-purple-400 font-semibold">
            {latestOffer ? (
              <span>{latestOffer.discountPercent}% Liquidation active</span>
            ) : (
              <span className="text-slate-400">Standard market price</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Telemetry Chart */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-extrabold text-slate-100 text-sm">
                  Cold-Chain Telemetry & Degradation Trend
                </h3>
              </div>
              <span className="text-xs font-mono-code text-slate-400 font-semibold">
                {telemetryRecords.length} Readings Logged
              </span>
            </div>

            <TelemetryChart telemetryRecords={telemetryRecords} produceType={produceType} />
          </div>

          {/* Simulator Control */}
          <SimulatorControl
            shipment={shipment}
            onUpdateConfig={onUpdateSimulator}
            onInjectTelemetry={onInjectTelemetry}
          />
        </div>

        {/* Right Column (1 span) */}
        <div className="space-y-6">
          {/* Discount Panel */}
          <DiscountPanel
            shipment={shipment}
            offers={discountOffers}
            onRespondOffer={onRespondOffer}
          />

          {/* Arrhenius Math Parameters Card */}
          <div className="glass-panel p-5 bg-slate-900/40 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
              <Info className="w-4 h-4 text-emerald-400" />
              <h3 className="font-heading font-bold text-slate-100 text-sm">
                Produce Degradation Parameters
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono-code text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Reference Temp (T_ref):</span>
                <span className="text-cyan-300 font-bold">{produceType.tempRef}°C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Baseline Shelf Life (L_ref):</span>
                <span className="text-emerald-300 font-bold">{produceType.shelfLifeRef} hours</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Q10 Temp Sensitivity:</span>
                <span className="text-purple-300 font-bold">{produceType.q10}x rate / 10°C</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Optimal RH Range:</span>
                <span className="text-amber-300 font-bold">{produceType.rhMin}% – {produceType.rhMax}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">RH Penalty Coeff (α):</span>
                <span className="text-rose-300 font-bold">{(produceType.rhPenaltyCoeff * 100).toFixed(1)}% / %RH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
