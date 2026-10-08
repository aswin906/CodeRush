import React, { useState } from 'react';
import { DiscountOffer, Retailer } from '../types';
import { Store, Tag, CheckCircle, XCircle, Clock, MapPin, AlertCircle, ShoppingBag } from 'lucide-react';

interface RetailerPortalProps {
  offers: DiscountOffer[];
  retailers: Retailer[];
  onRespondOffer: (offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string) => Promise<void>;
  onRefresh: () => void;
}

export const RetailerPortal: React.FC<RetailerPortalProps> = ({
  offers,
  retailers,
  onRespondOffer,
  onRefresh
}) => {
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('all');
  const [notes, setNotes] = useState<{ [offerId: string]: string }>({});

  const filteredOffers = selectedRetailerId === 'all'
    ? offers
    : offers.filter(o => o.retailerId === selectedRetailerId);

  const selectedRetailer = retailers.find(r => r.id === selectedRetailerId);

  const handleAction = async (offerId: string, status: 'ACCEPTED' | 'DECLINED') => {
    const offerNotes = notes[offerId] || '';
    await onRespondOffer(offerId, status, offerNotes);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Retailer Portal Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border-purple-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-6 h-6 text-purple-400" />
              <h2 className="font-heading font-extrabold text-2xl text-slate-100">
                Local Retailer Bidding Portal
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Real-time marketplace for local produce retailers to purchase discounted cold-chain shipments approaching shelf-life limits before spoilage.
            </p>
          </div>

          {/* Retailer Selector */}
          <div className="w-full md:w-72">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Retailer Identity:
            </label>
            <select
              id="select-retailer-identity"
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-purple-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">🏬 All Registered Retailers (Overview)</option>
              {retailers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.location})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Offers Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" />
            <span>Available Liquidation Offers</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono-code">
              {filteredOffers.length} Active
            </span>
          </h3>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="font-heading font-bold text-slate-300 text-base">No Active Offers Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              When cold-chain shipments trigger temperature excursions or drop below remaining shelf life thresholds, discounted bids will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOffers.map((offer) => {
              const shipment = offer.shipment;
              if (!shipment) return null;

              const isPending = offer.status === 'PENDING';
              const isAccepted = offer.status === 'ACCEPTED';
              const isDeclined = offer.status === 'DECLINED';

              return (
                <div
                  key={offer.id}
                  id={`retailer-offer-card-${offer.id}`}
                  className={`glass-panel p-5 relative overflow-hidden transition-all ${
                    isAccepted
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : isDeclined
                      ? 'border-rose-500/30 bg-rose-950/10'
                      : 'border-purple-500/30 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800">
                        {shipment.produceType.icon}
                      </span>
                      <div>
                        <h4 className="font-heading font-bold text-slate-100 text-base">
                          {shipment.produceType.name}
                        </h4>
                        <p className="text-xs font-mono-code text-slate-400">
                          {shipment.trackingNumber} • {shipment.quantityKg} kg bulk
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isAccepted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isDeclined
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : offer.status === 'EXPIRED'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse'
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-900 mb-4">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Target Retailer</span>
                      <span className="font-semibold text-slate-200">
                        {offer.retailer ? offer.retailer.name : 'All Partners'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Remaining Shelf Life</span>
                      <span className="font-mono-code font-bold text-amber-400">
                        {offer.remainingShelfLifeHoursAtOffer.toFixed(1)} hours
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-500 text-[10px] uppercase block">Original Price</span>
                      <span className="line-through font-mono-code text-slate-400">
                        ${offer.originalPricePerKg.toFixed(2)}/kg
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="text-slate-500 text-[10px] uppercase block">Liquidation Price ({offer.discountPercent}% OFF)</span>
                      <span className="font-mono-code font-extrabold text-base text-emerald-400">
                        ${offer.discountedPricePerKg.toFixed(2)}/kg
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Optional response notes (e.g. Pickup time, delivery dock details)"
                        value={notes[offer.id] || ''}
                        onChange={(e) => setNotes({ ...notes, [offer.id]: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />

                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-portal-accept-${offer.id}`}
                          onClick={() => handleAction(offer.id, 'ACCEPTED')}
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept & Purchase Batch</span>
                        </button>

                        <button
                          id={`btn-portal-decline-${offer.id}`}
                          onClick={() => handleAction(offer.id, 'DECLINED')}
                          className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center gap-1 transition-all"
                        >
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!isPending && offer.responseNotes && (
                    <div className="mt-2 text-xs italic text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                      Note: "{offer.responseNotes}"
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
