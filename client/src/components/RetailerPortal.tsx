import React, { useState } from 'react';
import { DiscountOffer, Retailer } from '../types';
import { Store, Tag, CheckCircle, XCircle, ShoppingBag, Loader2, Scale, DollarSign, AlertCircle } from 'lucide-react';

interface RetailerPortalProps {
  offers: DiscountOffer[];
  retailers: Retailer[];
  onPurchaseOffer: (offerId: string, quantityKg: number, notes?: string) => Promise<void>;
  onRespondOffer: (offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) => Promise<void>;
  onRefresh: () => void;
  showToast?: (title: string, description?: string, variant?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const RetailerPortal: React.FC<RetailerPortalProps> = ({
  offers,
  retailers,
  onPurchaseOffer,
  onRespondOffer,
  onRefresh,
  showToast,
}) => {
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('all');
  const [notes, setNotes] = useState<{ [offerId: string]: string }>({});
  const [quantities, setQuantities] = useState<{ [offerId: string]: number }>({});
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);

  const filteredOffers = selectedRetailerId === 'all'
    ? offers
    : offers.filter((o) => o.retailerId === selectedRetailerId);

  const getQuantityForOffer = (offer: DiscountOffer): number => {
    if (quantities[offer.id] !== undefined) {
      return quantities[offer.id];
    }
    const maxAvailable = offer.shipment?.availableQuantityKg ?? offer.offerQuantityKg ?? 0;
    return maxAvailable;
  };

  const handlePurchase = async (offer: DiscountOffer) => {
    const qty = getQuantityForOffer(offer);
    const maxAvailable = offer.shipment?.availableQuantityKg ?? offer.offerQuantityKg ?? 0;

    if (qty <= 0) {
      if (showToast) showToast('Invalid Quantity', 'Purchase quantity must be greater than zero kg.', 'warning');
      return;
    }
    if (qty > maxAvailable) {
      if (showToast) showToast('Exceeds Stock', `Quantity cannot exceed remaining available stock (${maxAvailable} kg).`, 'warning');
      return;
    }

    setPendingOfferId(offer.id);
    try {
      const offerNotes = notes[offer.id] || '';
      await onPurchaseOffer(offer.id, qty, offerNotes);
      onRefresh();
      if (showToast) {
        showToast(
          'Purchase Successful!',
          `Purchased ${qty} kg of ${offer.shipment?.produceType.name || 'produce'} at $${offer.discountedPricePerKg.toFixed(2)}/kg.`,
          'success'
        );
      }
    } catch (err: any) {
      if (showToast) {
        showToast('Purchase Failed', err.message || 'Could not complete purchase transaction.', 'error');
      }
    } finally {
      setPendingOfferId(null);
    }
  };

  const handleDecline = async (offerId: string) => {
    setPendingOfferId(offerId);
    try {
      const offerNotes = notes[offerId] || '';
      await onRespondOffer(offerId, 'DECLINED', offerNotes);
      onRefresh();
      if (showToast) {
        showToast('Offer Declined', 'The liquidation offer was declined by the retailer.', 'info');
      }
    } catch (err: any) {
      if (showToast) {
        showToast('Action Failed', 'Could not record offer rejection.', 'error');
      }
    } finally {
      setPendingOfferId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Retailer Portal Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border-purple-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Store className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="font-heading font-extrabold text-2xl text-slate-100">
                Local Retailer Bidding & Stock Purchase Portal
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Automated liquidation marketplace connecting cold-chain shipments approaching shelf-life limits with local grocery retailers before spoilage occurs.
            </p>
          </div>

          {/* Retailer Identity Selector */}
          <div className="w-full md:w-72">
            <label htmlFor="select-retailer-identity" className="block text-xs font-bold text-slate-300 mb-1.5">
              Select Retailer Identity:
            </label>
            <select
              id="select-retailer-identity"
              aria-label="Select Retailer Identity"
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="all">🏬 All Registered Retailers (Overview)</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.location})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Offers Feed Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" />
            <span>Active Liquidation Offers</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono-code font-bold">
              {filteredOffers.length} Active Bids
            </span>
          </h3>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl border border-slate-800">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="font-heading font-bold text-slate-300 text-base">No Active Offers Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              When cold-chain shipments experience temperature excursions or drop below remaining shelf life thresholds, discounted bids will populate here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredOffers.map((offer) => {
              const shipment = offer.shipment;
              if (!shipment) return null;

              const availableStockKg = shipment.availableQuantityKg ?? offer.offerQuantityKg ?? 0;
              const isSoldOut = availableStockKg <= 0 || shipment.status === 'SOLD_OUT';
              const isPending = offer.status === 'PENDING';
              const isAccepted = offer.status === 'ACCEPTED';
              const isDeclined = offer.status === 'DECLINED';
              const isSuperseded = offer.status === 'SUPERSEDED';
              const isExpired = offer.status === 'EXPIRED';
              const isSubmitting = pendingOfferId === offer.id;

              const currentQty = getQuantityForOffer(offer);
              const totalPrice = currentQty * offer.discountedPricePerKg;
              const isQtyValid = currentQty > 0 && currentQty <= availableStockKg;

              return (
                <div
                  key={offer.id}
                  id={`retailer-offer-card-${offer.id}`}
                  className={`glass-panel p-5 relative overflow-hidden transition-all rounded-2xl border ${
                    isAccepted
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : isDeclined
                      ? 'border-rose-500/30 bg-rose-950/10'
                      : isSuperseded
                      ? 'border-slate-800 bg-slate-900/30'
                      : isSoldOut
                      ? 'border-purple-500/30 bg-purple-950/10'
                      : 'border-purple-500/30 hover:border-purple-500/50'
                  }`}
                >
                  {/* Top Bar: Produce + Prominent Discount % Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                        {shipment.produceType.icon}
                      </span>
                      <div>
                        <h4 className="font-heading font-extrabold text-slate-100 text-base">
                          {shipment.produceType.name}
                        </h4>
                        <p className="text-xs font-mono-code text-slate-400">
                          {shipment.trackingNumber}
                        </p>
                      </div>
                    </div>

                    {/* Prominent Discount Percentage Badge */}
                    <div className="flex flex-col items-end">
                      <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-500 to-indigo-500 text-slate-950 shadow-md shadow-purple-500/20 tracking-wider font-mono-code">
                        {offer.discountPercent}% OFF
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase mt-1 px-2 py-0.5 rounded-full border ${
                          isAccepted
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : isDeclined
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : isSuperseded
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : isSoldOut
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isSoldOut && isPending ? 'SOLD OUT' : offer.status}
                      </span>
                    </div>
                  </div>

                  {/* Stock Availability & Price Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-900/90 mb-4">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Target Partner</span>
                      <span className="font-semibold text-slate-200 truncate block">
                        {offer.retailer ? offer.retailer.name : 'All Partners'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Available Stock</span>
                      <span className={`font-mono-code font-bold ${isSoldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {availableStockKg.toLocaleString()} / {shipment.initialQuantityKg || shipment.quantityKg} kg
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Original Price</span>
                      <span className="line-through font-mono-code text-slate-400">
                        ${offer.originalPricePerKg.toFixed(2)}/kg
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Discounted Rate</span>
                      <span className="font-mono-code font-extrabold text-base text-emerald-400">
                        ${offer.discountedPricePerKg.toFixed(2)}/kg
                      </span>
                    </div>
                  </div>

                  {/* Quantity Purchase Controls for Pending Offers */}
                  {isPending && !isSoldOut && (
                    <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 mb-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <label htmlFor={`quantity-input-${offer.id}`} className="font-bold text-slate-300 flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-purple-400" /> Quantity to Purchase (kg):
                          </label>
                          <span className="font-mono-code text-[11px] text-slate-400">
                            Max: {availableStockKg} kg
                          </span>
                        </div>
                        <input
                          id={`quantity-input-${offer.id}`}
                          type="number"
                          min={1}
                          max={availableStockKg}
                          step={1}
                          value={currentQty}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setQuantities({ ...quantities, [offer.id]: val });
                          }}
                          disabled={isSubmitting}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono-code font-bold text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      {/* Real-time Total Price Calculation */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <span className="text-slate-400 flex items-center gap-1 font-semibold">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Cost:
                        </span>
                        <span className="font-mono-code font-extrabold text-sm text-emerald-400">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>

                      {!isQtyValid && currentQty > 0 && (
                        <div className="text-[11px] text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Quantity must be between 1 and {availableStockKg} kg
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions for Pending Offers */}
                  {isPending && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        aria-label="Response notes"
                        placeholder="Optional notes (e.g. Dock pickup details)"
                        value={notes[offer.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [offer.id]: e.target.value })}
                        disabled={isSubmitting || isSoldOut}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-portal-accept-${offer.id}`}
                          onClick={() => handlePurchase(offer)}
                          disabled={isSubmitting || isSoldOut || !isQtyValid}
                          aria-label={`Purchase ${currentQty} kg for offer`}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>
                            {isSubmitting
                              ? 'Processing...'
                              : isSoldOut
                              ? 'Batch Sold Out'
                              : `Purchase ${currentQty} kg ($${totalPrice.toFixed(2)})`}
                          </span>
                        </button>

                        <button
                          id={`btn-portal-decline-${offer.id}`}
                          onClick={() => handleDecline(offer.id)}
                          disabled={isSubmitting}
                          aria-label={`Decline offer for ${shipment.produceType.name}`}
                          className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!isPending && offer.responseNotes && (
                    <div className="mt-2 text-xs italic text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                      Response Note: "{offer.responseNotes}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
