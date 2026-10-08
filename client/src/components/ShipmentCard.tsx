import React from 'react';
import { Shipment } from '../types';
import { MapPin, Thermometer, Droplets, Clock, Activity, Tag } from 'lucide-react';

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

  const getStatusBadge = () => {
    switch (status) {
      case 'OPTIMAL':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 glow-emerald">OPTIMAL</span>;
      case 'WARNING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 glow-amber">WARNING</span>;
      case 'CRITICAL':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 glow-rose">CRITICAL</span>;
      case 'LIQUIDATING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 glow-purple">LIQUIDATING</span>;
      case 'LIQUIDATED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">LIQUIDATED</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">EXPIRED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getProgressBarColor = () => {
    if (remainingPercent > 65) return 'from-emerald-500 to-teal-400';
    if (remainingPercent > 35) return 'from-amber-500 to-yellow-400';
    return 'from-rose-500 to-red-400';
  };

  return (
    <div
      id={`shipment-card-${shipment.id}`}
      onClick={() => onSelect(shipment)}
      className={`glass-panel glass-panel-interactive p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-emerald-500/50 bg-slate-900/90 shadow-emerald-500/10' : ''
      }`}
    >
      {/* Top Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: produceType.color }}
      />

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              {produceType.icon}
            </span>
            <div>
              <h3 className="font-heading font-bold text-slate-100 text-base leading-tight">
                {produceType.name}
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                {shipment.trackingNumber}
              </p>
            </div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Route info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{shipment.origin}</span>
          <span className="text-slate-600">→</span>
          <span className="truncate">{shipment.destination}</span>
        </div>

        {/* Live Telemetry Pill Readout */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Temp</span>
            <span className="font-mono-code font-bold text-sm text-cyan-300">
              {latestTelemetry ? `${latestTelemetry.temperature.toFixed(1)}°C` : '—'}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Humidity</span>
            <span className="font-mono-code font-bold text-sm text-emerald-300">
              {latestTelemetry ? `${latestTelemetry.humidity.toFixed(1)}%` : '—'}
            </span>
          </div>

          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">Scenario</span>
            <span className="font-sans font-semibold text-xs text-purple-300 capitalize truncate block">
              {scenario.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar for Remaining Shelf Life */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Remaining Shelf Life
          </span>
          <span className="font-mono-code font-bold text-slate-200">
            {remainingShelfLifeHours.toFixed(1)}h{' '}
            <span className="text-slate-500 font-normal">({remainingPercent.toFixed(0)}%)</span>
          </span>
        </div>

        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getProgressBarColor()} transition-all duration-500`}
            style={{ width: `${Math.max(2, remainingPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
