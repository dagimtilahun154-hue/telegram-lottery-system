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
      // 1. Pre-check: If phone_number is already used by an old telegram_id record, clean it up to prevent PostgreSQL unique constraint violations
      const { data: phoneConflict } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('phone_number', user.phoneNumber)
        .neq('telegram_id', user.telegramId)
        .maybeSingle();

      if (phoneConflict) {
        console.log(`[DatabaseService] Re-assigning phone ${user.phoneNumber} from old telegram_id ${phoneConflict.telegram_id} to ${user.telegramId}`);
        await supabase.from('users').delete().eq('telegram_id', phoneConflict.telegram_id);
      }

      // 2. Upsert user
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

      // 3. Ensure participant record exists (check by user_id or phone_number)
      const { data: existingP } = await supabase
        .from('participants')
        .select('id')
        .or(`user_id.eq.${user.telegramId},phone_number.eq.${user.phoneNumber}`)
        .maybeSingle();

      if (existingP?.id) {
        await supabase
          .from('participants')
          .update({
            user_id: user.telegramId,
            full_name: user.fullName,
            phone_number: user.phoneNumber,
            telegram_username: user.username || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingP.id);
      } else {
        await supabase
          .from('participants')
          .insert({
            user_id: user.telegramId,
            full_name: user.fullName,
            phone_number: user.phoneNumber,
            telegram_username: user.username || null,
            source: 'BOT'
          });
      }

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
   * Fetch participant ID by Telegram user ID (with automatic fallback to users table)
   */
  async getParticipantId(telegramId: number): Promise<string | null> {
    // 1. Direct match on participants
    const { data: part } = await supabase
      .from('participants')
      .select('id')
      .eq('user_id', telegramId)
      .maybeSingle();

    if (part?.id) return part.id;

    // 2. Auto-heal: If user has registered phone in users table, create participant entry immediately
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (user && user.phone_number) {
      const { data: partByPhone } = await supabase
        .from('participants')
        .select('id')
        .eq('phone_number', user.phone_number)
        .maybeSingle();

      if (partByPhone?.id) {
        await supabase
          .from('participants')
          .update({ user_id: telegramId, full_name: user.full_name })
          .eq('id', partByPhone.id);
        return partByPhone.id;
      }

      const { data: newPart } = await supabase
        .from('participants')
        .insert({
          user_id: user.telegram_id,
          full_name: user.full_name || 'Participant',
          phone_number: user.phone_number,
          telegram_username: user.telegram_username || null,
          source: 'BOT'
        })
        .select('id')
        .single();

      if (newPart?.id) return newPart.id;
    }

    return null;
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
      .select('id, ticket_number, event_id')
      .eq('participant_id', participantId)
      .eq('event_id', eventId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (res) {
      await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('id', res.id);
      await supabase.from('lottery_tickets').update({
        status: 'AVAILABLE',
        current_reservation_id: null,
        reserved_by_participant_id: null
      }).match({
        event_id: res.event_id,
        ticket_number: res.ticket_number
      });
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
   * Get customer's tickets (issued, winner, and pending) with robust participant resolution
   */
  /**
   * Get customer's tickets (issued, winner, and pending) with robust participant resolution
   */
  async getUserTickets(telegramIdOrParticipantId: number | string, username?: string) {
    try {
      let participantIds: string[] = [];
      let telegramId: number | null = null;

      if (typeof telegramIdOrParticipantId === 'number') {
        telegramId = telegramIdOrParticipantId;
      } else if (typeof telegramIdOrParticipantId === 'string' && !isNaN(Number(telegramIdOrParticipantId)) && Number(telegramIdOrParticipantId) > 10000) {
        telegramId = Number(telegramIdOrParticipantId);
      }

      // 1. Get user details from users table if we have a telegram ID
      let userPhones: string[] = [];
      let dbUsername: string | null = username || null;

      if (telegramId) {
        const { data: user } = await supabase
          .from('users')
          .select('phone_number, telegram_username')
          .eq('telegram_id', telegramId)
          .maybeSingle();

        if (user?.phone_number) {
          const rawPhone = user.phone_number.trim();
          userPhones.push(rawPhone);
          // Generate common Ethiopian phone variations (+2519..., 09..., 2519..., 9...)
          const digits = rawPhone.replace(/\D/g, '');
          if (digits.startsWith('251') && digits.length === 12) {
            userPhones.push('0' + digits.substring(3));
            userPhones.push('+' + digits);
            userPhones.push(digits);
            userPhones.push(digits.substring(3));
          } else if (digits.startsWith('09') && digits.length === 10) {
            userPhones.push('+251' + digits.substring(1));
            userPhones.push('251' + digits.substring(1));
            userPhones.push(digits);
            userPhones.push(digits.substring(1));
          }
        }
        if (user?.telegram_username && !dbUsername) {
          dbUsername = user.telegram_username;
        }
      }

      // 2. Fetch all matching participant IDs
      const orClauses: string[] = [];
      if (telegramId) {
        orClauses.push(`user_id.eq.${telegramId}`);
      }
      userPhones.forEach(ph => {
        if (ph) orClauses.push(`phone_number.eq.${ph}`);
      });
      if (dbUsername) {
        const cleanUser = dbUsername.replace('@', '');
        orClauses.push(`telegram_username.ilike.${cleanUser}`);
      }
      if (typeof telegramIdOrParticipantId === 'string' && telegramIdOrParticipantId.length > 20) {
        orClauses.push(`id.eq.${telegramIdOrParticipantId}`);
      }

      if (orClauses.length > 0) {
        const { data: parts } = await supabase
          .from('participants')
          .select('id')
          .or(orClauses.join(','));

        participantIds = (parts || []).map((p: any) => p.id);
      }

      if (typeof telegramIdOrParticipantId === 'string' && telegramIdOrParticipantId.length > 20) {
        if (!participantIds.includes(telegramIdOrParticipantId)) {
          participantIds.push(telegramIdOrParticipantId);
        }
      }

      if (participantIds.length === 0) return [];

      const seenKeys = new Set<string>();
      const results: any[] = [];

      // 3. Query lottery_tickets where owner is in participantIds
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('lottery_tickets')
        .select(`
          id,
          ticket_number,
          status,
          issued_at,
          created_at,
          lottery_events (
            id,
            title,
            ticket_price,
            draw_at
          )
        `)
        .in('owner_participant_id', participantIds)
        .in('status', ['ISSUED', 'WINNER'])
        .order('issued_at', { ascending: false });

      if (ticketsErr) {
        console.warn('[DatabaseService] getUserTickets lottery_tickets query warning:', ticketsErr.message);
      }

      (ticketsData || []).forEach((t: any) => {
        const key = `${t.lottery_events?.id}_${t.ticket_number}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          results.push({
            ticket_number: t.ticket_number,
            status: t.status,
            issued_at: t.issued_at || t.created_at,
            lottery_events: t.lottery_events
          });
        }
      });

      // 4. Also check payments table where status = 'VERIFIED'
      const { data: verifiedPayments } = await supabase
        .from('payments')
        .select(`
          ticket_number,
          status,
          created_at,
          verified_at,
          event_id,
          lottery_events (
            id,
            title,
            ticket_price,
            draw_at
          )
        `)
        .in('participant_id', participantIds)
        .eq('status', 'VERIFIED')
        .order('created_at', { ascending: false });

      (verifiedPayments || []).forEach((p: any) => {
        const key = `${p.event_id}_${p.ticket_number}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          results.push({
            ticket_number: p.ticket_number,
            status: 'ISSUED',
            issued_at: p.verified_at || p.created_at,
            lottery_events: p.lottery_events
          });
        }
      });

      // 5. Check completed reservations as well
      const { data: completedReservations } = await supabase
        .from('reservations')
        .select(`
          ticket_number,
          status,
          created_at,
          completed_at,
          event_id,
          lottery_events (
            id,
            title,
            ticket_price,
            draw_at
          )
        `)
        .in('participant_id', participantIds)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      (completedReservations || []).forEach((r: any) => {
        const key = `${r.event_id}_${r.ticket_number}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          results.push({
            ticket_number: r.ticket_number,
            status: 'ISSUED',
            issued_at: r.completed_at || r.created_at,
            lottery_events: r.lottery_events
          });
        }
      });

      return results;
    } catch (err) {
      console.error('[DatabaseService] getUserTickets error:', err);
      return [];
    }
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
