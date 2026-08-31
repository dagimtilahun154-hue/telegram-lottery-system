import { useState, useCallback } from 'react';
import { ArrowLeft, Ticket, Calendar, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { SpotCell } from '../components/SpotCell';
import { Cart } from '../components/Cart';
import { useActiveItems, useRound, useTickets } from '../hooks/useSupabase';
import { useTelegram } from '../hooks/useTelegram';
import { supabase } from '../services/supabase';
import { TICKET_STATUS, LOCK_DURATION_MS } from '../utils/constants';
import type { LotteryItem } from '../utils/constants';

export function Grid() {
  const { telegramId, hapticFeedback, showAlert } = useTelegram();
  const { items, loading: itemsLoading } = useActiveItems();
  const [selectedItem, setSelectedItem] = useState<LotteryItem | null>(null);
  const { round } = useRound(selectedItem?.id || null);
  const { tickets, loading: ticketsLoading, refetch } = useTickets(round?.id || null, telegramId);
  const [cart, setCart] = useState<number[]>([]);
  const [reserving, setReserving] = useState(false);

  const handleSelectItem = (item: LotteryItem) => {
    setSelectedItem(item);
    setCart([]);
    hapticFeedback('light');
  };

  const handleSpotClick = useCallback((spotNumber: number) => {
    hapticFeedback('light');
    setCart((prev) => {
      if (prev.includes(spotNumber)) {
        return prev.filter((n) => n !== spotNumber);
      }
      return [...prev, spotNumber];
    });
  }, [hapticFeedback]);

  const handleReserve = async () => {
    if (!round || !telegramId || cart.length === 0) return;

    setReserving(true);
    hapticFeedback('heavy');

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
      const paymentRef = `LOT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data, error } = await supabase
        .from('tickets')
        .update({
          user_id: telegramId,
          status: TICKET_STATUS.PENDING_PAYMENT,
          reserved_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          payment_ref_code: paymentRef,
        })
        .eq('round_id', round.id)
        .eq('status', TICKET_STATUS.AVAILABLE)
        .in('spot_number', cart)
        .select();

      if (error) throw error;

      if (!data || data.length !== cart.length) {
        showAlert('Some selected spots were already reserved. Please select different numbers.');
        if (data && data.length > 0) {
          await supabase
            .from('tickets')
            .update({ user_id: null, status: TICKET_STATUS.AVAILABLE, reserved_at: null, expires_at: null, payment_ref_code: null })
            .eq('round_id', round.id)
            .eq('user_id', telegramId)
            .in('spot_number', data.map((t) => t.spot_number));
        }
      } else {
        const total = cart.length * (selectedItem?.ticket_price || 0);
        showAlert(
          `Reserved ${cart.length} spots successfully!\n\nPayment Ref: ${paymentRef}\nTotal: ${total} ETB\n\nPlease submit your payment receipt in the bot chat.`
        );
      }

      setCart([]);
      refetch();
    } catch (err) {
      console.error('Reservation error:', err);
      showAlert('An error occurred during reservation. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  if (itemsLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading available lotteries...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon-wrap">
            <Ticket size={24} />
          </div>
          <h2>No Active Lotteries</h2>
          <p>There are currently no active lottery events. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="page">
        <div style={{ marginBottom: 16 }}>
          <h2>Active Lottery Events</h2>
          <p>Select a product lottery to view and reserve numbers.</p>
        </div>

        <div className="item-list">
          {items.map((item) => (
            <div
              key={item.id}
              className="item-card"
              onClick={() => handleSelectItem(item)}
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="item-image"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="item-info">
                <div className="item-title">{item.title}</div>
                <div className="item-meta">
                  {item.total_spots} Total Spots · Ends {new Date(item.end_date).toLocaleDateString('en-GB')}
                </div>
              </div>
              <div className="item-price">{Number(item.ticket_price).toLocaleString()} ETB</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const spotsMap = new Map(tickets.map((t) => [t.spot_number, t]));
  const available = tickets.filter((t) => t.status === TICKET_STATUS.AVAILABLE).length;
  const sold = tickets.filter((t) => t.status === TICKET_STATUS.CONFIRMED).length;

  return (
    <div className="page">
      <button
        className="btn btn-outline"
        style={{ padding: '6px 12px', fontSize: '0.82rem', marginBottom: 14 }}
        onClick={() => { setSelectedItem(null); setCart([]); }}
      >
        <ArrowLeft size={16} /> Back to Lotteries
      </button>

      <div style={{ marginBottom: 12 }}>
        <h2>{selectedItem.title}</h2>
        <p>{Number(selectedItem.ticket_price).toLocaleString()} ETB per spot</p>
      </div>

      <div className="grid-header">
        <div className="grid-stats">
          <div className="grid-stat">
            <div className="dot" style={{ background: 'var(--state-available-text)' }} />
            Available ({available})
          </div>
          <div className="grid-stat">
            <div className="dot" style={{ background: 'var(--state-confirmed-text)' }} />
            Sold ({sold})
          </div>
          <div className="grid-stat">
            <div className="dot" style={{ background: 'var(--primary-accent)' }} />
            In Cart ({cart.length})
          </div>
        </div>
      </div>

      {ticketsLoading ? (
        <div className="loading-container" style={{ minHeight: '30vh' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="spot-grid">
          {Array.from({ length: selectedItem.total_spots }, (_, i) => i + 1).map((num) => {
            const ticket = spotsMap.get(num);
            const status = ticket?.status || TICKET_STATUS.AVAILABLE;
            const isMyCart = cart.includes(num);
            const isMyPending = status === TICKET_STATUS.PENDING_PAYMENT && ticket?.user_id === telegramId;

            return (
              <SpotCell
                key={num}
                number={num}
                status={status as any}
                isMyCart={isMyCart}
                isMyPending={isMyPending}
                onClick={() => handleSpotClick(num)}
              />
            );
          })}
        </div>
      )}

      <Cart
        selectedSpots={cart}
        ticketPrice={selectedItem.ticket_price}
        item={selectedItem}
        onReserve={handleReserve}
        onClear={() => setCart([])}
        loading={reserving}
      />
    </div>
  );
}
