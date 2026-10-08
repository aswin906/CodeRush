import React, { useEffect, useState, useCallback } from 'react';
import { Shipment, ProduceType, DiscountOffer, Retailer, AuditLog } from './types';
import * as api from './api/client';
import { Navbar } from './components/Navbar';
import { ShipmentCard } from './components/ShipmentCard';
import { ShipmentDetail } from './components/ShipmentDetail';
import { RetailerPortal } from './components/RetailerPortal';
import { AuditLogViewer } from './components/AuditLogViewer';
import { CreateShipmentModal } from './components/CreateShipmentModal';
import { Filter, RefreshCw, Thermometer, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retailer' | 'audit'>('dashboard');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [produceTypes, setProduceTypes] = useState<ProduceType[]>([]);
  const [discountOffers, setDiscountOffers] = useState<DiscountOffer[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<Shipment | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTicking, setIsTicking] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Load all initial data from backend API
  const loadData = useCallback(async () => {
    try {
      const [shipmentsData, produceData, offersData, retailersData, auditData] = await Promise.all([
        api.fetchShipments(),
        api.fetchProduceTypes(),
        api.fetchDiscountOffers(),
        api.fetchRetailers(),
        api.fetchAuditLogs()
      ]);

      setShipments(shipmentsData);
      setProduceTypes(produceData);
      setDiscountOffers(offersData);
      setRetailers(retailersData);
      setAuditLogs(auditData);

      // If a shipment detail view is active, refresh detail data
      if (selectedShipmentId) {
        const updatedDetail = await api.fetchShipmentDetail(selectedShipmentId);
        setSelectedShipmentDetail(updatedDetail);
      }
    } catch (err) {
      console.error('Error loading AgroSense platform data:', err);
    }
  }, [selectedShipmentId]);

  useEffect(() => {
    loadData();
    // Live auto-polling every 4 seconds to sync with server telemetry simulator
    const timer = setInterval(() => {
      loadData();
    }, 4000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleSelectShipment = async (shipment: Shipment) => {
    setSelectedShipmentId(shipment.id);
    try {
      const detail = await api.fetchShipmentDetail(shipment.id);
      setSelectedShipmentDetail(detail);
    } catch (err) {
      console.error('Failed to load shipment detail:', err);
    }
  };

  const handleTriggerTick = async () => {
    setIsTicking(true);
    try {
      await api.triggerSimulationTick(selectedShipmentId || undefined);
      await loadData();
    } catch (err) {
      console.error('Failed to trigger simulation tick:', err);
    } finally {
      setIsTicking(false);
    }
  };

  const handleCreateShipment = async (data: any) => {
    const newShip = await api.createShipment(data);
    await loadData();
    setSelectedShipmentId(newShip.id);
    const detail = await api.fetchShipmentDetail(newShip.id);
    setSelectedShipmentDetail(detail);
  };

  const handleUpdateSimulator = async (simulating: boolean, scenario?: string) => {
    if (!selectedShipmentId) return;
    await api.updateSimulatorConfig(selectedShipmentId, { simulating, scenario });
    const updated = await api.fetchShipmentDetail(selectedShipmentId);
    setSelectedShipmentDetail(updated);
    await loadData();
  };

  const handleInjectTelemetry = async (temp: number, humidity: number) => {
    if (!selectedShipmentId) return;
    await api.ingestTelemetry(selectedShipmentId, { temperature: temp, humidity });
    const updated = await api.fetchShipmentDetail(selectedShipmentId);
    setSelectedShipmentDetail(updated);
    await loadData();
  };

  const handleRespondOffer = async (offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) => {
    await api.respondToOffer(offerId, status, notes);
    await loadData();
    if (selectedShipmentId) {
      const updated = await api.fetchShipmentDetail(selectedShipmentId);
      setSelectedShipmentDetail(updated);
    }
  };

  // Filter shipments
  const filteredShipments = shipments.filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'dashboard') setSelectedShipmentId(null);
        }}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onTriggerTick={handleTriggerTick}
        isTicking={isTicking}
        totalShipments={shipments.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <>
            {selectedShipmentDetail ? (
              <ShipmentDetail
                shipment={selectedShipmentDetail}
                onBack={() => {
                  setSelectedShipmentId(null);
                  setSelectedShipmentDetail(null);
                }}
                onUpdateSimulator={handleUpdateSimulator}
                onInjectTelemetry={handleInjectTelemetry}
                onRespondOffer={handleRespondOffer}
              />
            ) : (
              <div className="space-y-6">
                {/* Hero / Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="font-heading font-extrabold text-xl text-slate-100 flex items-center gap-2">
                      <Thermometer className="w-5 h-5 text-emerald-400" />
                      Active Cold-Chain Shipments
                    </h2>
                    <p className="text-xs text-slate-400">
                      Real-time Arrhenius degradation modeling & automated liquidation discount monitoring.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    {['ALL', 'OPTIMAL', 'WARNING', 'CRITICAL', 'LIQUIDATING', 'LIQUIDATED', 'EXPIRED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                          statusFilter === st
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shipments Grid */}
                {filteredShipments.length === 0 ? (
                  <div className="glass-panel p-12 text-center text-slate-400">
                    <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="font-heading font-bold text-slate-300 text-lg">No Shipments Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      There are no active shipments matching the filter "{statusFilter}". Click "New Shipment" above to register a cold-chain batch.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredShipments.map((shipment) => (
                      <ShipmentCard
                        key={shipment.id}
                        shipment={shipment}
                        isSelected={selectedShipmentId === shipment.id}
                        onSelect={handleSelectShipment}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'retailer' && (
          <RetailerPortal
            offers={discountOffers}
            retailers={retailers}
            onRespondOffer={handleRespondOffer}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogViewer logs={auditLogs} />
        )}
      </main>

      {/* Create Shipment Modal */}
      <CreateShipmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        produceTypes={produceTypes}
        onSubmit={handleCreateShipment}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AgroSense Cold-Chain Telemetry & Degradation Platform</span>
          <span className="font-mono-code text-[11px] text-slate-600">
            SQLite Database Persistence • Express Node API • React Vite Client
          </span>
        </div>
      </footer>
    </div>
  );
};
