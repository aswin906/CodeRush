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
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-code font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
            <Activity className="w-3 h-3" /> MODEL_RECALC
          </span>
        );
      case 'DISCOUNT_TRIGGERED':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-code font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
            <Tag className="w-3 h-3" /> DISCOUNT_TRIGGER
          </span>
        );
      case 'RETAILER_RESPONSE':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-code font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> RETAILER_RESP
          </span>
        );
      case 'SHIPMENT_CREATED':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-code font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <Box className="w-3 h-3" /> SHIPMENT_NEW
          </span>
        );
      case 'SIMULATOR_TOGGLED':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-code font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Sliders className="w-3 h-3" /> SIM_TOGGLE
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono-code font-bold bg-slate-800 text-slate-300">
            {eventType}
          </span>
        );
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-heading font-bold text-slate-100 text-base">
              System Audit Trail & Decision Log
            </h3>
            <p className="text-xs text-slate-400">
              Immutable record of every automated degradation recalculation, discount trigger, and retailer response.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono-code px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
          {logs.length} Entries Recorded
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-xs">
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            let formattedDetails = log.details;
            try {
              formattedDetails = JSON.stringify(JSON.parse(log.details), null, 2);
            } catch (e) {
              // fallback raw string
            }

            return (
              <div
                key={log.id}
                className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden transition-all hover:border-slate-700"
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getEventBadge(log.eventType)}
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {log.summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-mono-code text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3.5 bg-slate-950/80 border-t border-slate-800/80 text-xs font-mono-code text-cyan-300/90 overflow-x-auto">
                    <div className="text-[10px] text-slate-500 mb-1.5 uppercase font-sans font-semibold">
                      Raw Event Payload & Inputs:
                    </div>
                    <pre className="whitespace-pre-wrap">{formattedDetails}</pre>
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
