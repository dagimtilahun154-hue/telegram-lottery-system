import { useState, useEffect } from 'react';
import { Calendar, Clock, Trophy, CheckCircle2 } from 'lucide-react';
import { useActiveItems, useRound } from '../hooks/useSupabase';
import { supabase } from '../services/supabase';
import { TICKET_STATUS } from '../utils/constants';
import type { LotteryItem } from '../utils/constants';

function Countdown({ targetDate }: { targetDate: string }) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="countdown">
      {[
        { value: time.days, label: 'Days' },
        { value: time.hours, label: 'Hours' },
        { value: time.minutes, label: 'Mins' },
        { value: time.seconds, label: 'Secs' },
      ].map(({ value, label }) => (
        <div key={label} className="countdown-unit">
          <div className="countdown-value">{String(value).padStart(2, '0')}</div>
          <div className="countdown-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

function DrawCard({ item }: { item: LotteryItem }) {
  const { round } = useRound(item.id);
  const [soldCount, setSoldCount] = useState(0);

  useEffect(() => {
    if (!round) return;

    async function fetchSold() {
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', round!.id)
        .eq('status', TICKET_STATUS.CONFIRMED);
      setSoldCount(count || 0);
    }

    fetchSold();
  }, [round]);

  const drawDate = round?.draw_date || item.end_date;
  const progress = item.total_spots > 0 ? (soldCount / item.total_spots) * 100 : 0;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <h3>{item.title}</h3>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-accent)' }}>
          {Number(item.ticket_price).toLocaleString()} ETB
        </span>
      </div>

      {item.description && (
        <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>
          {item.description}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>Progress</span>
        <span style={{ fontWeight: 600 }}>{soldCount} / {item.total_spots} spots sold</span>
      </div>

      <div style={{
        height: 6,
        background: 'var(--bg-subtle)',
        borderRadius: 3,
        marginBottom: 16,
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(progress, 100)}%`,
          background: 'var(--primary-accent)',
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Clock size={13} /> Time Remaining Until Draw
      </p>
      <Countdown targetDate={drawDate} />
    </div>
  );
}

export function Draws() {
  const { items, loading } = useActiveItems();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading draw schedule...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <h2>Active Draws</h2>
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="icon-wrap">
            <Calendar size={24} />
          </div>
          <h3>No Scheduled Draws</h3>
          <p>There are no active draw countdowns currently running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h2>Active Draws</h2>
        <p>Real-time countdown schedule for active product draws.</p>
      </div>

      <div>
        {items.map((item) => (
          <DrawCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
