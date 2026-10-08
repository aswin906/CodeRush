import React, { useState } from 'react';
import { Shipment } from '../types';
import { Play, Pause, Zap, Send, Settings, Flame, AlertTriangle } from 'lucide-react';

interface SimulatorControlProps {
  shipment: Shipment;
  onUpdateConfig: (simulating: boolean, scenario?: string) => Promise<void>;
  onInjectTelemetry: (temp: number, humidity: number) => Promise<void>;
}

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  shipment,
  onUpdateConfig,
  onInjectTelemetry
}) => {
  const [manualTemp, setManualTemp] = useState<number>(shipment.produceType.tempRef + 5);
  const [manualRh, setManualRh] = useState<number>(75);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await onUpdateConfig(shipment.simulating, e.target.value);
  };

  const handleToggleSim = async () => {
    await onUpdateConfig(!shipment.simulating, shipment.scenario);
  };

  const handleManualInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onInjectTelemetry(manualTemp, manualRh);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <h3 className="font-heading font-bold text-slate-100 text-sm">
            Telemetry Simulator Controls
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Auto-Ticker:</span>
          <button
            id={`btn-toggle-sim-${shipment.id}`}
            onClick={handleToggleSim}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              shipment.simulating
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {shipment.simulating ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Paused
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Active
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>Simulation Scenario</span>
          <span className="text-[10px] text-slate-500 font-normal">Generated per interval</span>
        </label>
        <select
          id="select-scenario"
          value={shipment.scenario}
          onChange={handleScenarioChange}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="stable">❄️ Stable Cold Chain (Ideal 4°C, 90% RH)</option>
          <option value="gradual_warmup">🌡️ Gradual Warm-up (Refrigeration Decay)</option>
          <option value="sudden_excursion">🚨 Sudden Cooling Failure Spike (25°C Excursion)</option>
          <option value="door_open_spike">🚪 Periodic Door-Open Temp Spikes</option>
        </select>
      </div>

      {/* Manual Telemetry Injection Form */}
      <form onSubmit={handleManualInject} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-900">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">Inject Manual Telemetry Spike</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Temperature (°C)
            </label>
            <input
              id="input-manual-temp"
              type="number"
              step="0.1"
              value={manualTemp}
              onChange={(e) => setManualTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono-code text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Humidity (%)
            </label>
            <input
              id="input-manual-rh"
              type="number"
              step="0.1"
              value={manualRh}
              onChange={(e) => setManualRh(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono-code text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          id="btn-inject-telemetry"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10 active:scale-95 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Inject Payload & Recompute Shelf Life</span>
        </button>
      </form>
    </div>
  );
};
