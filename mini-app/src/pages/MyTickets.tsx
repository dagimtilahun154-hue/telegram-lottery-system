import { ClipboardList, Ticket, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useUserTickets } from '../hooks/useSupabase';
import { useTelegram } from '../hooks/useTelegram';
import { TICKET_STATUS } from '../utils/constants';

export function MyTickets() {
  const { telegramId } = useTelegram();
  const { tickets, loading } = useUserTickets(telegramId);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading your tickets...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="page">
        <h2>My Tickets</h2>
        <div className="empty-state" style={{ marginTop: 16 }}>
          <div className="icon-wrap">
            <ClipboardList size={24} />
          </div>
          <h3>No Active Tickets</h3>
          <p>You haven't reserved any spots yet. Navigate to the Tickets tab to pick numbers.</p>
        </div>
      </div>
    );
  }

  const grouped: Record<string, typeof tickets> = {};
  for (const ticket of tickets) {
    const title = (ticket as any).lottery_items?.title || 'Unknown Item';
    if (!grouped[title]) grouped[title] = [];
    grouped[title].push(ticket);
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h2>My Tickets</h2>
        <p>Overview of your ticket reservations and confirmation status.</p>
      </div>

      {Object.entries(grouped).map(([title, itemTickets]) => (
        <div key={title} className="ticket-group">
          <div className="ticket-group-header">
            <Ticket size={16} color="var(--primary-accent)" />
            <span>{title}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              ({itemTickets.length} {itemTickets.length === 1 ? 'ticket' : 'tickets'})
            </span>
          </div>

          {itemTickets.map((ticket) => {
            const isConfirmed = ticket.status === TICKET_STATUS.CONFIRMED;
            const isPending = ticket.status === TICKET_STATUS.PENDING_PAYMENT;

            const statusClass = isConfirmed
              ? 'badge-confirmed'
              : isPending
              ? 'badge-pending'
              : 'badge-cancelled';

            const StatusIcon = isConfirmed ? CheckCircle2 : isPending ? Clock : XCircle;

            const statusLabel = isConfirmed
              ? 'Confirmed'
              : isPending
              ? 'Pending Review'
              : 'Cancelled';

            return (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-spot">#{ticket.spot_number}</div>
                <span className={`badge ${statusClass}`}>
                  <StatusIcon size={12} /> {statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
