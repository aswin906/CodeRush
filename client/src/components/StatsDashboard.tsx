import React, { useState, useEffect } from 'react';
import { BuyerStats, ProductStats, StatsSummary } from '../types';
import * as api from '../api/client';
import { BarChart3, TrendingUp, DollarSign, Scale, Store, Tag, Calendar, RefreshCw, Award, PieChart, ShieldCheck } from 'lucide-react';

export const StatsDashboard: React.FC = () => {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [buyerStats, setBuyerStats] = useState<BuyerStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (fromDate?: string, toDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [buyers, products, sum] = await Promise.all([
        api.fetchBuyerStats(fromDate || undefined, toDate || undefined),
        api.fetchProductStats(fromDate || undefined, toDate || undefined),
        api.fetchStatsSummary(fromDate || undefined, toDate || undefined),
      ]);
      setBuyerStats(buyers);
      setProductStats(products);
      setSummary(sum);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError(err.message || 'Failed to load statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadStats(from, to);
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    loadStats();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border-emerald-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="font-heading font-extrabold text-2xl text-slate-100">
                Buyer & Product Liquidation Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Performance metrics tracking total revenue recovered, stock volume sold, buyer purchasing activity, and produce liquidation efficiency.
            </p>
          </div>

          {/* Date Filter Bar */}
          <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1 text-xs text-slate-400 font-bold px-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Range:
            </div>
            <input
              type="date"
              aria-label="From Date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              aria-label="To Date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
            >
              Filter
            </button>
            {(from || to) && (
              <button
                type="button"
                onClick={handleReset}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all"
                title="Reset Date Filter"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Computing analytics aggregations from server SQL engines...</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center text-rose-400 rounded-2xl border border-rose-500/30 bg-rose-950/10">
          <p className="text-xs font-semibold">{error}</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Revenue Recovered */}
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Total Revenue Recovered</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-heading font-extrabold text-2xl text-emerald-400 font-mono-code">
                ${summary?.totalRevenueRecovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Direct sales value from discounted liquidations</p>
            </div>

            {/* KPI 2: Stock Volume Sold */}
            <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-slate-900">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Total Stock Sold</span>
                <Scale className="w-4 h-4 text-blue-400" />
              </div>
              <div className="font-heading font-extrabold text-2xl text-blue-400 font-mono-code">
                {summary?.totalStockSoldKg.toLocaleString() ?? 0} <span className="text-sm font-sans text-slate-400">kg</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Rescued produce volume diverted from landfill</p>
            </div>

            {/* KPI 3: Top Buyer */}
            <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-slate-900">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Top Retailer Partner</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="font-heading font-extrabold text-lg text-slate-100 truncate">
                {summary?.topBuyer || 'None yet'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Highest cumulative purchase volume</p>
            </div>

            {/* KPI 4: Most Liquidated Produce */}
            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Most Liquidated Produce</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-heading font-extrabold text-lg text-amber-400 truncate">
                {summary?.mostLiquidatedProduct || 'None yet'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Highest frequency discount triggers</p>
            </div>
          </div>

          {/* Section 1: Retailer Buyer Statistics */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-400" />
                <span>Retailer Buyer Performance Breakdown</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono-code uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">Retailer Partner</th>
                    <th className="px-4 py-3 font-bold text-right">Volume Bought (kg)</th>
                    <th className="px-4 py-3 font-bold text-right">Total Spent ($)</th>
                    <th className="px-4 py-3 font-bold text-right">Avg Discount Received</th>
                    <th className="px-4 py-3 font-bold text-center">Completed Purchases</th>
                    <th className="px-4 py-3 font-bold text-center">Reversals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {buyerStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500 italic">
                        No purchase activity recorded for selected range.
                      </td>
                    </tr>
                  ) : (
                    buyerStats.map((b) => (
                      <tr key={b.retailerId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-200 flex items-center gap-2">
                          <Store className="w-4 h-4 text-purple-400" />
                          {b.retailerName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-code font-bold text-slate-200">
                          {b.totalKgBought.toLocaleString()} kg
                        </td>
                        <td className="px-4 py-3 text-right font-mono-code font-extrabold text-emerald-400">
                          ${b.totalSpent.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-code font-bold text-purple-300">
                          {b.avgDiscountPercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center font-mono-code">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            {b.completedPurchasesCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono-code">
                          <span className={`px-2 py-0.5 rounded-full font-bold border ${
                            b.reversedPurchasesCount > 0
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}>
                            {b.reversedPurchasesCount}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Produce Product Liquidation Performance */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-400" />
                <span>Produce Liquidation Performance</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono-code uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-bold">Produce Variety</th>
                    <th className="px-4 py-3 font-bold text-center">Liquidated Batches</th>
                    <th className="px-4 py-3 font-bold text-center">Sold Out Batches</th>
                    <th className="px-4 py-3 font-bold text-right">Volume Sold (kg)</th>
                    <th className="px-4 py-3 font-bold text-right">Revenue Recovered</th>
                    <th className="px-4 py-3 font-bold text-right">Avg Discount Offered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {productStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500 italic">
                        No product statistics available.
                      </td>
                    </tr>
                  ) : (
                    productStats.map((p) => (
                      <tr key={p.produceTypeId} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-200 flex items-center gap-2">
                          <span className="text-xl p-1 rounded bg-slate-900 border border-slate-800">{p.icon}</span>
                          {p.produceTypeName}
                        </td>
                        <td className="px-4 py-3 text-center font-mono-code font-bold text-orange-400">
                          {p.totalLiquidatedShipments}
                        </td>
                        <td className="px-4 py-3 text-center font-mono-code font-bold text-purple-400">
                          {p.soldOutShipments}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-code font-bold text-slate-200">
                          {p.totalKgSold.toLocaleString()} kg
                        </td>
                        <td className="px-4 py-3 text-right font-mono-code font-extrabold text-emerald-400">
                          ${p.totalRevenueRecovered.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-code font-bold text-amber-400">
                          {p.avgDiscountOffered.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Offer Status Breakdown */}
          {summary?.offerStatusCounts && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h4 className="font-heading font-bold text-sm text-slate-200 flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-blue-400" />
                Discount Offer Lifecycle Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(summary.offerStatusCounts).map(([st, cnt]) => (
                  <div key={st} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-mono-code font-bold text-slate-400 uppercase tracking-wider block">
                      {st}
                    </span>
                    <span className="text-lg font-mono-code font-extrabold text-slate-100">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
