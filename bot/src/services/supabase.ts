import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';

export const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY
);

export class DatabaseService {
  /**
   * Register or update a Telegram user
   */
  async upsertUser(user: {
    telegramId: number;
    username?: string;
    fullName: string;
    phoneNumber: string;
    language: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          telegram_id: user.telegramId,
          telegram_username: user.username || null,
          full_name: user.fullName,
          phone_number: user.phoneNumber,
          language: user.language,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Also ensure participant record exists
      await supabase
        .from('participants')
        .upsert({
          user_id: user.telegramId,
          full_name: user.fullName,
          phone_number: user.phoneNumber,
          telegram_username: user.username || null,
          source: 'BOT'
        }, { onConflict: 'phone_number' });

      return data;
    } catch (err) {
      console.error('[DatabaseService] Upsert User Error:', err);
      return null;
    }
  }

  /**
   * Fetch user profile
   */
  async getUser(telegramId: number) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    return data;
  }

  /**
   * Set user preferred language
   */
  async setUserLanguage(telegramId: number, language: string) {
    try {
      await supabase
        .from('users')
        .upsert({
          telegram_id: telegramId,
          language,
          updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });
    } catch (err) {
      console.error('[DatabaseService] Set User Language Error:', err);
    }
  }

  /**
   * Fetch participant ID by Telegram user ID
   */
  async getParticipantId(telegramId: number): Promise<string | null> {
    const { data } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', telegramId)
      .maybeSingle();

    return data?.id || null;
  }

  /**
   * Fetch active OPEN lottery events
   */
  async getActiveEvents() {
    const { data, error } = await supabase
      .from('lottery_events')
      .select('*')
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DatabaseService] Get Active Events Error:', error);
      return [];
    }
    return data || [];
  }

  /**
   * Fetch specific lottery event by ID
   */
  async getEventById(eventId: string) {
    const { data } = await supabase
      .from('lottery_events')
      .select('*')
      .eq('id', eventId)
      .single();

    return data;
  }

  /**
   * Atomic ticket reservation (enforcing sequential one-by-one cutting)
   */
  async reserveTicket(eventId: string, ticketNumber: number, participantId: string) {
    const { data, error } = await supabase.rpc('reserve_ticket_atomic', {
      p_event_id: eventId,
      p_ticket_number: ticketNumber,
      p_participant_id: participantId,
      p_source: 'BOT',
      p_duration_minutes: 15
    });

    if (error) {
      console.error('[DatabaseService] RPC reserve_ticket_atomic Error:', error);
      return { success: false, error: 'RPC_ERROR', message: error.message };
    }

    return data;
  }

  /**
   * Cancel pending reservation and return ticket to AVAILABLE pool
   */
  async cancelPendingReservation(participantId: string, eventId: string) {
    const { data: res } = await supabase
      .from('reservations')
      .select('id, ticket_id')
      .eq('participant_id', participantId)
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (res) {
      await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('id', res.id);
      await supabase.from('lottery_tickets').update({ status: 'AVAILABLE' }).eq('id', res.ticket_id);
      return true;
    }
    return false;
  }


  /**
   * Get available ticket numbers in a range for an event
   */
  async getAvailableNumbersInRange(eventId: string, startNum: number, endNum: number, limit: number = 30) {
    const { data, error } = await supabase
      .from('lottery_tickets')
      .select('ticket_number')
      .eq('event_id', eventId)
      .eq('status', 'AVAILABLE')
      .gte('ticket_number', startNum)
      .lte('ticket_number', endNum)
      .order('ticket_number', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[DatabaseService] Available Numbers Query Error:', error);
      return [];
    }

    return (data || []).map((row: any) => row.ticket_number as number);
  }

  /**
   * Submit payment receipt
   */
  async submitPaymentReceipt(reservationId: string, receiptUrl: string, provider: string, ref?: string) {
    const { data, error } = await supabase.rpc('submit_payment_receipt_atomic', {
      p_reservation_id: reservationId,
      p_receipt_url: receiptUrl,
      p_provider: provider,
      p_extracted_ref: ref || null
    });

    if (error) throw error;
    return data;
  }

  /**
   * Verify and issue ticket atomically (with Veritas results)
   */
  async verifyAndIssueTicket(
    paymentId: string,
    veritasRaw: any,
    provider: string,
    ref: string,
    amount: number,
    account?: string,
    name?: string
  ) {
    const { data, error } = await supabase.rpc('verify_and_issue_ticket_atomic', {
      p_payment_id: paymentId,
      p_veritas_raw: veritasRaw || {},
      p_detected_provider: provider,
      p_detected_ref: ref,
      p_detected_amount: amount,
      p_detected_account: account || null,
      p_detected_name: name || null
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get customer's issued tickets
   */
  async getUserTickets(participantId: string) {
    const { data, error } = await supabase
      .from('lottery_tickets')
      .select(`
        ticket_number,
        status,
        issued_at,
        lottery_events (
          title,
          ticket_price,
          draw_at
        )
      `)
      .eq('owner_participant_id', participantId)
      .eq('status', 'ISSUED')
      .order('issued_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  /**
   * Release expired reservations
   */
  async releaseExpired() {
    try {
      const { data, error } = await supabase.rpc('release_expired_reservations_atomic');
      if (!error && data) return data;
    } catch (_) {}

    // Graceful fallback if RPC function is not yet installed in Supabase
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'AVAILABLE',
          reserved_by_participant_id: null,
          reserved_at: null,
          reservation_expires_at: null
        })
        .eq('status', 'RESERVED')
        .lt('reservation_expires_at', now)
        .select('id');

      return { success: !error, released_count: data?.length || 0 };
    } catch (e) {
      return { success: false, released_count: 0 };
    }
  }
}

export const dbService = new DatabaseService();
