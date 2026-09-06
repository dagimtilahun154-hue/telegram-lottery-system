import { createClient } from '@supabase/supabase-js';
import { LotteryEvent, PurchaseRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bottnxyxyvecvdladcoe.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdHRueHl4eXZlY3ZkbGFkY29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MDE4NiwiZXhwIjoyMTA0MTI2MTg2fQ.SDwCwscGwBRYXZVz7f9iKmnW7i9z-ruWySYJZRhHJaU';

export const isSupabaseConfigured = true;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export const INITIAL_EVENTS: LotteryEvent[] = [];
export const INITIAL_PURCHASES: PurchaseRecord[] = [];

/**
 * Fetch live lottery events from Supabase
 */
export async function fetchLiveEvents(): Promise<LotteryEvent[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('lottery_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] fetchLiveEvents query error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      slug: item.slug || item.title.toLowerCase().replace(/\s+/g, '-'),
      description: item.description || '',
      image_url: item.image_url || '',
      ticket_price: Number(item.ticket_price || 0),
      start_number: item.start_number || 1,
      end_number: item.end_number || item.total_tickets || 100,
      total_tickets: item.total_tickets || 0,
      payment_provider: item.payment_provider || 'CBE',
      receiver_account_number: item.receiver_account_number || '',
      receiver_name: item.receiver_name || '',
      sales_start_at: item.sales_start_at || new Date().toISOString(),
      sales_end_at: item.sales_end_at || new Date().toISOString(),
      draw_at: item.draw_at || new Date().toISOString(),
      status: item.status || 'OPEN',
      created_at: item.created_at || new Date().toISOString(),
      sold_tickets: Number(item.sold_tickets || 0),
      reserved_tickets: Number(item.reserved_tickets || 0),
      revenue: Number(item.revenue || 0)
    }));
  } catch (err: any) {
    console.error('[Supabase] Failed to fetch events:', err.message);
    return [];
  }
}

/**
 * Fetch live purchase & payment records from Supabase (combining payments and active reservations)
 */
export async function fetchLivePurchases(): Promise<PurchaseRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    // 1. Fetch payments
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_rail,
        provider,
        transaction_reference,
        proof_image_url,
        receipt_url,
        detected_account,
        detected_name,
        detected_amount,
        rejection_reason,
        created_at,
        reservation_id,
        event_id,
        ticket_number,
        participant_id,
        reservations (
          id,
          ticket_number,
          source,
          reserved_at,
          expires_at,
          participants (
            id,
            user_id,
            full_name,
            phone_number,
            telegram_username
          ),
          lottery_events (
            id,
            title,
            ticket_price,
            receiver_account_number,
            receiver_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.warn('[Supabase] fetchLivePurchases payments error:', paymentsError.message);
    }

    const seenReservationIds = new Set<string>();
    const seenEventTicketKeys = new Set<string>();

    const paymentRecords: PurchaseRecord[] = (paymentsData || []).map((item: any) => {
      const res = item.reservations || {};
      const part = res.participants || {};
      const evt = res.lottery_events || {};

      if (item.reservation_id) seenReservationIds.add(item.reservation_id);
      if (item.event_id && item.ticket_number) {
        seenEventTicketKeys.add(`${item.event_id}_${item.ticket_number}`);
      }

      return {
        id: item.id,
        ticketNumber: item.ticket_number || res.ticket_number || 0,
        customerName: part.full_name || 'Anonymous',
        phoneNumber: part.phone_number || '',
        telegramUsername: part.telegram_username || undefined,
        telegramUserId: part.user_id || undefined,
        reservationId: item.reservation_id || res.id || undefined,
        participantId: item.participant_id || part.id || undefined,
        eventId: item.event_id || evt.id || '',
        eventTitle: evt.title || 'Lottery Event',
        amount: Number(item.amount || evt.ticket_price || 0),
        status: (item.status === 'VERIFIED' ? 'ISSUED' : item.status) as any,
        provider: (item.payment_rail || item.provider || 'CBE').toUpperCase(),
        reference: item.transaction_reference || undefined,
        receiptUrl: item.proof_image_url || item.receipt_url || undefined,
        expectedAccount: evt.receiver_account_number || '',
        detectedAccount: item.detected_account || undefined,
        expectedName: evt.receiver_name || '',
        detectedName: item.detected_name || undefined,
        rejectionReason: item.rejection_reason || null,
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        source: (res.source || 'BOT') as any,
        reservedAt: res.reserved_at || item.created_at,
        expiresAt: res.expires_at || item.created_at
      };
    });

    // 2. Fetch active reservations that don't have a payment record yet (15-min live hold)
    const { data: activeReservations, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        ticket_number,
        event_id,
        participant_id,
        source,
        status,
        reserved_at,
        expires_at,
        participants (
          id,
          user_id,
          full_name,
          phone_number,
          telegram_username
        ),
        lottery_events (
          id,
          title,
          ticket_price,
          payment_provider,
          receiver_account_number,
          receiver_name
        )
      `)
      .in('status', ['ACTIVE', 'PAYMENT_SUBMITTED'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (resError) {
      console.warn('[Supabase] fetchLivePurchases active reservations error:', resError.message);
    }

    const reservationRecords: PurchaseRecord[] = [];
    if (activeReservations && activeReservations.length > 0) {
      for (const res of activeReservations) {
        const key = `${res.event_id}_${res.ticket_number}`;
        if (!seenReservationIds.has(res.id) && !seenEventTicketKeys.has(key)) {
          const part = (res as any).participants || {};
          const evt = (res as any).lottery_events || {};

          reservationRecords.push({
            id: res.id,
            ticketNumber: res.ticket_number,
            customerName: part.full_name || 'Reserved Buyer',
            phoneNumber: part.phone_number || '',
            telegramUsername: part.telegram_username || undefined,
            telegramUserId: part.user_id || undefined,
            reservationId: res.id,
            participantId: res.participant_id || part.id || undefined,
            eventId: res.event_id,
            eventTitle: evt.title || 'Lottery Event',
            amount: Number(evt.ticket_price || 0),
            status: (res.status === 'PAYMENT_SUBMITTED' ? 'PAYMENT_SUBMITTED' : 'RESERVED') as any,
            provider: (evt.payment_provider || 'TELEBIRR').toUpperCase(),
            expectedAccount: evt.receiver_account_number || '',
            expectedName: evt.receiver_name || '',
            rejectionReason: null,
            time: res.reserved_at ? new Date(res.reserved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            source: (res.source || 'BOT') as any,
            reservedAt: res.reserved_at,
            expiresAt: res.expires_at
          });
        }
      }
    }

    return [...reservationRecords, ...paymentRecords];
  } catch (err: any) {
    console.error('[Supabase] Failed to fetch purchases:', err.message);
    return [];
  }
}
