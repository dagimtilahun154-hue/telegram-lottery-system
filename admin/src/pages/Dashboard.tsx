import { useState, useEffect } from 'react';
import { Users, Ticket, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Stats {
  totalUsers: number;
  activeItems: number;
  pendingPayments: number;
  confirmedTickets: number;
  totalRevenue: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeItems: 0,
    pendingPayments: 0,
    confirmedTickets: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [users, items, pending, confirmed] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('lottery_items').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_PAYMENT'),
        supabase.from('tickets').select('item_id, lottery_items(ticket_price)').eq('status', 'CONFIRMED'),
      ]);

      const revenue = (confirmed.data || []).reduce((sum: number, t: any) => {
        return sum + (t.lottery_items?.ticket_price || 0);
      }, 0);

      setStats({
        totalUsers: users.count || 0,
        activeItems: items.count || 0,
        pendingPayments: pending.count || 0,
        confirmedTickets: (confirmed.data || []).length,
        totalRevenue: revenue,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time metrics and system operations summary.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Registered Users</span>
            <Users size={18} color="var(--primary-accent)" />
          </div>
          <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Active Lotteries</span>
            <Ticket size={18} color="var(--primary-accent)" />
          </div>
          <div className="stat-value">{stats.activeItems}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Pending Verifications</span>
            <Clock size={18} color="var(--color-warning)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {stats.pendingPayments}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Confirmed Tickets</span>
            <CheckCircle2 size={18} color="var(--color-success)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {stats.confirmedTickets.toLocaleString()}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Total Revenue</span>
            <DollarSign size={18} color="var(--text-primary)" />
          </div>
          <div className="stat-value">
            {stats.totalRevenue.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>ETB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
