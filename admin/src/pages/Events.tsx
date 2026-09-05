import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  CreditCard, 
  X,
  Calendar,
  Layers
} from 'lucide-react';
import { LotteryEvent, PaymentProvider } from '../types';
import { useI18n } from '../lib/i18n';

interface EventsProps {
  events: LotteryEvent[];
  onAddEvent: (newEvent: LotteryEvent) => void;
  onUpdateEventStatus: (eventId: string, newStatus: any) => void;
  onSelectEvent: (eventId: string) => void;
}

export const Events: React.FC<EventsProps> = ({
  events,
  onAddEvent,
  onUpdateEventStatus,
  onSelectEvent
}) => {
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [ticketPrice, setTicketPrice] = useState('500');
  const [totalTickets, setTotalTickets] = useState('5000');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('TELEBIRR');
  const [receiverAccount, setReceiverAccount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [salesDays, setSalesDays] = useState('20');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !ticketPrice || !receiverAccount || !receiverName) return;

    const newEvt: LotteryEvent = {
      id: `evt-${Date.now()}`,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || `Win a ${title}! Total tickets: ${totalTickets}. Verified via ${paymentProvider}.`,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
      ticket_price: Number(ticketPrice),
      start_number: 1,
      end_number: Number(totalTickets),
      total_tickets: Number(totalTickets),
      payment_provider: paymentProvider,
      receiver_account_number: receiverAccount,
      receiver_name: receiverName,
      sales_start_at: new Date().toISOString(),
      sales_end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * Number(salesDays)).toISOString(),
      draw_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * (Number(salesDays) + 1)).toISOString(),
      status: 'OPEN',
      created_at: new Date().toISOString(),
      sold_tickets: 0,
      reserved_tickets: 0,
      revenue: 0
    };

    onAddEvent(newEvt);
    setShowCreateModal(false);
    setTitle('');
    setReceiverAccount('');
    setReceiverName('');
    setImageUrl('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.events}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 font-medium">
              {events.length} {t.activeLotteries}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> {t.createEvent}
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full reference-card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
              🎟️
            </div>
            <h3 className="text-base font-black text-slate-900">No Lottery Events Created</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by launching your first lottery event. Define ticket prices, quantities, and payment details.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-1.5 py-2 px-4 text-xs mt-2"
            >
              <Plus className="w-4 h-4" /> {t.createEvent}
            </button>
          </div>
        ) : (
          events.map((evt) => {
          const sold = evt.sold_tickets || 0;
          const revenue = evt.revenue || sold * evt.ticket_price;
          const percentage = ((sold / evt.total_tickets) * 100).toFixed(1);

          return (
            <div
              key={evt.id}
              className="reference-card overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Event Image Banner */}
                <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                  <img
                    src={evt.image_url}
                    alt={evt.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200/80 shadow-sm">
                      {evt.status}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <div className="px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-white font-bold text-xs shadow-sm">
                      {evt.ticket_price} ETB
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-5 space-y-3.5">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">{evt.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{evt.description}</p>
                  </div>

                  {/* Payment rail */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1.5 text-xs text-slate-600">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Account Target
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Provider:</span>
                      <span className="font-bold text-slate-800">{evt.payment_provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account:</span>
                      <span className="font-mono font-bold text-slate-900">{evt.receiver_account_number}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Sold: <strong className="text-slate-900">{sold.toLocaleString()}</strong></span>
                      <span className="text-blue-700 font-bold">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Revenue</div>
                  <div className="text-sm font-black text-slate-900">{revenue.toLocaleString()} ETB</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectEvent(evt.id)}
                    className="btn-secondary py-1.5 px-3 text-[11px]"
                  >
                    {t.grid}
                  </button>

                  {evt.status === 'OPEN' ? (
                    <button
                      onClick={() => onUpdateEventStatus(evt.id, 'SALES_CLOSED')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateEventStatus(evt.id, 'OPEN')}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Modal: Create New Lottery Event */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-premium space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">{t.createEvent}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PlayStation 5 Pro Edition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-clean"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Ticket Price (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    className="input-clean"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Total Capacity *
                  </label>
                  <input
                    type="number"
                    required
                    value={totalTickets}
                    onChange={(e) => setTotalTickets(e.target.value)}
                    className="input-clean"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Provider
                  </label>
                  <select
                    value={paymentProvider}
                    onChange={(e) => setPaymentProvider(e.target.value as PaymentProvider)}
                    className="input-clean"
                  >
                    <option value="TELEBIRR">Telebirr</option>
                    <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                    <option value="CBE_BIRR">CBE Birr</option>
                    <option value="DASHEN">Dashen Bank</option>
                    <option value="ABYSSINIA">Bank of Abyssinia</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    value={salesDays}
                    onChange={(e) => setSalesDays(e.target.value)}
                    className="input-clean"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Receiver Account # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1000123456789"
                    value={receiverAccount}
                    onChange={(e) => setReceiverAccount(e.target.value)}
                    className="input-clean font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Receiver Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dagim Tilahun"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="input-clean"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input-clean"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary py-2"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn-primary py-2 px-5"
                >
                  {t.createEvent}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
