import React, { useState } from 'react';
import { AuditLog } from '../types';
import { ClipboardList, ChevronDown, ChevronRight, Activity, Tag, CheckCircle2, Sliders, Box } from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'MODEL_RECALCULATED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 inline-flex items-center gap-1">
            <Activity className="w-3 h-3" /> MODEL_RECALC
          </span>
        );
      case 'DISCOUNT_TRIGGERED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center gap-1">
            <Tag className="w-3 h-3" /> DISCOUNT_TRIGGER
          </span>
        );
      case 'RETAILER_RESPONSE':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> RETAILER_RESP
          </span>
        );
      case 'SHIPMENT_CREATED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
            <Box className="w-3 h-3" /> SHIPMENT_NEW
          </span>
        );
      case 'SIMULATOR_TOGGLED':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Sliders className="w-3 h-3" /> SIM_TOGGLE
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold bg-slate-800 text-slate-300">
            {eventType}
          </span>
        );
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-slate-100 text-lg">
              System Audit Trail & Decision Log
            </h3>
            <p className="text-xs text-slate-400">
              Immutable record of every automated degradation recalculation, discount trigger, and retailer response.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono-code px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-semibold">
          {logs.length} Entries Recorded
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          No audit logs recorded yet in database.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px] z-10">
              <tr>
                <th scope="col" className="py-3 px-4 w-12">#</th>
                <th scope="col" className="py-3 px-4 w-44">Timestamp</th>
                <th scope="col" className="py-3 px-4 w-44">Event Type</th>
                <th scope="col" className="py-3 px-4">Summary</th>
                <th scope="col" className="py-3 px-4 w-16 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {logs.map((log, index) => {
                const isExpanded = expandedId === log.id;
                let formattedDetails = log.details;
                try {
                  formattedDetails = JSON.stringify(JSON.parse(log.details), null, 2);
                } catch (e) {
                  // raw details string fallback
                }

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpand(log.id);
                        }
                      }}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                      <td className="py-3 px-4 text-slate-500 font-mono-code font-semibold">{index + 1}</td>
                      <td className="py-3 px-4 font-mono-code text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getEventBadge(log.eventType)}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{log.summary}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          aria-label={isExpanded ? 'Collapse log details' : 'Expand log details'}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable JSON details row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-slate-950 p-4 border-t border-slate-800/80">
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                            <span>Raw Event Inputs & Model Record Payload:</span>
                            <span className="font-mono-code text-cyan-400">ID: {log.id}</span>
                          </div>
                          <pre className="font-mono-code text-xs text-cyan-300/90 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                            {formattedDetails}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
