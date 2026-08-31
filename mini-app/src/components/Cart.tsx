import { useState, useEffect } from 'react';
import { ShoppingBag, Clock, Trash2, ArrowRight } from 'lucide-react';
import type { LotteryItem } from '../utils/constants';

interface CartProps {
  selectedSpots: number[];
  ticketPrice: number;
  item: LotteryItem;
  onReserve: () => void;
  onClear: () => void;
  loading: boolean;
}

export function Cart({ selectedSpots, ticketPrice, onReserve, onClear, loading }: CartProps) {
  const isVisible = selectedSpots.length > 0;
  const total = selectedSpots.length * ticketPrice;

  return (
    <div className={`cart ${isVisible ? 'visible' : ''}`}>
      <div className="cart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingBag size={18} color="var(--primary-accent)" />
          <h3>Selected Spots ({selectedSpots.length})</h3>
        </div>
        <button
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}
          onClick={onClear}
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      <div className="cart-spots">
        Spots: {selectedSpots.sort((a, b) => a - b).join(', ')}
      </div>

      <div className="cart-total">
        <span>Total Amount</span>
        <span className="price">{total.toLocaleString()} ETB</span>
      </div>

      <button
        className="btn btn-accent btn-block"
        onClick={onReserve}
        disabled={loading || selectedSpots.length === 0}
      >
        {loading ? 'Reserving Spots...' : `Reserve & Pay (${selectedSpots.length} spots)`}
        {!loading && <ArrowRight size={16} />}
      </button>
    </div>
  );
}

interface ReservationTimerProps {
  expiresAt: string;
}

export function ReservationTimer({ expiresAt }: ReservationTimerProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="cart-timer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Clock size={14} /> {timeLeft}
    </span>
  );
}
