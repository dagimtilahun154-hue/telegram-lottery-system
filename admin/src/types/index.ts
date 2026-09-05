export type PaymentProvider = 'CBE' | 'TELEBIRR' | 'DASHEN' | 'ABYSSINIA' | 'CBE_BIRR' | 'MPESA' | 'CASH' | 'OTHER';

export type EventStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'SALES_CLOSED' | 'DRAW_PENDING' | 'WINNER_SELECTED' | 'COMPLETED' | 'ARCHIVED';

export type TicketStatus = 
  | 'AVAILABLE' 
  | 'RESERVED' 
  | 'PAYMENT_SUBMITTED' 
  | 'VERIFYING' 
  | 'MANUAL_REVIEW' 
  | 'ISSUED' 
  | 'WINNER' 
  | 'EXPIRED' 
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentStatus = 
  | 'SUBMITTED' 
  | 'EXTRACTING' 
  | 'VERIFYING' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'MANUAL_REVIEW' 
  | 'ERROR';

export type ParticipantSource = 'BOT' | 'MANUAL' | 'WALK_IN';

export interface LotteryEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  ticket_price: number;
  start_number: number;
  end_number: number;
  total_tickets: number;
  payment_provider: PaymentProvider;
  receiver_account_number: string;
  receiver_name: string;
  sales_start_at: string;
  sales_end_at: string;
  draw_at: string;
  winner_message?: string;
  status: EventStatus;
  created_at: string;
  // Computed stats
  sold_tickets?: number;
  reserved_tickets?: number;
  revenue?: number;
}

export interface Participant {
  id: string;
  user_id?: number | null;
  full_name: string;
  phone_number: string;
  telegram_username?: string | null;
  source: ParticipantSource;
  created_at: string;
}

export interface LotteryTicket {
  id: string;
  event_id: string;
  ticket_number: number;
  status: TicketStatus;
  current_reservation_id?: string | null;
  owner_participant_id?: string | null;
  issued_at?: string | null;
  owner?: Participant;
  reservation?: Reservation;
}

export interface Reservation {
  id: string;
  event_id: string;
  ticket_number: number;
  participant_id: string;
  source: ParticipantSource;
  status: 'ACTIVE' | 'PAYMENT_SUBMITTED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  reserved_at: string;
  expires_at: string;
  payment_submitted_at?: string | null;
  participant?: Participant;
  event?: LotteryEvent;
}

export interface Payment {
  id: string;
  event_id: string;
  ticket_number: number;
  reservation_id: string;
  participant_id: string;
  provider: PaymentProvider;
  transaction_reference?: string | null;
  expected_amount: number;
  detected_amount?: number | null;
  expected_receiver_account: string;
  detected_receiver_account?: string | null;
  expected_receiver_name: string;
  detected_receiver_name?: string | null;
  receipt_url?: string | null;
  status: PaymentStatus;
  rejection_reason?: string | null;
  submitted_at: string;
  verified_at?: string | null;
  participant?: Participant;
  event?: LotteryEvent;
}

export interface Broadcast {
  id: string;
  event_id?: string | null;
  title: string;
  message_text: string;
  image_url?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  target_language: 'ALL' | 'en' | 'am' | 'om';
  total_recipients: number;
  successful_deliveries: number;
  failed_deliveries: number;
  status: 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';
  sent_at?: string | null;
  created_at: string;
}

export interface DashboardOverviewData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalActiveReservations: number;
  totalParticipants: number;
  eventsSummary: Array<{
    eventId: string;
    title: string;
    ticketPrice: number;
    ticketsSold: number;
    totalTickets: number;
    revenue: number;
    pendingTickets: number;
  }>;
}

export interface PurchaseRecord {
  id: string;
  ticketNumber: number;
  customerName: string;
  phoneNumber: string;
  telegramUsername?: string | null;
  telegramUserId?: number | null;
  reservationId?: string | null;
  participantId?: string | null;
  eventId: string;
  eventTitle: string;
  amount: number;
  status: TicketStatus;
  provider: string;
  reference?: string | null;
  receiptUrl?: string | null;
  expectedAccount?: string | null;
  detectedAccount?: string | null;
  expectedName?: string | null;
  detectedName?: string | null;
  rejectionReason?: string | null;
  time?: string;
  source?: ParticipantSource;
  reservedAt?: string;
  expiresAt?: string;
}

