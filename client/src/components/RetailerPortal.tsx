import React, { useState } from 'react';
import { DiscountOffer, Retailer } from '../types';
import { Store, Tag, CheckCircle, XCircle, ShoppingBag, Clock, ArrowRight, Loader2 } from 'lucide-react';

interface RetailerPortalProps {
  offers: DiscountOffer[];
  retailers: Retailer[];
  onRespondOffer: (offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) => Promise<void>;
  onRefresh: () => void;
  showToast?: (title: string, description?: string, variant?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const RetailerPortal: React.FC<RetailerPortalProps> = ({
  offers,
  retailers,
  onRespondOffer,
  onRefresh,
  showToast,
}) => {
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('all');
  const [notes, setNotes] = useState<{ [offerId: string]: string }>({});
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);

  const filteredOffers = selectedRetailerId === 'all'
    ? offers
    : offers.filter((o) => o.retailerId === selectedRetailerId);

  const handleAction = async (offerId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setPendingOfferId(offerId);
    try {
      const offerNotes = notes[offerId] || '';
      await onRespondOffer(offerId, status, offerNotes);
      onRefresh();
      if (showToast) {
        showToast(
          status === 'ACCEPTED' ? 'Discount Offer Accepted' : 'Discount Offer Declined',
          status === 'ACCEPTED'
            ? 'The produce batch has been marked as LIQUIDATED to the retailer.'
            : 'The liquidation offer was declined by the retailer.',
          status === 'ACCEPTED' ? 'success' : 'info'
        );
      }
    } catch (err) {
      if (showToast) {
        showToast('Action Failed', 'Could not record offer response.', 'error');
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
                Local Retailer Bidding Portal
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
              {filteredOffers.length} Active
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

              const isPending = offer.status === 'PENDING';
              const isAccepted = offer.status === 'ACCEPTED';
              const isDeclined = offer.status === 'DECLINED';
              const isSubmitting = pendingOfferId === offer.id;

              return (
                <div
                  key={offer.id}
                  id={`retailer-offer-card-${offer.id}`}
                  className={`glass-panel p-5 relative overflow-hidden transition-all rounded-2xl border ${
                    isAccepted
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : isDeclined
                      ? 'border-rose-500/30 bg-rose-950/10'
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
                          {shipment.trackingNumber} • {shipment.quantityKg} kg bulk
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
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {offer.status}
                      </span>
                    </div>
                  </div>

                  {/* Offer Stat Tile Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-900/90 mb-4">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Target Retailer</span>
                      <span className="font-semibold text-slate-200 truncate block">
                        {offer.retailer ? offer.retailer.name : 'All Partners'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Shelf Life At Offer</span>
                      <span className="font-mono-code font-bold text-amber-400">
                        {offer.remainingShelfLifeHoursAtOffer.toFixed(1)} hours
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Original Price</span>
                      <span className="line-through font-mono-code text-slate-400">
                        ${offer.originalPricePerKg.toFixed(2)}/kg
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Liquidation Rate</span>
                      <span className="font-mono-code font-extrabold text-base text-emerald-400">
                        ${offer.discountedPricePerKg.toFixed(2)}/kg
                      </span>
                    </div>
                  </div>

                  {/* Actions for Pending Offers */}
                  {isPending && (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        aria-label="Response notes"
                        placeholder="Optional notes (e.g. Pickup dock timeframe, vehicle ID)"
                        value={notes[offer.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [offer.id]: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-portal-accept-${offer.id}`}
                          onClick={() => handleAction(offer.id, 'ACCEPTED')}
                          disabled={isSubmitting}
                          aria-label={`Accept offer for ${shipment.produceType.name}`}
                          className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>{isSubmitting ? 'Processing...' : 'Accept & Purchase Batch'}</span>
                        </button>

                        <button
                          id={`btn-portal-decline-${offer.id}`}
                          onClick={() => handleAction(offer.id, 'DECLINED')}
                          disabled={isSubmitting}
                          aria-label={`Decline offer for ${shipment.produceType.name}`}
                          className="py-2.5 px-3.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none disabled:opacity-50"
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
