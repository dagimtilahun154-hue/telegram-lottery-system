import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Search, 
  UserPlus, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { LotteryEvent, TicketStatus } from '../types';
import { useI18n } from '../lib/i18n';

interface ManualSalesProps {
  events: LotteryEvent[];
  purchases: any[];
  onAddManualSale: (sale: any) => void;
}

export const ManualSales: React.FC<ManualSalesProps> = ({ 
  events, 
  purchases, 
  onAddManualSale 
}) => {
  const { t } = useI18n();
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<number | null>(null);
  const [gridPage, setGridPage] = useState(0);
  const [gridSearch, setGridSearch] = useState('');

  // Buyer details
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+251');
  const [paymentProvider, setPaymentProvider] = useState('CASH');
  const [reference, setReference] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  // Map existing tickets for this event
  const ticketMap = useMemo(() => {
    const map = new Map<number, any>();
    purchases.filter(p => p.eventId === currentEvent?.id).forEach(p => {
      map.set(p.ticketNumber, p);
    });
    return map;
  }, [purchases, currentEvent?.id]);

  const pageSize = 100;
  const totalPages = currentEvent ? Math.ceil((currentEvent.total_tickets || 0) / pageSize) : 0;
  const rangeStart = gridPage * pageSize + 1;
  const rangeEnd = currentEvent ? Math.min((gridPage + 1) * pageSize, currentEvent.total_tickets || 0) : 0;

  const numbersInRange = useMemo(() => {
    const arr = [];
    for (let i = rangeStart; i <= rangeEnd; i++) {
      arr.push(i);
    }
    return arr;
  }, [rangeStart, rangeEnd]);

  const handleGridSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(gridSearch, 10);
    if (isNaN(num) || num < 1 || num > (currentEvent?.total_tickets || 0)) return;

    const page = Math.floor((num - 1) / pageSize);
    setGridPage(page);

    const isTaken = ticketMap.has(num);
    if (!isTaken) {
      setSelectedTicketNumber(num);
    }
  };

  if (!currentEvent) {
    return (
      <div className="reference-card p-12 text-center max-w-md mx-auto space-y-3 my-12">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
          💵
        </div>
        <h3 className="text-base font-black text-slate-900">No Lottery Events Available</h3>
        <p className="text-xs text-slate-500">
          Create an active lottery event first before recording walk-in cash sales.
        </p>
      </div>
    );
  }

  const handleRegisterSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketNumber || !fullName || !phoneNumber) return;

    const newSale = {
      id: `pay-manual-${Date.now()}`,
      ticketNumber: selectedTicketNumber,
      customerName: fullName,
      phoneNumber,
      telegramUsername: undefined,
      eventId: currentEvent.id,
      eventTitle: currentEvent.title,
      amount: currentEvent.ticket_price,
      status: 'ISSUED' as const,
      provider: paymentProvider,
      reference: reference || `CASH-${Date.now().toString().slice(-6)}`,
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
      expectedAccount: currentEvent.receiver_account_number,
      detectedAccount: currentEvent.receiver_account_number,
      expectedName: currentEvent.receiver_name,
      detectedName: currentEvent.receiver_name,
      rejectionReason: null,
      time: 'Just now',
      source: 'WALK_IN' as const,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString()
    };

    onAddManualSale(newSale);
    setSuccessMessage(`Ticket #${selectedTicketNumber} issued to ${fullName}!`);
    setTimeout(() => setSuccessMessage(''), 5000);

    // Reset
    setSelectedTicketNumber(null);
    setFullName('');
    setPhoneNumber('+251');
    setReference('');
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>{t.manualSales}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pick an available ticket from the matrix and record cash or direct purchases.
          </p>
        </div>

        {/* Event Switcher */}
        <div className="flex items-center gap-2 bg-white/90 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-sm">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setSelectedTicketNumber(null);
            }}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.ticket_price} ETB)
              </option>
            ))}
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      {/* Two Columns: Visual Matrix on Left (7 cols), Sale Form on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Grid Matrix */}
        <div className="lg:col-span-7 reference-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. Pick Available Ticket
              </h2>
              <div className="text-[11px] text-slate-400 font-mono">
                Range: #{rangeStart} – #{rangeEnd}
              </div>
            </div>

            <form onSubmit={handleGridSearchSubmit} className="relative">
              <input
                type="number"
                placeholder="Jump to #..."
                value={gridSearch}
                onChange={(e) => setGridSearch(e.target.value)}
                className="input-clean pl-8 w-32"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </form>
          </div>

          {/* Quick 100s Pagination */}
          <div className="flex items-center justify-between">
            <button
              disabled={gridPage === 0}
              onClick={() => setGridPage(prev => Math.max(0, prev - 1))}
              className="p-1.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-600 shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-sm scrollbar-none px-1">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setGridPage(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                    gridPage === idx
                      ? 'bg-blue-600 text-white shadow-glow-blue'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {idx * pageSize + 1}–{Math.min((idx + 1) * pageSize, currentEvent?.total_tickets || 5000)}
                </button>
              ))}
            </div>

            <button
              disabled={gridPage >= totalPages - 1}
              onClick={() => setGridPage(prev => Math.min(totalPages - 1, prev + 1))}
              className="p-1.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-600 shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 10x10 Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2">
            {numbersInRange.map((num) => {
              const purchase = ticketMap.get(num);
              const isTaken = Boolean(purchase);
              const isSelected = selectedTicketNumber === num;

              return (
                <button
                  key={num}
                  disabled={isTaken}
                  onClick={() => setSelectedTicketNumber(num)}
                  className={`h-11 rounded-xl text-xs font-mono font-bold flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/30 shadow-glow-blue scale-105'
                      : isTaken
                      ? 'bg-slate-100/70 border-slate-200 text-slate-400 line-through cursor-not-allowed opacity-50'
                      : 'bg-white border-slate-200/80 text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/50 shadow-2xs'
                  }`}
                >
                  #{num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Buyer Registration Form */}
        <div className="lg:col-span-5 reference-card p-6 space-y-4 flex flex-col justify-between">
          <form onSubmit={handleRegisterSale} className="space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                2. Customer & Payment Details
              </h2>
            </div>

            {/* Selected Number Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Chosen Ticket</span>
                <div className="text-xl font-black text-blue-900">
                  {selectedTicketNumber ? `#${selectedTicketNumber}` : 'None Selected'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400">Price</span>
                <div className="text-base font-bold text-slate-900">{currentEvent?.ticket_price} ETB</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Almaz Bekele"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-clean"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input-clean font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className="input-clean"
                >
                  <option value="CASH">Physical Cash</option>
                  <option value="TELEBIRR">Telebirr Direct</option>
                  <option value="CBE">CBE Direct Transfer</option>
                  <option value="CBE_BIRR">CBE Birr</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Reference / Receipt Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. In-person counter payment"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="input-clean"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedTicketNumber || !fullName || !phoneNumber}
              className="btn-primary w-full py-2.5 mt-2"
            >
              <Check className="w-4 h-4" /> Issue Ticket Immediately
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
