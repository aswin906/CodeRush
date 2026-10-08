import React from 'react';
import { DiscountOffer, Shipment } from '../types';
import { Tag, TrendingDown, Store, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DiscountPanelProps {
  shipment: Shipment;
  offers?: DiscountOffer[];
  onRespondOffer?: (offerId: string, status: 'ACCEPTED' | 'DECLINED') => Promise<void>;
}

export const DiscountPanel: React.FC<DiscountPanelProps> = ({ shipment, offers = [], onRespondOffer }) => {
  const activeOffers = offers.length > 0 ? offers : shipment.discountOffers || [];

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-400" />
          <h3 className="font-heading font-bold text-slate-100 text-sm">
            Automated Liquidation Discounts
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          {activeOffers.length} Offers Triggered
        </span>
      </div>

      {activeOffers.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-900">
          <p>No liquidation discount triggered yet.</p>
          <p className="mt-1 text-slate-600">
            Offers trigger automatically when remaining shelf life drops below 35% or 48 hours.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeOffers.map((offer) => {
            const isPending = offer.status === 'PENDING';
            const isAccepted = offer.status === 'ACCEPTED';

            return (
              <div
                key={offer.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isAccepted
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : isPending
                    ? 'bg-purple-950/20 border-purple-500/30'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">
                        {offer.retailer ? offer.retailer.name : 'Target Retailer Network'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {offer.retailer ? offer.retailer.location : 'Regional Partners'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAccepted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : offer.status === 'DECLINED'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : offer.status === 'EXPIRED'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse'
                    }`}
                  >
                    {offer.status}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg text-xs font-mono-code mb-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <TrendingDown className="w-3.5 h-3.5 text-purple-400" />
                    <span>Discount:</span>
                    <span className="font-bold text-purple-300">{offer.discountPercent}% OFF</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="line-through text-slate-500 text-[11px]">
                      ${offer.originalPricePerKg.toFixed(2)}/kg
                    </span>
                    <span className="font-bold text-emerald-400 text-sm">
                      ${offer.discountedPricePerKg.toFixed(2)}/kg
                    </span>
                  </div>
                </div>

                {/* Response controls if callback provided and pending */}
                {isPending && onRespondOffer && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
                    <button
                      id={`btn-accept-offer-${offer.id}`}
                      onClick={() => onRespondOffer(offer.id, 'ACCEPTED')}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1 transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Accept Offer</span>
                    </button>
                    <button
                      id={`btn-decline-offer-${offer.id}`}
                      onClick={() => onRespondOffer(offer.id, 'DECLINED')}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
