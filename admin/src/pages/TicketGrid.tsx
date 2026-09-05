import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Layers, 
  Ticket as TicketIcon,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LotteryEvent, TicketStatus } from '../types';
import { useI18n } from '../lib/i18n';

interface TicketGridProps {
  events: LotteryEvent[];
  selectedEventId: string;
  onSelectEventId: (id: string) => void;
  purchases: any[];
  onOpenReceipt: (purchase: any) => void;
}

export const TicketGrid: React.FC<TicketGridProps> = ({
  events,
  selectedEventId,
  onSelectEventId,
  purchases,
  onOpenReceipt
}) => {
  const { t } = useI18n();
  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [searchNumber, setSearchNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [inspectedTicket, setInspectedTicket] = useState<any>(null);

  // 100 numbers per page
  const pageSize = 100;
  const totalPages = currentEvent ? Math.ceil((currentEvent.total_tickets || 0) / pageSize) : 0;

  const rangeStart = selectedRangeIndex * pageSize + 1;
  const rangeEnd = currentEvent ? Math.min((selectedRangeIndex + 1) * pageSize, currentEvent.total_tickets || 0) : 0;

  // Map known tickets by number for this event
  const ticketMap = useMemo(() => {
    const map = new Map<number, any>();
    purchases.filter(p => p.eventId === currentEvent?.id).forEach(p => {
      map.set(p.ticketNumber, p);
    });
    return map;
  }, [purchases, currentEvent?.id]);

  // Numbers in current 100 block
  const numbersInRange = useMemo(() => {
    const arr = [];
    for (let i = rangeStart; i <= rangeEnd; i++) {
      arr.push(i);
    }
    return arr;
  }, [rangeStart, rangeEnd]);

  // Counts for summary pills
  const totalSold = purchases.filter(p => p.eventId === currentEvent?.id && p.status === 'ISSUED').length;
  const totalReserved = purchases.filter(p => p.eventId === currentEvent?.id && p.status === 'RESERVED').length;
  const totalReview = purchases.filter(p => p.eventId === currentEvent?.id && p.status === 'MANUAL_REVIEW').length;
  const totalAvailable = Math.max(0, (currentEvent?.total_tickets || 0) - (totalSold + totalReserved + totalReview));

  const getTicketDesign = (status: TicketStatus) => {
    switch (status) {
      case 'ISSUED':
        return {
          container: 'bg-[#0a1727] text-white border-transparent shadow-sm hover:shadow-glow-blue',
          dot: 'bg-emerald-400',
          badgeText: t.issued,
          badgeBg: 'bg-emerald-400/20 text-emerald-300'
        };
      case 'RESERVED':
        return {
          container: 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black ring-2 ring-amber-400/40',
          dot: 'bg-slate-950',
          badgeText: t.reserved,
          badgeBg: 'bg-slate-950/80 text-amber-300'
        };
      case 'MANUAL_REVIEW':
        return {
          container: 'bg-rose-600 text-white border-rose-500 shadow-sm ring-2 ring-rose-400/40',
          dot: 'bg-white',
          badgeText: t.manualReview,
          badgeBg: 'bg-white/20 text-white'
        };
      case 'PAYMENT_SUBMITTED':
      case 'VERIFYING':
        return {
          container: 'bg-blue-600 text-white border-blue-500 shadow-sm',
          dot: 'bg-white',
          badgeText: t.verifying,
          badgeBg: 'bg-white/20 text-white'
        };
      case 'AVAILABLE':
      default:
        return {
          container: 'bg-white/95 text-slate-700 border-slate-200/80 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/40 shadow-2xs',
          dot: 'bg-slate-300',
          badgeText: t.available,
          badgeBg: 'bg-slate-100 text-slate-500'
        };
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(searchNumber, 10);
    if (isNaN(num) || num < 1 || num > (currentEvent?.total_tickets || 0)) return;

    const targetPage = Math.floor((num - 1) / pageSize);
    setSelectedRangeIndex(targetPage);

  };

  if (!currentEvent) {
    return (
      <div className="reference-card p-12 text-center max-w-md mx-auto space-y-3 my-12">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
          🎟️
        </div>
        <h3 className="text-base font-black text-slate-900">No Lottery Events Available</h3>
        <p className="text-xs text-slate-500">
          Create a lottery event first to browse and manage ticket number reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.grid}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <strong className="text-slate-900 font-bold">{currentEvent?.title}</strong> • {currentEvent?.ticket_price} ETB
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Event Dropdown */}
          <div className="flex items-center gap-2 bg-white/90 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedEventId === 'ALL' ? currentEvent?.id : selectedEventId}
              onChange={(e) => {
                onSelectEventId(e.target.value);
                setSelectedRangeIndex(0);
              }}
              className="bg-transparent text-xs text-slate-900 font-bold focus:outline-none cursor-pointer"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.ticket_price} ETB)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search Number */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="number"
              placeholder="Ticket #..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              className="input-clean pl-8 w-36"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </form>
        </div>
      </div>

      {/* Summary Counter Cards with Smooth Curves */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Available */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'AVAILABLE' 
              ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/20 shadow-sm' 
              : 'reference-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{t.available}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {totalAvailable.toLocaleString()}
          </div>
        </button>

        {/* Reserved */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'RESERVED' ? 'ALL' : 'RESERVED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'RESERVED' 
              ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/20 shadow-sm' 
              : 'reference-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700">
            <span>{t.reserved} (15m)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-1">
            {totalReserved.toLocaleString()}
          </div>
        </button>

        {/* Paid / Issued */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'ISSUED' ? 'ALL' : 'ISSUED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ISSUED' 
              ? 'bg-slate-100 border-[#0a1727] ring-2 ring-[#0a1727]/20 shadow-sm' 
              : 'reference-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>{t.issued}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#0a1727]" />
          </div>
          <div className="text-xl font-black text-[#0a1727] mt-1">
            {totalSold.toLocaleString()}
          </div>
        </button>

        {/* Manual Review */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'MANUAL_REVIEW' ? 'ALL' : 'MANUAL_REVIEW')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'MANUAL_REVIEW' 
              ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-400/20 shadow-sm' 
              : 'reference-card'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-600">
            <span>{t.manualReview}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 mt-1">
            {totalReview.toLocaleString()}
          </div>
        </button>
      </div>

      {/* Pagination & Range Block Navigation Bar */}
      <div className="reference-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Range:</span>
            <span className="px-3 py-1 rounded-xl bg-[#0a1727] text-white font-mono font-bold text-xs shadow-sm">
              #{rangeStart} – #{rangeEnd}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({selectedRangeIndex + 1} / {totalPages})
            </span>
          </div>

          {/* Pagination Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              disabled={selectedRangeIndex === 0}
              onClick={() => setSelectedRangeIndex(prev => Math.max(0, prev - 1))}
              className="p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-600 shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Direct 100s Quick Scroller */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md scrollbar-none px-1">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const s = idx * pageSize + 1;
                const e = Math.min((idx + 1) * pageSize, currentEvent.total_tickets);
                const isSelected = selectedRangeIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedRangeIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-glow-blue'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {s}–{e}
                  </button>
                );
              })}
            </div>

            <button
              disabled={selectedRangeIndex >= totalPages - 1}
              onClick={() => setSelectedRangeIndex(prev => Math.min(totalPages - 1, prev + 1))}
              className="p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-600 shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 10x10 Organized Ticket Grid */}
        <div className="pt-2">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
            {numbersInRange.map((num) => {
              const purchase = ticketMap.get(num);
              const status: TicketStatus = purchase ? purchase.status : 'AVAILABLE';

              const matchesFilter = statusFilter === 'ALL' || status === statusFilter;
              const design = getTicketDesign(status);

              return (
                <button
                  key={num}
                  disabled={!matchesFilter}
                  onClick={() => {
                    if (purchase) {
                      onOpenReceipt(purchase);
                    } else {
                      setInspectedTicket({
                        ticketNumber: num,
                        status: 'AVAILABLE' as const,
                        eventTitle: currentEvent?.title,
                        amount: currentEvent?.ticket_price
                      });
                    }
                  }}
                  className={`group relative h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all duration-200 cursor-pointer ${
                    design.container
                  } ${!matchesFilter ? 'opacity-20 pointer-events-none' : 'hover:scale-105 z-10'}`}
                >
                  {/* Status Indicator Dot */}
                  <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${design.dot}`} />

                  {/* Ticket Number */}
                  <span className="font-mono text-xs sm:text-sm font-black leading-none">
                    #{num}
                  </span>

                  {/* Status Tag */}
                  <span className={`mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md leading-tight ${design.badgeBg}`}>
                    {design.badgeText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ticket Details Inspector Drawer / Modal with Smooth Curves */}
      {inspectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-premium space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TicketIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">{t.ticket} #{inspectedTicket.ticketNumber}</h3>
              </div>
              <button
                onClick={() => setInspectedTicket(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{t.events}:</span>
                <span className="font-semibold text-slate-900">{inspectedTicket.eventTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{t.amount}:</span>
                <span className="font-bold text-slate-900">{inspectedTicket.amount} ETB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">{t.status}:</span>
                <span className="font-bold uppercase text-blue-700">{inspectedTicket.status}</span>
              </div>

              {inspectedTicket.customerName && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">{t.customer}:</span>
                    <span className="font-semibold text-slate-900">{inspectedTicket.customerName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">{t.phone}:</span>
                    <span className="font-mono text-slate-800">{inspectedTicket.phoneNumber}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2">
              {inspectedTicket.receiptUrl ? (
                <button
                  onClick={() => {
                    const tkt = inspectedTicket;
                    setInspectedTicket(null);
                    onOpenReceipt(tkt);
                  }}
                  className="btn-primary w-full py-2.5"
                >
                  {t.viewReceipt}
                </button>
              ) : (
                <button
                  onClick={() => setInspectedTicket(null)}
                  className="btn-secondary w-full py-2"
                >
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
