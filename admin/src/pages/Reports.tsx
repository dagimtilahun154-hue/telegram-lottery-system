import React, { useState } from 'react';
import { FileDown, Printer, Layers, CheckCircle2 } from 'lucide-react';
import { LotteryEvent } from '../types';
import { useI18n } from '../lib/i18n';

interface ReportsProps {
  events: LotteryEvent[];
  purchases: any[];
}

export const Reports: React.FC<ReportsProps> = ({ events, purchases }) => {
  const { t } = useI18n();
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || 'ALL');

  const currentEvent = events.find(e => e.id === selectedEventId);
  const filtered = purchases.filter(p => selectedEventId === 'ALL' || p.eventId === selectedEventId);
  const issuedOnly = filtered.filter(p => p.status === 'ISSUED');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Ticket Number,Customer Name,Phone Number,Telegram Username,Event,Price (ETB),Payment Provider,Transaction Reference,Purchase Time"].join(",") + "\n"
      + issuedOnly.map(p => `"${p.ticketNumber}","${p.customerName}","${p.phoneNumber}","${p.telegramUsername || ''}","${p.eventTitle}","${p.amount}","${p.provider}","${p.reference || ''}","${p.time}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `official_participant_register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.reports}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs and official lottery compliance registers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="btn-secondary"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-primary"
          >
            <FileDown className="w-3.5 h-3.5" /> {t.exportData}
          </button>
        </div>
      </div>

      {/* Filter by Event */}
      <div className="flex items-center gap-3 p-3 reference-card max-w-sm">
        <Layers className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-xs font-bold text-slate-700">{t.events}:</span>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 focus:outline-none cursor-pointer font-bold"
        >
          <option value="ALL">{t.allEvents}</option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.title} ({evt.ticket_price} ETB)
            </option>
          ))}
        </select>
      </div>

      {/* Official Printable Register Document */}
      <div className="p-6 sm:p-8 reference-card space-y-6 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-5 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Official Registry of Paid Tickets
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">
              {currentEvent ? currentEvent.title : 'Combined Platform Lottery Events'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authority Source: Veritas Verified
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-bold">Verified Eligible</span>
            <span className="text-2xl font-black text-slate-900">{issuedOnly.length}</span>
          </div>
        </div>

        {/* Participant Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Ticket #</th>
                <th className="py-2.5 px-3">{t.customer}</th>
                <th className="py-2.5 px-3">{t.phone}</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Rail</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {issuedOnly.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                    No verified tickets issued yet.
                  </td>
                </tr>
              ) : (
                issuedOnly.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{p.ticketNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{p.customerName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.phoneNumber}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400">{p.source}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{p.provider}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{p.reference || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
