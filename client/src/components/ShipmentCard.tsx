import React from 'react';
import { Shipment } from '../types';
import { getStatusConfig } from '../theme';
import { MapPin, Thermometer, Droplets, Clock, Activity } from 'lucide-react';

interface ShipmentCardProps {
  shipment: Shipment;
  isSelected: boolean;
  onSelect: (shipment: Shipment) => void;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({ shipment, isSelected, onSelect }) => {
  const { produceType, status, scenario, remainingShelfLifeHours, initialShelfLifeHours, consumedFraction } = shipment;
  const latestTelemetry = shipment.telemetryRecords && shipment.telemetryRecords.length > 0
    ? shipment.telemetryRecords[0]
    : null;

  const remainingPercent = Math.max(0, Math.min(100, (1 - consumedFraction) * 100));
  const statusCfg = getStatusConfig(status);

  return (
    <div
      id={`shipment-card-${shipment.id}`}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(shipment)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(shipment);
        }
      }}
      className={`glass-panel glass-panel-interactive p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all rounded-2xl border ${
        isSelected
          ? 'ring-2 ring-emerald-500/70 bg-slate-900/95 shadow-lg shadow-emerald-500/10 border-emerald-500/50'
          : 'border-slate-800/80 hover:border-slate-700'
      } focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none`}
    >
      {/* Top Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: produceType.color }}
      />

      {/* Header Info */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Produce Emoji Container */}
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0 shadow-inner">
              {produceType.icon}
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-slate-100 text-base leading-tight">
                {produceType.name}
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                {shipment.trackingNumber}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder} ${statusCfg.glow}`}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Route Info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-900/90">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate font-medium text-slate-300">{shipment.origin}</span>
          <span className="text-slate-600 font-bold px-0.5">→</span>
          <span className="truncate font-medium text-slate-300">{shipment.destination}</span>
        </div>

        {/* Labeled Stat Tiles Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Temperature</span>
              <span className="font-mono-code font-bold text-xs text-cyan-300">
                {latestTelemetry ? `${latestTelemetry.temperature.toFixed(1)}°C` : '—'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Humidity</span>
              <span className="font-mono-code font-bold text-xs text-emerald-300">
                {latestTelemetry ? `${latestTelemetry.humidity.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Scenario</span>
              <span className="font-sans font-semibold text-xs text-purple-300 capitalize truncate block">
                {scenario.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-900 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Available Stock</span>
              <span className={`font-mono-code font-bold text-xs ${shipment.availableQuantityKg <= 0 ? 'text-purple-400' : 'text-slate-200'}`}>
                {shipment.availableQuantityKg ?? shipment.quantityKg} / {shipment.initialQuantityKg ?? shipment.quantityKg} kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar for Remaining Shelf Life */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Remaining Shelf Life</span>
          </span>
          <span className="font-mono-code font-bold text-slate-200">
            {remainingShelfLifeHours.toFixed(1)}h / {initialShelfLifeHours.toFixed(0)}h{' '}
            <span className="text-slate-400 font-normal">({remainingPercent.toFixed(1)}%)</span>
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-900">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${statusCfg.progressGradient} transition-all duration-500`}
            style={{ width: `${Math.max(2, remainingPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
