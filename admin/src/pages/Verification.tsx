import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, FileText, User, CreditCard, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/supabase';

interface PendingTicket {
  id: string;
  spot_number: number;
  payment_ref_code: string;
  payment_method: string;
  receipt_image_url: string;
  ocr_confidence: number;
  ocr_raw_text: string;
  reserved_at: string;
  expires_at: string;
  user_id: number;
  item_id: string;
  users: { phone_number: string; first_name: string; last_name: string } | null;
  lottery_items: { title: string; ticket_price: number } | null;
}

export function Verification() {
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchPending = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*, users(phone_number, first_name, last_name), lottery_items(title, ticket_price)')
      .eq('status', 'PENDING_PAYMENT')
      .not('receipt_image_url', 'is', null)
      .order('reserved_at', { ascending: true });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (ticket: PendingTicket) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'CONFIRMED',
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', ticket.user_id)
      .eq('payment_ref_code', ticket.payment_ref_code)
      .eq('status', 'PENDING_PAYMENT');

    if (error) {
      alert('Error approving payment: ' + error.message);
      return;
    }

    fetchPending();
  };

  const handleReject = async () => {
    if (!selectedId) return;
    const ticket = tickets.find((t) => t.id === selectedId);
    if (!ticket) return;

    await supabase
      .from('tickets')
      .update({
        status: 'AVAILABLE',
        user_id: null,
        reserved_at: null,
        expires_at: null,
        payment_ref_code: null,
        receipt_image_url: null,
        ocr_confidence: null,
        ocr_raw_text: null,
        payment_method: null,
        rejection_reason: rejectReason,
      })
      .eq('user_id', ticket.user_id)
      .eq('payment_ref_code', ticket.payment_ref_code)
      .eq('status', 'PENDING_PAYMENT');

    setShowRejectModal(false);
    setRejectReason('');
    setSelectedId(null);
    fetchPending();
  };

  const grouped = tickets.reduce((acc: Record<string, PendingTicket[]>, t) => {
    const key = t.payment_ref_code || t.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Payment Verification Queue</h1>
        <p>{Object.keys(grouped).length} pending payment submissions to review.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div className="icon-wrap">
            <CheckCircle2 size={24} color="var(--color-success)" />
          </div>
          <h3>Queue Empty</h3>
          <p>There are no pending receipts requiring manual verification at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(grouped).map(([refCode, groupTickets]) => {
            const first = groupTickets[0];
            return (
              <div key={refCode} className="table-container" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{first.lottery_items?.title}</h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} /> {first.users?.first_name} {first.users?.last_name} ({first.users?.phone_number})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Ref: {refCode}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Method: {first.payment_method || 'Manual Upload'} · OCR Match: {first.ocr_confidence ? `${Math.round(first.ocr_confidence * 100)}%` : 'Manual Review'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Spots:</span>
                  {groupTickets.map((t) => (
                    <span key={t.id} className="badge badge-pending" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                      #{t.spot_number}
                    </span>
                  ))}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800, marginLeft: 12, fontSize: '0.95rem' }}>
                    Total: {(groupTickets.length * (first.lottery_items?.ticket_price || 0)).toLocaleString()} ETB
                  </span>
                </div>

                {first.receipt_image_url && (
                  <div style={{ marginBottom: 16 }}>
                    <img
                      src={first.receipt_image_url}
                      alt="Payment receipt screenshot"
                      style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, border: '1px solid var(--border-light)' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-success" onClick={() => handleApprove(first)}>
                    <CheckCircle2 size={16} /> Approve & Confirm
                  </button>
                  <button className="btn btn-danger" onClick={() => { setSelectedId(first.id); setShowRejectModal(true); }}>
                    <XCircle size={16} /> Reject Payment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2>Reject Payment Submission</h2>
              <button type="button" className="btn btn-outline" style={{ padding: 4 }} onClick={() => setShowRejectModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for rejection (will be sent to user)</label>
              <textarea
                className="form-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unreadable receipt screenshot, payment amount mismatch, reference ID not found..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}>Reject Submission</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
