import React, { useState } from 'react';
import { ProduceType } from '../types';
import { X, Package, Loader2 } from 'lucide-react';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  produceTypes: ProduceType[];
  onSubmit: (data: {
    produceTypeId: string;
    origin: string;
    destination: string;
    quantityKg: number;
    initialPricePerKg: number;
    scenario: string;
  }) => Promise<void>;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  produceTypes,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [produceTypeId, setProduceTypeId] = useState<string>(produceTypes[0]?.id || 'strawberries');
  const [origin, setOrigin] = useState<string>('Central Coast Agricultural Hub');
  const [destination, setDestination] = useState<string>('Metro Wholesale Logistics');
  const [quantityKg, setQuantityKg] = useState<number>(1500);
  const [initialPricePerKg, setInitialPricePerKg] = useState<number>(5.50);
  const [scenario, setScenario] = useState<string>('stable');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSubmit({
        produceTypeId,
        origin,
        destination,
        quantityKg,
        initialPricePerKg,
        scenario,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="glass-panel w-full max-w-lg p-6 relative shadow-2xl border-slate-700/80 animate-in fade-in zoom-in-95 duration-200 rounded-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h3 id="modal-title" className="font-heading font-extrabold text-lg text-slate-100">
              Register Cold-Chain Shipment
            </h3>
            <p className="text-xs text-slate-400">
              Initialize a new batch monitor with telemetry simulator parameters.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Produce Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Select Produce Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {produceTypes.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setProduceTypeId(pt.id)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                    produceTypeId === pt.id
                      ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">{pt.icon}</span>
                  <div>
                    <span className="font-heading font-bold text-xs text-slate-200 block">
                      {pt.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-code">
                      T_ref: {pt.tempRef}°C • {pt.shelfLifeRef}h
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Route Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-origin" className="block text-xs font-semibold text-slate-300 mb-1">
                Origin Location
              </label>
              <input
                id="input-origin"
                type="text"
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="input-destination" className="block text-xs font-semibold text-slate-300 mb-1">
                Destination Market
              </label>
              <input
                id="input-destination"
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-quantity" className="block text-xs font-semibold text-slate-300 mb-1">
                Quantity (kg)
              </label>
              <input
                id="input-quantity"
                type="number"
                min="1"
                required
                value={quantityKg}
                onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono-code text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="input-price" className="block text-xs font-semibold text-slate-300 mb-1">
                Base Price ($/kg)
              </label>
              <input
                id="input-price"
                type="number"
                step="0.10"
                min="0.1"
                required
                value={initialPricePerKg}
                onChange={(e) => setInitialPricePerKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono-code text-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          {/* Simulation Scenario */}
          <div>
            <label htmlFor="select-initial-scenario" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Telemetry Simulator Initial Scenario
            </label>
            <select
              id="select-initial-scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <option value="stable">❄️ Stable Cold Chain (Constant ~Ideal Temp)</option>
              <option value="gradual_warmup">🌡️ Gradual Warm-up (Refrigeration Degradation)</option>
              <option value="sudden_excursion">🚨 Sudden Cooling Unit Breakdown (Excursion)</option>
              <option value="door_open_spike">🚪 Periodic Door-Open Temp Spikes</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              id="btn-submit-create-shipment"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isSubmitting ? 'Creating...' : 'Initialize Shipment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
