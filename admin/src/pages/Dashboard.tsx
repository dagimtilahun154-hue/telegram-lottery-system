import React from 'react';
import { 
  DollarSign, 
  Ticket, 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  Plus, 
  Send, 
  Calendar as CalendarIcon,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { LotteryEvent } from '../types';
import { useI18n } from '../lib/i18n';

interface DashboardProps {
  events: LotteryEvent[];
  purchases: any[];
  onSelectEvent: (eventId: string) => void;
  onNavigate: (tab: string) => void;
  onOpenReceipt: (purchase: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  events,
  purchases,
  onSelectEvent,
  onNavigate,
  onOpenReceipt
}) => {
  const { t } = useI18n();

  const totalRevenue = events.reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalTicketsSold = events.reduce((sum, e) => sum + (e.sold_tickets || 0), 0);
  const totalTicketsCapacity = events.reduce((sum, e) => sum + (e.total_tickets || 0), 0);
  const activeReservationsCount = purchases.filter(p => p.status === 'RESERVED' || p.status === 'PAYMENT_SUBMITTED').length;
  const manualReviewCount = purchases.filter(p => p.status === 'MANUAL_REVIEW').length;
  const pendingVerificationsCount = purchases.filter(p => p.status === 'PAYMENT_SUBMITTED' || p.status === 'VERIFYING').length;

  return (
    <div className="space-y-6">
      {/* Title & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.dashboard}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {events.length} {t.activeLotteries}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('events')}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> {t.createEvent}
          </button>

          <button
            onClick={() => onNavigate('broadcast')}
            className="btn-secondary"
          >
            <Send className="w-4 h-4 text-blue-600" /> {t.sendBroadcast}
          </button>
        </div>
      </div>

      {/* Operator Action Banner */}
      {manualReviewCount > 0 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/80 shadow-premium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse-subtle">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
              ⚡
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                <span>👉 {manualReviewCount} Receipt{manualReviewCount > 1 ? 's' : ''} Waiting For Your Check!</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Needs Action
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-0.5 font-medium">
                Receipt screenshots were parsed by local OCR and are awaiting your 1-click confirmation.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('purchases')}
            className="btn-primary bg-amber-600 hover:bg-amber-700 text-white shadow-md border-0 py-2.5 px-5 font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Review Receipts Now ({manualReviewCount}) →
          </button>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-300/60 flex items-center justify-between shadow-soft-blur">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
              ✓
            </span>
            <div>
              <span className="text-xs sm:text-sm font-bold text-emerald-950 block">
                All caught up! Zero receipts waiting for approval.
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">
                Automated CBE Direct Verifier (Free Unlimited) and Telebirr Veritas Pool are active.
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Auto-Verification Engine Active
          </div>
        </div>
      )}

      {/* Operator 1-Click Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('broadcast')}
          className="reference-card p-3.5 flex items-center gap-3 text-left hover:border-blue-400/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
            📢
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Post Announcement</div>
            <div className="text-[11px] text-slate-400">Channel, group or all users</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('manual-sales')}
          className="reference-card p-3.5 flex items-center gap-3 text-left hover:border-emerald-400/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
            💵
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Record Cash Sale</div>
            <div className="text-[11px] text-slate-400">Walk-in paper or bank tickets</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('winners')}
          className="reference-card p-3.5 flex items-center gap-3 text-left hover:border-purple-400/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
            🏆
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600">Pick Draw Winner</div>
            <div className="text-[11px] text-slate-400">Provably-fair lottery draw</div>
          </div>
        </button>
      </div>

      {/* Top 5 Stat Cards with Smooth Curves & Ambient Shadows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Revenue */}
        <div className="reference-card p-5 flex flex-col justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-glow-emerald shrink-0 transition-transform group-hover:scale-105">
              <DollarSign className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.totalRevenue}</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                {totalRevenue.toLocaleString()} <span className="text-xs font-semibold text-slate-500">ETB</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-emerald-600">Verified Revenue</span>
            <span className="text-slate-400 font-mono text-[10px]">CBE / TB</span>
          </div>
        </div>

        {/* 2. Tickets Issued */}
        <div className="reference-card p-5 flex flex-col justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-glow-blue shrink-0 transition-transform group-hover:scale-105">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.ticketsIssued}</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                {totalTicketsSold.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {totalTicketsCapacity.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${totalTicketsCapacity ? (totalTicketsSold / totalTicketsCapacity) * 100 : 0}%` }}
              />
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-1 flex justify-between">
              <span>Progress</span>
              <span>{(totalTicketsCapacity ? (totalTicketsSold / totalTicketsCapacity) * 100 : 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 3. Active Reservations */}
        <div className="reference-card p-5 flex flex-col justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.activeReservations}</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                {activeReservationsCount}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-indigo-600 font-semibold">15-Min Timer</span>
            <span className="text-slate-400 font-mono text-[10px]">Auto-release</span>
          </div>
        </div>

        {/* 4. Pending Verifications */}
        <div className="reference-card p-5 flex flex-col justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.pendingVerifications}</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                {pendingVerificationsCount}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-amber-600 font-semibold">Veritas OCR</span>
            <span className="text-slate-400 font-mono text-[10px]">Direct API</span>
          </div>
        </div>

        {/* 5. Manual Review Queue */}
        <div className="reference-card p-5 flex flex-col justify-between group">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.manualReviewQueue}</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                {manualReviewCount}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">Requires Audit</span>
            <button 
              onClick={() => onNavigate('purchases')}
              className="text-blue-600 hover:underline font-bold text-[10px]"
            >
              Open &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Middle Section: Active Lottery Events Table */}
      <div className="reference-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            {t.activeLotteries}
          </h2>
          <button
            onClick={() => onNavigate('events')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition-colors"
          >
            {t.events} &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="pb-3 px-2">{t.events}</th>
                <th className="pb-3 px-3">{t.amount}</th>
                <th className="pb-3 px-3">Capacity</th>
                <th className="pb-3 px-3">{t.issued}</th>
                <th className="pb-3 px-3">Progress</th>
                <th className="pb-3 px-3">Provider</th>
                <th className="pb-3 px-3">{t.status}</th>
                <th className="pb-3 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-slate-700">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <p className="font-semibold text-slate-600 mb-1">No active lotteries found</p>
                    <p className="text-[11px] text-slate-400 mb-3">Create your first lottery event to start selling tickets.</p>
                    <button 
                      onClick={() => onNavigate('events')}
                      className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t.createEvent}
                    </button>
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                const sold = evt.sold_tickets || 0;
                const percentage = ((sold / evt.total_tickets) * 100).toFixed(1);

                return (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={evt.image_url}
                          alt={evt.title}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 shadow-xs shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{evt.title}</div>
                          <div className="text-[10px] text-slate-400">ID: {evt.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {evt.ticket_price} ETB
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {evt.total_tickets.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {sold.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="w-24">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1">{percentage}%</div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200/60">
                        {evt.payment_provider}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <button 
                        onClick={() => onSelectEvent(evt.id)}
                        className="btn-secondary py-1 px-2.5 text-[11px]"
                      >
                        {t.details}
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2 Split Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchases */}
        <div className="reference-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-600" />
              {t.recentTransactions}
            </h3>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              {t.purchases} &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-2.5 px-2">#</th>
                  <th className="pb-2.5 px-3">{t.customer}</th>
                  <th className="pb-2.5 px-3">{t.amount}</th>
                  <th className="pb-2.5 px-3">{t.status}</th>
                  <th className="pb-2.5 px-2 text-right">{t.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchases.slice(0, 5).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">
                        {p.ticketNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate">{p.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.phoneNumber}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.amount.toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 px-3">
                        {p.status === 'ISSUED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t.issued}
                          </span>
                        )}
                        {p.status === 'RESERVED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t.reserved}
                          </span>
                        )}
                        {p.status === 'MANUAL_REVIEW' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {t.manualReview}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right text-[10px] text-slate-400">
                        {p.time || 'Recently'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Queue */}
        <div className="reference-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              {t.pendingVerifications}
            </h3>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              {t.payments} &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-2.5 px-2">#</th>
                  <th className="pb-2.5 px-3">{t.customer}</th>
                  <th className="pb-2.5 px-3">{t.amount}</th>
                  <th className="pb-2.5 px-3">Provider</th>
                  <th className="pb-2.5 px-2 text-right">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchases.filter(p => p.status === 'PAYMENT_SUBMITTED' || p.status === 'MANUAL_REVIEW').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No pending verifications waiting.
                    </td>
                  </tr>
                ) : (
                  purchases.filter(p => p.status === 'PAYMENT_SUBMITTED' || p.status === 'MANUAL_REVIEW').slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-2 text-slate-400 font-mono text-[11px]">
                        {p.ticketNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate">{p.customerName}</div>
                        <div className="text-[10px] text-slate-400">{p.provider}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.amount.toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {p.provider}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => onOpenReceipt(p)}
                          className="btn-secondary py-1 px-2.5 text-[11px] text-blue-700 hover:bg-blue-50"
                        >
                          {t.viewReceipt}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
