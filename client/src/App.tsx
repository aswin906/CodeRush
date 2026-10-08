import React, { useEffect, useState, useCallback } from 'react';
import { Shipment, ProduceType, DiscountOffer, Retailer, AuditLog } from './types';
import * as api from './api/client';
import { Navbar } from './components/Navbar';
import { ShipmentCard } from './components/ShipmentCard';
import { ShipmentDetail } from './components/ShipmentDetail';
import { RetailerPortal } from './components/RetailerPortal';
import { AuditLogViewer } from './components/AuditLogViewer';
import { CreateShipmentModal } from './components/CreateShipmentModal';
import { ToastContainer, ToastMessage, ToastVariant } from './components/Toast';
import { ShipmentSkeletonGrid, EmptyState, ErrorState } from './components/StateViews';
import { Filter, Thermometer } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retailer' | 'audit'>('dashboard');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [produceTypes, setProduceTypes] = useState<ProduceType[]>([]);
  const [discountOffers, setDiscountOffers] = useState<DiscountOffer[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<Shipment | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTicking, setIsTicking] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Toasts state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description?: string, variant: ToastVariant = 'info') => {
    const newToast: ToastMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      variant,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load initial data from backend API
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setLoadError(null);

    try {
      const [shipmentsData, produceData, offersData, retailersData, auditData] = await Promise.all([
        api.fetchShipments(),
        api.fetchProduceTypes(),
        api.fetchDiscountOffers(),
        api.fetchRetailers(),
        api.fetchAuditLogs(),
      ]);

      setShipments(shipmentsData);
      setProduceTypes(produceData);
      setDiscountOffers(offersData);
      setRetailers(retailersData);
      setAuditLogs(auditData);

      if (selectedShipmentId) {
        const updatedDetail = await api.fetchShipmentDetail(selectedShipmentId);
        setSelectedShipmentDetail(updatedDetail);
      }
    } catch (err: any) {
      console.error('Error loading AgroSense platform data:', err);
      setLoadError(err.message || 'Could not connect to AgroSense backend API.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [selectedShipmentId]);

  useEffect(() => {
    loadData(false);
    // Live auto-polling every 4 seconds to sync with server telemetry simulator
    const timer = setInterval(() => {
      loadData(true);
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
      addToast('Error', 'Failed to load shipment detail records', 'error');
    }
  };

  const handleTriggerTick = async () => {
    setIsTicking(true);
    try {
      const res = await api.triggerSimulationTick(selectedShipmentId || undefined);
      await loadData(true);
      addToast(
        'Telemetry Tick Triggered',
        res.message || 'Arrhenius shelf-life degradation recomputed for active shipments.',
        'success'
      );
    } catch (err) {
      console.error('Failed to trigger simulation tick:', err);
      addToast('Tick Failed', 'Could not process simulation step.', 'error');
    } finally {
      setIsTicking(false);
    }
  };

  const handleCreateShipment = async (data: any) => {
    const newShip = await api.createShipment(data);
    await loadData(true);
    setSelectedShipmentId(newShip.id);
    const detail = await api.fetchShipmentDetail(newShip.id);
    setSelectedShipmentDetail(detail);
    addToast('Shipment Created', `Tracking ID: ${newShip.trackingNumber} registered successfully.`, 'success');
  };

  const handleUpdateSimulator = async (simulating: boolean, scenario?: string) => {
    if (!selectedShipmentId) return;
    await api.updateSimulatorConfig(selectedShipmentId, { simulating, scenario });
    const updated = await api.fetchShipmentDetail(selectedShipmentId);
    setSelectedShipmentDetail(updated);
    await loadData(true);
    addToast(
      'Simulator Config Updated',
      `Auto-ticker ${simulating ? 'Activated' : 'Paused'}${scenario ? ` • Scenario: ${scenario}` : ''}`,
      'info'
    );
  };

  const handleInjectTelemetry = async (temp: number, humidity: number) => {
    if (!selectedShipmentId) return;
    await api.ingestTelemetry(selectedShipmentId, { temperature: temp, humidity });
    const updated = await api.fetchShipmentDetail(selectedShipmentId);
    setSelectedShipmentDetail(updated);
    await loadData(true);
    addToast('Telemetry Payload Ingested', `Logged ${temp}°C, ${humidity}% RH for ${updated.trackingNumber}`, 'warning');
  };

  const handleRespondOffer = async (offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) => {
    await api.respondToOffer(offerId, status, notes);
    await loadData(true);
    if (selectedShipmentId) {
      const updated = await api.fetchShipmentDetail(selectedShipmentId);
      setSelectedShipmentDetail(updated);
    }
    addToast(
      status === 'ACCEPTED' ? 'Discount Offer Accepted' : 'Discount Offer Declined',
      status === 'ACCEPTED' ? 'Shipment marked as LIQUIDATED to retailer.' : 'Offer rejected.',
      status === 'ACCEPTED' ? 'success' : 'info'
    );
  };

  // Compute status counts for filter segmented control
  const filterCounts: Record<string, number> = {
    ALL: shipments.length,
    OPTIMAL: shipments.filter((s) => s.status === 'OPTIMAL').length,
    WARNING: shipments.filter((s) => s.status === 'WARNING').length,
    CRITICAL: shipments.filter((s) => s.status === 'CRITICAL').length,
    LIQUIDATING: shipments.filter((s) => s.status === 'LIQUIDATING').length,
    LIQUIDATED: shipments.filter((s) => s.status === 'LIQUIDATED').length,
    EXPIRED: shipments.filter((s) => s.status === 'EXPIRED').length,
  };

  // Filter shipments
  const filteredShipments = shipments.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Header & Navbar Navigation */}
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

      {/* Main Container */}
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
                {/* Dashboard Hero Header & Segmented Filter Control */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
                  <div>
                    <h2 className="font-heading font-extrabold text-xl text-slate-100 flex items-center gap-2.5">
                      <Thermometer className="w-5 h-5 text-emerald-400" />
                      Cold-Chain Produce Shipments
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Arrhenius degradation kinetic modeling & automated liquidation discount monitoring.
                    </p>
                  </div>

                  {/* Restyled Segmented Filter Control */}
                  <nav
                    aria-label="Filter Shipments by Status"
                    className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800"
                  >
                    <span className="text-xs text-slate-500 font-bold px-2 flex items-center gap-1 shrink-0">
                      <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    {['ALL', 'OPTIMAL', 'WARNING', 'CRITICAL', 'LIQUIDATING', 'LIQUIDATED', 'EXPIRED'].map((st) => {
                      const isActive = statusFilter === st;
                      const count = filterCounts[st] || 0;
                      return (
                        <button
                          key={st}
                          id={`filter-pill-${st.toLowerCase()}`}
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          <span>{st}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800/80 text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* State Views: Loading, Error, Empty, or Responsive Grid */}
                {isLoading ? (
                  <ShipmentSkeletonGrid />
                ) : loadError ? (
                  <ErrorState message={loadError} onRetry={() => loadData(false)} />
                ) : filteredShipments.length === 0 ? (
                  <EmptyState filter={statusFilter} onOpenCreateModal={() => setIsCreateModalOpen(true)} />
                ) : (
                  /* Responsive Grid: 3 cols desktop (lg), 2 cols tablet (md), 1 col mobile (375px) */
                  <section
                    aria-label="Active Cold-Chain Shipments Grid"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredShipments.map((shipment) => (
                      <ShipmentCard
                        key={shipment.id}
                        shipment={shipment}
                        isSelected={selectedShipmentId === shipment.id}
                        onSelect={handleSelectShipment}
                      />
                    ))}
                  </section>
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
            onRefresh={() => loadData(true)}
            showToast={addToast}
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
          <span className="font-medium">AgroSense Cold-Chain Telemetry & Degradation Platform</span>
          <span className="font-mono-code text-[11px] text-slate-600">
            Hosted PostgreSQL Database • Express Serverless API • React Vite Client
          </span>
        </div>
      </footer>
    </div>
  );
};
