import React from 'react';
import { Thermometer, Store, ClipboardList, Plus, Play, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'retailer' | 'audit';
  setActiveTab: (tab: 'dashboard' | 'retailer' | 'audit') => void;
  onOpenCreateModal: () => void;
  onTriggerTick: () => void;
  isTicking: boolean;
  totalShipments: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onTriggerTick,
  isTicking,
  totalShipments
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                AgroSense
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0 Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Perishable Cold-Chain Monitoring & Dynamic Liquidation
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span>Dashboard</span>
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {totalShipments}
            </span>
          </button>

          <button
            id="nav-tab-retailer"
            onClick={() => setActiveTab('retailer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'retailer'
                ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Retailer Portal</span>
          </button>

          <button
            id="nav-tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-trigger-tick"
            onClick={onTriggerTick}
            disabled={isTicking}
            title="Trigger instant simulation tick step"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all hover:border-slate-600 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isTicking ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Tick Telemetry</span>
          </button>

          <button
            id="btn-create-shipment"
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Shipment</span>
          </button>
        </div>
      </div>
    </header>
  );
};
