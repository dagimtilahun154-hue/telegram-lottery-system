import { useState, useEffect } from 'react';
import { ShoppingBag, Filter, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface PurchaseRow {
  id: string;
  spot_number: number;
  status: string;
  payment_ref_code: string;
  payment_method: string;
  receipt_image_url: string;
  ocr_confidence: number;
  reserved_at: string;
  verified_at: string;
  users: { phone_number: string; first_name: string } | null;
  lottery_items: { title: string; ticket_price: number } | null;
}

export function Purchases() {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_PAYMENT' | 'CONFIRMED'>('ALL');
  const [itemFilter, setItemFilter] = useState<string>('ALL');
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase.from('lottery_items').select('id, title').order('created_at', { ascending: false });
      setItems(data || []);
    }
    fetchItems();
  }, []);

  useEffect(() => {
    async function fetchPurchases() {
      setLoading(true);
      let query = supabase
        .from('tickets')
        .select('*, users(phone_number, first_name), lottery_items(title, ticket_price)')
        .in('status', filter === 'ALL' ? ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'] : [filter])
        .not('user_id', 'is', null)
        .order('reserved_at', { ascending: false });

      if (itemFilter !== 'ALL') {
        query = query.eq('item_id', itemFilter);
      }

      const { data } = await query;
      setPurchases(data || []);
      setLoading(false);
    }
    fetchPurchases();
  }, [filter, itemFilter]);

  return (
    <div>
      <div className="page-header">
        <h1>Purchase History</h1>
        <p>Comprehensive register of ticket spot purchases across lottery events.</p>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div className="table-filters">
            {[
              { key: 'ALL', label: 'All Purchases' },
              { key: 'PENDING_PAYMENT', label: 'Pending Review' },
              { key: 'CONFIRMED', label: 'Confirmed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-btn ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key as any)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className="form-select"
            style={{ width: 220 }}
            value={itemFilter}
            onChange={(e) => setItemFilter(e.target.value)}
          >
            <option value="ALL">All Lottery Events</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '20vh' }}><div className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Lottery Event</th>
                <th>User Phone</th>
                <th>Spot #</th>
                <th>Ref Code</th>
                <th>Method</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.lottery_items?.title || '—'}</strong></td>
                  <td>{p.users?.phone_number || '—'}</td>
                  <td><span style={{ fontWeight: 800 }}>#{p.spot_number}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {p.payment_ref_code || '—'}
                  </td>
                  <td>{p.payment_method || '—'}</td>
                  <td>
                    <span className={`badge ${p.status === 'CONFIRMED' ? 'badge-confirmed' : p.status === 'PENDING_PAYMENT' ? 'badge-pending' : 'badge-completed'}`}>
                      {p.status === 'CONFIRMED' ? 'Confirmed' : p.status === 'PENDING_PAYMENT' ? 'Pending' : p.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {p.reserved_at ? new Date(p.reserved_at).toLocaleString('en-GB') : '—'}
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No purchase records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
