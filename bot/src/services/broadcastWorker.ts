import { Telegraf, Markup } from 'telegraf';
import { supabase } from './supabase.js';

interface BroadcastRecord {
  id: string;
  event_id?: string | null;
  title: string;
  message_text: string;
  image_url?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  target_language?: 'ALL' | 'en' | 'am' | 'om';
  target_event_buyers_only?: boolean;
  total_recipients: number;
  successful_deliveries: number;
  failed_deliveries: number;
  status: 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';
}

export class BroadcastWorker {
  private bot: Telegraf | null = null;
  private isRunning: boolean = false;
  private pollIntervalMs: number = 5000;
  private timer: NodeJS.Timeout | null = null;
  private defaultChannel: string = process.env.TELEGRAM_CHANNEL || '';

  init(botInstance: Telegraf) {
    this.bot = botInstance;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('📡 Telegram Broadcast & Channel Dispatch Worker started.');

    // Immediate check + schedule recurring polling
    this.checkPendingBroadcasts();
    this.timer = setInterval(() => {
      this.checkPendingBroadcasts();
    }, this.pollIntervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('🛑 Telegram Broadcast Worker stopped.');
  }

  /**
   * Polls the Supabase broadcasts table for any pending 'SENDING' broadcasts
   */
  private async checkPendingBroadcasts() {
    if (!this.bot || !this.isRunning) return;

    try {
      const { data: pendingBroadcasts, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('status', 'SENDING')
        .order('created_at', { ascending: true })
        .limit(3);

      if (error) {
        // Suppress repeated schema cache warnings if table does not exist yet
        return;
      }

      if (pendingBroadcasts && pendingBroadcasts.length > 0) {
        for (const bc of pendingBroadcasts) {
          await this.processBroadcast(bc);
        }
      }
    } catch (err) {
      console.error('[BroadcastWorker] Error during polling:', err);
    }
  }

  /**
   * Process and dispatch a single broadcast to users, channels, and groups
   */
  async processBroadcast(bc: BroadcastRecord) {
    if (!this.bot) return;

    console.log(`🚀 [BroadcastWorker] Dispatching broadcast ${bc.id}: "${bc.title}"`);

    let successful = 0;
    let failed = 0;

    // Build CTA inline keyboard if button details provided
    const extraKeyboard = bc.button_text && bc.button_url 
      ? Markup.inlineKeyboard([
          Markup.button.url(bc.button_text, bc.button_url)
        ])
      : undefined;

    // Formatted message content (HTML)
    const formattedText = `<b>${this.escapeHtml(bc.title)}</b>\n\n${this.escapeHtml(bc.message_text)}`;

    // 1. DISPATCH TO CONFIGURED CHANNEL(S)
    const targetChannel = this.defaultChannel;
    if (targetChannel) {
      try {
        if (bc.image_url) {
          await this.bot.telegram.sendPhoto(targetChannel, bc.image_url, {
            caption: formattedText,
            parse_mode: 'HTML',
            ...extraKeyboard
          });
        } else {
          await this.bot.telegram.sendMessage(targetChannel, formattedText, {
            parse_mode: 'HTML',
            ...extraKeyboard
          });
        }
        successful++;
        console.log(`📢 [BroadcastWorker] Successfully posted to channel ${targetChannel}`);
      } catch (channelErr: any) {
        console.warn(`⚠️ [BroadcastWorker] Channel post to ${targetChannel} failed:`, channelErr.message);
        failed++;
      }
    }

    // 2. DISPATCH DIRECT MESSAGES TO TELEGRAM USERS
    try {
      let query = supabase.from('users').select('telegram_id, language');

      if (bc.target_language && bc.target_language !== 'ALL') {
        query = query.eq('language', bc.target_language);
      }

      const { data: users, error: userError } = await query;

      if (!userError && users && users.length > 0) {
        const totalUsers = users.length;
        console.log(`👥 [BroadcastWorker] Found ${totalUsers} recipient users.`);

        // Safe batch rate: 25 messages per second
        const BATCH_SIZE = 25;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
          const batch = users.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (user) => {
              try {
                if (bc.image_url) {
                  await this.bot!.telegram.sendPhoto(user.telegram_id, bc.image_url, {
                    caption: formattedText,
                    parse_mode: 'HTML',
                    ...extraKeyboard
                  });
                } else {
                  await this.bot!.telegram.sendMessage(user.telegram_id, formattedText, {
                    parse_mode: 'HTML',
                    ...extraKeyboard
                  });
                }
                successful++;
              } catch (sendErr: any) {
                // User may have blocked the bot or chat deleted
                failed++;
              }
            })
          );

          // 1 second throttle pause between batches
          if (i + BATCH_SIZE < users.length) {
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }
    } catch (usersErr) {
      console.error('[BroadcastWorker] Error fetching users:', usersErr);
    }

    // 3. UPDATE SUPABASE STATUS TO 'SENT'
    try {
      await supabase
        .from('broadcasts')
        .update({
          status: 'SENT',
          total_recipients: successful + failed,
          successful_deliveries: successful,
          failed_deliveries: failed,
          sent_at: new Date().toISOString()
        })
        .eq('id', bc.id);

      console.log(`✅ [BroadcastWorker] Broadcast ${bc.id} completed. (${successful} sent, ${failed} failed)`);
    } catch (updateErr) {
      console.error('[BroadcastWorker] Error updating broadcast record:', updateErr);
    }
  }

  /**
   * Helper: Post newly created lottery announcement directly to channel
   */
  async postEventLaunch(channelId: string, event: {
    title: string;
    ticketPrice: number;
    totalTickets: number;
    imageUrl?: string;
    botUsername: string;
    eventId: string;
  }) {
    if (!this.bot) return;

    const caption = 
      `🎉 <b>NEW LOTTERY EVENT LAUNCHED!</b>\n\n` +
      `🎟️ <b>${this.escapeHtml(event.title)}</b>\n` +
      `💰 Ticket Price: <b>${event.ticketPrice} ETB</b>\n` +
      `📊 Total Tickets: <b>${event.totalTickets} numbers</b>\n\n` +
      `⚡ Reserve your lucky number now before tickets sell out!`;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.url('🎯 Cut Ticket Now', `https://t.me/${event.botUsername}?start=event_${event.eventId}`)
    ]);

    try {
      if (event.imageUrl) {
        await this.bot.telegram.sendPhoto(channelId, event.imageUrl, {
          caption,
          parse_mode: 'HTML',
          ...keyboard
        });
      } else {
        await this.bot.telegram.sendMessage(channelId, caption, {
          parse_mode: 'HTML',
          ...keyboard
        });
      }
      return true;
    } catch (err: any) {
      console.error(`[BroadcastWorker] Channel event post failed:`, err.message);
      return false;
    }
  }

  /**
   * Helper: Post official winner declaration to channel
   */
  async postWinnerAnnouncement(channelId: string, data: {
    eventTitle: string;
    winningTicket: number;
    winnerName: string;
    winnerPhoneMasked: string;
    prize: string;
    botUsername: string;
  }) {
    if (!this.bot) return;

    const message = 
      `🏆 <b>OFFICIAL WINNER DECLARATION!</b> 🎊\n\n` +
      `🎉 Event: <b>${this.escapeHtml(data.eventTitle)}</b>\n` +
      `🎯 Winning Ticket Number: <b>#${data.winningTicket}</b>\n` +
      `👤 Winner: <b>${this.escapeHtml(data.winnerName)}</b> (${data.winnerPhoneMasked})\n\n` +
      `✨ Congratulations to the lucky winner! Stay tuned for the next grand lottery!`;

    const keyboard = Markup.inlineKeyboard([
      Markup.button.url('🏆 View Active Lotteries', `https://t.me/${data.botUsername}`)
    ]);

    try {
      await this.bot.telegram.sendMessage(channelId, message, {
        parse_mode: 'HTML',
        ...keyboard
      });
      return true;
    } catch (err: any) {
      console.error(`[BroadcastWorker] Winner announcement failed:`, err.message);
      return false;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

export const broadcastWorker = new BroadcastWorker();
