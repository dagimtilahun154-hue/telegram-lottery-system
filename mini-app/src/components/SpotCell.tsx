import { SPOT_COLORS, TICKET_STATUS, type TicketStatus } from '../utils/constants';

interface SpotCellProps {
  number: number;
  status: TicketStatus;
  isMyCart: boolean;
  isMyPending: boolean;
  onClick: () => void;
}

export function SpotCell({ number, status, isMyCart, isMyPending, onClick }: SpotCellProps) {
  let className = 'spot-cell';
  let style: React.CSSProperties = {};

  if (isMyCart) {
    className += ' my-cart';
  } else if (isMyPending) {
    className += ' my-pending';
  } else if (status === TICKET_STATUS.AVAILABLE) {
    className += ' available';
  } else if (status === TICKET_STATUS.PENDING_PAYMENT) {
    className += ' pending';
  } else {
    className += ' confirmed';
  }

  const canClick = status === TICKET_STATUS.AVAILABLE || isMyCart;

  return (
    <div
      className={className}
      style={style}
      onClick={canClick ? onClick : undefined}
      role={canClick ? 'button' : undefined}
      aria-label={`Spot ${number} - ${isMyCart ? 'In cart' : status}`}
    >
      {number}
    </div>
  );
}
