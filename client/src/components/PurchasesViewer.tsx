import React, { useState } from 'react';
import { Purchase } from '../types';
import { ShoppingCart, Undo2, CheckCircle2, RotateCcw, AlertTriangle, Loader2, Calendar, Scale } from 'lucide-react';

interface PurchasesViewerProps {
  purchases: Purchase[];
  onReversePurchase: (purchaseId: string, reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export const PurchasesViewer: React.FC<PurchasesViewerProps> = ({
  purchases,
  onReversePurchase,
  onRefresh,
}) => {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'REVERSED'>('ALL');

  const filteredPurchases = purchases.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  const handleConfirmReverse = async () => {
    if (!selectedPurchase) return;
    setIsSubmitting(true);
    try {
      await onReversePurchase(selectedPurchase.id, reversalReason);
      setSelectedPurchase(null);
      setReversalReason('');
      onRefresh();
    } catch (err) {
      console.error('Failed to reverse purchase:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border-blue-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="font-heading font-extrabold text-2xl text-slate-100">
                Retailer Purchase History & Audit
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Track all completed retailer produce purchases and manage reversals with automatic stock restoration into inventory.
            </p>
          </div>

          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {(['ALL', 'COMPLETED', 'REVERSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Purchases List / Table */}
      {filteredPurchases.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl border border-slate-800">
          <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-heading font-bold text-slate-300 text-base">No Purchase Records Found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            When retailers purchase stock from liquidation offers, transaction details will be logged here.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-mono-code uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Transaction ID / Date</th>
                  <th className="px-5 py-3.5 font-bold">Shipment & Produce</th>
                  <th className="px-5 py-3.5 font-bold">Retailer</th>
                  <th className="px-5 py-3.5 font-bold text-right">Quantity (kg)</th>
                  <th className="px-5 py-3.5 font-bold text-right">Price / kg</th>
                  <th className="px-5 py-3.5 font-bold text-right">Total Price</th>
                  <th className="px-5 py-3.5 font-bold text-center">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPurchases.map((p) => {
                  const isReversed = p.status === 'REVERSED';
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono-code font-bold text-slate-200">{p.id.substring(0, 13)}...</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.shipment?.produceType?.icon || '📦'}</span>
                          <div>
                            <div className="font-heading font-bold text-slate-200">
                              {p.shipment?.produceType?.name || 'Produce'}
                            </div>
                            <div className="font-mono-code text-[11px] text-slate-400">
                              {p.shipment?.trackingNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-200">{p.retailer?.name || 'Retailer'}</div>
                        <div className="text-[11px] text-slate-500">{p.retailer?.location}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono-code font-bold text-slate-200">
                        <span className="flex items-center justify-end gap-1">
                          <Scale className="w-3.5 h-3.5 text-slate-500" />
                          {p.quantityKg.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono-code text-slate-300">
                        ${p.pricePerKg.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono-code font-extrabold text-sm text-emerald-400">
                        ${p.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono-code uppercase border ${
                            isReversed
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isReversed ? (
                            <>
                              <RotateCcw className="w-3 h-3" /> REVERSED
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> COMPLETED
                            </>
                          )}
                        </span>
                        {isReversed && p.reversedAt && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {new Date(p.reversedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isReversed ? (
                          <button
                            onClick={() => setSelectedPurchase(p)}
                            aria-label={`Reverse purchase ${p.id}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-700 hover:border-rose-500/40 flex items-center gap-1.5 ml-auto transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Reverse</span>
                          </button>
                        ) : (
                          <span className="text-[11px] italic text-slate-500">
                            {p.notes ? `Reason: "${p.notes}"` : 'Restored'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-rose-500/40 bg-slate-900 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-heading font-extrabold text-lg text-slate-100">Confirm Purchase Reversal</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p>
                Reversing this purchase will return <strong className="text-white">{selectedPurchase.quantityKg} kg</strong> of produce back into available inventory for shipment <strong className="text-emerald-400 font-mono-code">{selectedPurchase.shipment?.trackingNumber}</strong>.
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1">
                <span>Retailer: <strong>{selectedPurchase.retailer?.name}</strong></span>
                <span>Refund: <strong>${selectedPurchase.totalPrice.toFixed(2)}</strong></span>
              </div>
            </div>

            <div>
              <label htmlFor="input-reversal-reason" className="block text-xs font-bold text-slate-300 mb-1">
                Reversal Reason (Optional):
              </label>
              <textarea
                id="input-reversal-reason"
                rows={2}
                placeholder="e.g. Retailer logistics cancellation, quality discrepancy"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedPurchase(null);
                  setReversalReason('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmReverse}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" /> Confirm Reversal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
