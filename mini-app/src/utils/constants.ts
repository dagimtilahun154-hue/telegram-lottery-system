export const TICKET_STATUS = {
  AVAILABLE: 'AVAILABLE',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

export const ITEM_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
} as const;

export const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const SPOT_COLORS = {
  AVAILABLE: '#22c55e',      // Green
  PENDING_PAYMENT: '#f59e0b', // Amber
  CONFIRMED: '#ef4444',       // Red
  CANCELLED: '#6b7280',       // Grey
  MY_CART: '#3b82f6',          // Blue
  MY_PENDING: '#a855f7',       // Purple (my pending tickets)
} as const;

export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS];

export interface LotteryItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  ticket_price: number;
  total_spots: number;
  start_date: string;
  end_date: string;
  status: string;
}

export interface LotteryRound {
  id: string;
  item_id: string;
  round_number: number;
  status: string;
  draw_date: string;
  tiktok_stream_url: string;
}

export interface Ticket {
  id: string;
  round_id: string;
  item_id: string;
  spot_number: number;
  user_id: number;
  status: TicketStatus;
  reserved_at: string;
  expires_at: string;
  payment_ref_code: string;
  lottery_items?: LotteryItem;
}

export interface UserProfile {
  telegram_id: number;
  first_name: string;
  last_name: string;
  username: string;
  phone_number: string;
  language_code: string;
  is_admin: boolean;
}
