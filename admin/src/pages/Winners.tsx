import React, { useState } from 'react';
import { Trophy, AlertTriangle, Layers, Ticket, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { LotteryEvent } from '../types';
import { useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';

interface WinnersProps {
  events: LotteryEvent[];
  purchases: any[];
}

export const Winners: React.FC<WinnersProps> = ({ events, purchases }) => {
  const { t } = useI18n();
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [winningNumber, setWinningNumber] = useState('');
  const [inspectedWinner, setInspectedWinner] = useState<any>(null);
  const [confirmedWinner, setConfirmedWinner] = useState<any>(null);

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(winningNumber, 10);
    if (isNaN(num)) return;

    const found = purchases.find(p => p.eventId === currentEvent.id && p.ticketNumber === num);
    if (found && found.status === 'ISSUED') {
      setInspectedWinner(found);
    } else {
      setInspectedWinner({
        notFound: true,
        ticketNumber: num,
        message: found ? `Ticket #${num} is currently ${found.status} (Not officially Paid/Issued).` : `Ticket #${num} has not been purchased for this event.`
      });
    }
  };

  const handleConfirmWinner = async () => {
    if (!inspectedWinner || inspectedWinner.notFound) return;
    const winner = inspectedWinner;
    setConfirmedWinner(winner);
    setInspectedWinner(null);
    setWinningNumber('');

    try {
      // 1. Mark ticket as WINNER in database
      await supabase.from('lottery_tickets').update({
        status: 'WINNER'
      }).match({
        event_id: winner.eventId,
        ticket_number: winner.ticketNumber
      });

      // 2. Insert record in public.winners table for transparency & public bot lookup
      if (winner.participantId) {
        await supabase.from('winners').insert({
          event_id: winner.eventId,
          ticket_number: winner.ticketNumber,
          participant_id: winner.participantId,
          prize_title: winner.eventTitle || 'Grand Prize',
          announcement_text: `🎉 Winner: Ticket #${winner.ticketNumber} (${winner.customerName})`,
          draw_method: 'PROVABLY_FAIR'
        });
      }

      // 3. Mark event as WINNER_SELECTED
      await supabase.from('lottery_events').update({
        status: 'WINNER_SELECTED',
        winner_message: `🎉 Official Winner: Ticket #${winner.ticketNumber} (${winner.customerName})`
      }).eq('id', winner.eventId);

      // 4. Queue public broadcast announcement for Telegram Bot subscribers & channel
      await supabase.from('broadcasts').insert({
        event_id: winner.eventId,
        title: `🏆 OFFICIAL WINNER ANNOUNCED!`,
        message_text: `🎉 *እንኳን ደስ አለዎት! የአሸናፊው ቲኬት ይፋ ሆነ!*\n\nለ *${winner.eventTitle}* አሸናፊ የሆነው ቲኬት ቁጥር *#${winner.ticketNumber}* (${winner.customerName}) ነው!\n\nዕድለኛውን አሸናፊ እንኳን ደስ አለዎት እያልን፤ በቅርቡ የሽልማት አሰጣጡን የምናሳውቅ ይሆናል።`,
        target_language: 'ALL',
        status: 'SENDING',
        total_recipients: 1
      });
    } catch (err) {
      console.error('[Supabase] Failed to sync confirmed winner:', err);
    }
  };

  if (!currentEvent) {
    return (
      <div className="reference-card p-12 text-center max-w-md mx-auto space-y-3 my-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
          🏆
        </div>
        <h3 className="text-base font-black text-slate-900">No Lottery Events Available</h3>
        <p className="text-xs text-slate-500">
          Create a lottery event first before drawing and verifying winning tickets.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200/80">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <Trophy className="w-6 h-6 text-amber-500" />
          <span>{t.winners}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Safeguarded 2-step verification ensuring only verified paid tickets can be awarded.
        </p>
      </div>

      {/* Step 1: Input Ticket Number */}
      <form onSubmit={handleLookup} className="reference-card p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" /> {t.events} *
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setInspectedWinner(null);
            }}
            className="input-clean font-bold"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-blue-600" /> Drawn Winning Ticket Number *
          </label>
          <input
            type="number"
            required
            placeholder="e.g. 29"
            value={winningNumber}
            onChange={(e) => setWinningNumber(e.target.value)}
            className="input-clean text-base font-mono font-bold"
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-2.5"
        >
          Verify Winning Ticket Eligibility &rarr;
        </button>
      </form>

      {/* Step 2: Confirmation Safeguard */}
      {inspectedWinner && (
        <div className="reference-card p-6 border-amber-200 bg-amber-50/20 space-y-3">
          {inspectedWinner.notFound ? (
            <div className="flex items-start gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <h4 className="text-xs font-bold">Invalid Winner</h4>
                <p className="text-xs text-rose-700 mt-0.5">{inspectedWinner.message}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold">Verified Ticket Holder Match</h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket #:</span>
                  <span className="font-mono font-bold text-slate-900">#{inspectedWinner.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{inspectedWinner.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono font-bold text-slate-900">{inspectedWinner.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Event:</span>
                  <span className="font-medium text-slate-900">{inspectedWinner.eventTitle}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmWinner}
                className="btn-primary w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-glow-emerald"
              >
                Confirm & Post Winner to Telegram &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmed Banner */}
      {confirmedWinner && (
        <div className="reference-card p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-glow-emerald">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-emerald-950">Official Winner Recorded!</h3>
          <p className="text-xs text-emerald-800">
            Ticket #{confirmedWinner.ticketNumber} held by <strong>{confirmedWinner.customerName}</strong> ({confirmedWinner.phoneNumber})
          </p>
        </div>
      )}
    </div>
  );
};
