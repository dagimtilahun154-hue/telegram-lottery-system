import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Layers,
  Timer,
  FileDown,
  Eye
} from 'lucide-react';
import { LotteryEvent } from '../types';
import { useI18n } from '../lib/i18n';

interface PurchasesProps {
  purchases: any[];
  events: LotteryEvent[];
  selectedEventId: string;
  onSelectEventId: (id: string) => void;
  onOpenReceipt: (purchase: any) => void;
}

export const Purchases: React.FC<PurchasesProps> = ({
  purchases,
  events,
  selectedEventId,
  onSelectEventId,
  onOpenReceipt
}) => {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Real-time timer for 15-minute countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered = purchases.filter((p) => {
    if (selectedEventId !== 'ALL' && p.eventId !== selectedEventId) {
      return false;
    }
    if (statusFilter !== 'ALL' && p.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = p.customerName?.toLowerCase().includes(term);
      const matchPhone = p.phoneNumber?.toLowerCase().includes(term);
      const matchTicket = p.ticketNumber?.toString().includes(term);
      const matchRef = p.reference?.toLowerCase().includes(term);
      const matchUser = p.telegramUsername?.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchTicket && !matchRef && !matchUser) {
        return false;
      }
    }
    return true;
  });

  const getRemainingTime = (expiresAtStr: string) => {
    if (!expiresAtStr) return null;
    const diff = new Date(expiresAtStr).getTime() - currentTime;
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  const exportCSV = () => {
    const headers = ['Ticket #', 'Customer Name', 'Phone', 'Event', 'Amount', 'Provider', 'Status', 'Date'];
    const rows = filtered.map(p => [
      p.ticketNumber,
      p.customerName,
      p.phoneNumber,
      p.eventTitle,
      p.amount,
      p.provider,
      p.status,
      p.time || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lottery_purchases_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>{t.purchases}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200/80">
              {filtered.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of ticket purchases, automated matches, and reviews.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="btn-secondary"
          >
            <FileDown className="w-4 h-4" />
            {t.exportData}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="reference-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-clean pl-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Event Filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedEventId}
              onChange={(e) => onSelectEventId(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t.allEvents}</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'ISSUED', label: t.issued },
            { id: 'RESERVED', label: t.reserved },
            { id: 'MANUAL_REVIEW', label: t.manualReview },
            { id: 'PAYMENT_SUBMITTED', label: t.verifying },
            { id: 'REJECTED', label: t.rejected },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-blue-600 text-white shadow-glow-blue'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="reference-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="py-3 px-3">Ticket</th>
                <th className="py-3 px-3">{t.customer}</th>
                <th className="py-3 px-3">{t.events}</th>
                <th className="py-3 px-3">{t.amount}</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">{t.status}</th>
                <th className="py-3 px-3">{t.date}</th>
                <th className="py-3 px-3 text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No payment records found. Real-time participant purchases will appear here automatically.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                const remaining = p.status === 'RESERVED' && p.expiresAt ? getRemainingTime(p.expiresAt) : null;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-black text-slate-900">
                      #{p.ticketNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.phoneNumber}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium truncate max-w-[140px]">
                      {p.eventTitle}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {p.amount.toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200/60">
                        {p.provider}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {p.status === 'ISSUED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t.issued}
                        </span>
                      )}
                      {p.status === 'RESERVED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                          <Timer className="w-3 h-3 animate-spin" /> {remaining || t.reserved}
                        </span>
                      )}
                      {(p.status === 'PAYMENT_SUBMITTED' || p.status === 'VERIFYING' || p.status === 'EXTRACTING' || p.status === 'PENDING') && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> {t.verifying || 'Verifying'}
                        </span>
                      )}
                      {p.status === 'MANUAL_REVIEW' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {t.manualReview}
                        </span>
                      )}
                      {p.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {t.rejected}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[10px] text-slate-400">
                      {p.time || 'Recently'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onOpenReceipt(p)}
                        className="btn-secondary py-1 px-2.5 text-[11px] text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-3 h-3" />
                        {t.viewReceipt}
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
