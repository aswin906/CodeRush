import React, { useState } from 'react';
import { Shipment } from '../types';
import { Play, Pause, Zap, Send, Settings, Loader2 } from 'lucide-react';

interface SimulatorControlProps {
  shipment: Shipment;
  onUpdateConfig: (simulating: boolean, scenario?: string) => Promise<void>;
  onInjectTelemetry: (temp: number, humidity: number) => Promise<void>;
}

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  shipment,
  onUpdateConfig,
  onInjectTelemetry,
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
    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <h3 className="font-heading font-extrabold text-slate-100 text-sm">
            Telemetry Simulator Controls
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Auto-Ticker:</span>
          <button
            id={`btn-toggle-sim-${shipment.id}`}
            onClick={handleToggleSim}
            aria-label={shipment.simulating ? 'Pause telemetry simulator' : 'Activate telemetry simulator'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
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
        <label htmlFor="select-scenario" className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>Simulation Scenario</span>
          <span className="text-[10px] text-slate-500 font-normal">Generated per tick</span>
        </label>
        <select
          id="select-scenario"
          aria-label="Simulation Scenario"
          value={shipment.scenario}
          onChange={handleScenarioChange}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <option value="stable">❄️ Stable Cold Chain (Ideal Temp & RH)</option>
          <option value="gradual_warmup">🌡️ Gradual Warm-up (Refrigeration Decay)</option>
          <option value="sudden_excursion">🚨 Sudden Cooling Failure Spike (Excursion)</option>
          <option value="door_open_spike">🚪 Periodic Door-Open Temp Spikes</option>
        </select>
      </div>

      {/* Manual Telemetry Injection Form */}
      <form onSubmit={handleManualInject} className="bg-slate-950/60 p-4 rounded-xl border border-slate-900">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-extrabold text-slate-200">Inject Manual Telemetry Payload</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <label htmlFor="input-manual-temp" className="block text-[11px] font-bold text-slate-400 mb-1">
              Temperature (°C)
            </label>
            <input
              id="input-manual-temp"
              type="number"
              step="0.1"
              value={manualTemp}
              onChange={(e) => setManualTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono-code font-bold text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="input-manual-rh" className="block text-[11px] font-bold text-slate-400 mb-1">
              Humidity (%)
            </label>
            <input
              id="input-manual-rh"
              type="number"
              step="0.1"
              value={manualRh}
              onChange={(e) => setManualRh(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono-code font-bold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <button
          id="btn-inject-telemetry"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-3.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10 active:scale-95 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>{isSubmitting ? 'Injecting Payload...' : 'Inject Payload & Recompute Shelf Life'}</span>
        </button>
      </form>
    </div>
  );
};
