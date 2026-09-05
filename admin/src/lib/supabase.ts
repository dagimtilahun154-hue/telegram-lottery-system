import { createClient } from '@supabase/supabase-js';
import { LotteryEvent, PurchaseRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Zero Mock Data / Zero Fallbacks
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
 * Fetch live purchase & payment records from Supabase
 */
export async function fetchLivePurchases(): Promise<PurchaseRecord[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_rail,
        transaction_reference,
        proof_image_url,
        detected_account,
        detected_name,
        detected_amount,
        rejection_reason,
        created_at,
        reservations (
          id,
          ticket_number,
          source,
          reserved_at,
          expires_at,
          participants (
            full_name,
            phone_number,
            telegram_username
          ),
          lottery_events (
            id,
            title,
            receiver_account_number,
            receiver_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] fetchLivePurchases query error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const res = item.reservations || {};
      const part = res.participants || {};
      const evt = res.lottery_events || {};

      return {
        id: item.id,
        ticketNumber: res.ticket_number || 0,
        customerName: part.full_name || 'Anonymous',
        phoneNumber: part.phone_number || '',
        telegramUsername: part.telegram_username || undefined,
        eventId: evt.id || '',
        eventTitle: evt.title || 'Lottery Event',
        amount: Number(item.amount || 0),
        status: (item.status === 'VERIFIED' ? 'ISSUED' : item.status) as any,
        provider: (item.payment_rail || 'CBE').toUpperCase(),
        reference: item.transaction_reference || undefined,
        receiptUrl: item.proof_image_url || undefined,
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
  } catch (err: any) {
    console.error('[Supabase] Failed to fetch purchases:', err.message);
    return [];
  }
}
