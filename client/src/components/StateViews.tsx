import React from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, Plus } from 'lucide-react';

export const ShipmentSkeletonGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="glass-panel p-5 rounded-2xl border border-slate-800/80 animate-pulse flex flex-col justify-between h-64"
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 shrink-0" />
                <div className="space-y-2">
                  <div className="w-28 h-4 bg-slate-800 rounded-md" />
                  <div className="w-20 h-3 bg-slate-800/60 rounded-md" />
                </div>
              </div>
              <div className="w-16 h-6 bg-slate-800 rounded-full" />
            </div>

            <div className="w-full h-8 bg-slate-900/60 rounded-lg mb-4" />

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="h-12 bg-slate-900/80 rounded-lg" />
              <div className="h-12 bg-slate-900/80 rounded-lg" />
              <div className="h-12 bg-slate-900/80 rounded-lg" />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <div className="w-24 h-3 bg-slate-800 rounded" />
              <div className="w-16 h-3 bg-slate-800 rounded" />
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  filter: string;
  onOpenCreateModal: () => void;
}> = ({ filter, onOpenCreateModal }) => {
  return (
    <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl border border-slate-800/80 max-w-xl mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
        <ShieldCheck className="w-8 h-8 text-emerald-400" />
      </div>
      <h3 className="font-heading font-extrabold text-slate-100 text-xl tracking-tight">
        No Shipments Found
      </h3>
      <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        {filter !== 'ALL'
          ? `There are currently no active cold-chain shipments with status "${filter}".`
          : 'There are no active produce shipments registered in the system.'}
      </p>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Shipment</span>
        </button>
      </div>
    </div>
  );
};

export const ErrorState: React.FC<{
  message: string;
  onRetry: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div className="glass-panel p-10 text-center text-slate-400 rounded-2xl border border-rose-500/30 max-w-xl mx-auto my-8 bg-rose-950/10">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-rose-400" />
      </div>
      <h3 className="font-heading font-bold text-rose-200 text-lg">Failed to Load Telemetry Data</h3>
      <p className="text-xs text-rose-300/80 mt-1 max-w-md mx-auto">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:scale-95"
      >
        <RefreshCw className="w-4 h-4 text-cyan-400" />
        <span>Retry Connection</span>
      </button>
    </div>
  );
};
