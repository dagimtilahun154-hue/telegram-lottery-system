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
  private pollIntervalMs: number = 4000;
  private timer: NodeJS.Timeout | null = null;
  private defaultChannel: string = process.env.TELEGRAM_CHANNEL || '@RichoLottery';

  init(botInstance: Telegraf) {
    this.bot = botInstance;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('📡 Telegram Broadcast & Channel Dispatch Worker active.');

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
        .limit(5);

      if (error) return;

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
          [Markup.button.url(bc.button_text, bc.button_url)]
        ])
      : undefined;

    // Extract destination, target user, and target channel tags if present
    const targetUserMatch = bc.message_text.match(/<!--target_user:(\d+)-->/);
    const destMatch = bc.message_text.match(/<!--destination:(.+?)-->/);
    const channelMatch = bc.message_text.match(/<!--target_channel:(.+?)-->/);
    const destination = destMatch ? destMatch[1].trim() : 'ALL';
    const targetChannel = channelMatch ? channelMatch[1].trim() : this.defaultChannel;
    const targetUserId = targetUserMatch ? parseInt(targetUserMatch[1], 10) : null;

    const cleanText = bc.message_text
      .replace(/<!--target_user:(\d+)-->/g, '')
      .replace(/<!--destination:(.+?)-->/g, '')
      .replace(/<!--target_channel:(.+?)-->/g, '')
      .trim();

    // Formatted message content in clean HTML
    const formattedHtml = this.formatMessageHtml(bc.title, cleanText);

    // 0. DIRECT SINGLE USER TRANSACTIONAL NOTIFICATION (e.g. ticket approval / winner DM)
    if (targetUserId) {
      try {
        if (bc.image_url && bc.image_url.startsWith('http')) {
          await this.bot.telegram.sendPhoto(targetUserId, bc.image_url, {
            caption: formattedHtml,
            parse_mode: 'HTML',
            ...extraKeyboard
          });
        } else {
          await this.bot.telegram.sendMessage(targetUserId, formattedHtml, {
            parse_mode: 'HTML',
            ...extraKeyboard
          });
        }
        successful++;
        console.log(`👤 [BroadcastWorker] Directly notified user ${targetUserId} for: "${bc.title}"`);
      } catch (dmErr: any) {
        console.warn(`⚠️ [BroadcastWorker] Direct message to user ${targetUserId} failed:`, dmErr.message);
        failed++;
      }

      await supabase
        .from('broadcasts')
        .update({
          status: 'SENT',
          total_recipients: 1,
          successful_deliveries: successful,
          failed_deliveries: failed,
          sent_at: new Date().toISOString()
        })
        .eq('id', bc.id);

      return;
    }

    // 1. DISPATCH TO CONFIGURED CHANNEL(S)
    if (destination !== 'BOT' && destination !== 'USERS' && targetChannel) {
      let normalizedChannel = targetChannel.trim();
      if (!normalizedChannel.startsWith('@') && !normalizedChannel.startsWith('-100') && !normalizedChannel.startsWith('-')) {
        normalizedChannel = '@' + normalizedChannel;
      }

      try {
        if (bc.image_url && bc.image_url.startsWith('http')) {
          await this.bot.telegram.sendPhoto(normalizedChannel, bc.image_url, {
            caption: formattedHtml,
            parse_mode: 'HTML',
            ...extraKeyboard
          });
        } else {
          await this.bot.telegram.sendMessage(normalizedChannel, formattedHtml, {
            parse_mode: 'HTML',
            ...extraKeyboard
          });
        }
        successful++;
        console.log(`📢 [BroadcastWorker] Successfully posted to channel ${normalizedChannel}`);
      } catch (channelErr: any) {
        console.warn(`⚠️ [BroadcastWorker] Channel post to ${normalizedChannel} notice: ${channelErr.message}`);
        failed++;
      }
    }

    // 2. DISPATCH DIRECT NOTIFICATIONS TO ALL REGISTERED BOT USERS
    if (destination !== 'CHANNEL' && destination !== 'GROUP') {
      try {
        let query = supabase.from('users').select('telegram_id, language').eq('is_blocked', false);

        if (bc.target_language && bc.target_language !== 'ALL') {
          query = query.eq('language', bc.target_language);
        }

        const { data: users, error: userError } = await query;

        if (!userError && users && users.length > 0) {
          const totalUsers = users.length;
          console.log(`👥 [BroadcastWorker] Broadcasting to ${totalUsers} recipient users...`);

          // Safe batch rate: 25 messages per second
          const BATCH_SIZE = 25;
          for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);

            await Promise.all(
              batch.map(async (user) => {
                let delivered = false;
                if (bc.image_url && bc.image_url.startsWith('http')) {
                  try {
                    await this.bot!.telegram.sendPhoto(user.telegram_id, bc.image_url, {
                      caption: formattedHtml,
                      parse_mode: 'HTML',
                      ...extraKeyboard
                    });
                    delivered = true;
                  } catch {
                    // Fallback to text if photo delivery fails
                  }
                }

                if (!delivered) {
                  try {
                    await this.bot!.telegram.sendMessage(user.telegram_id, formattedHtml, {
                      parse_mode: 'HTML',
                      ...extraKeyboard
                    });
                    delivered = true;
                  } catch (sendErr: any) {
                    console.warn(`[BroadcastWorker] sendMessage failed for ${user.telegram_id}:`, sendErr.message);
                  }
                }

                if (delivered) {
                  successful++;
                } else {
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
    }

    // 3. UPDATE SUPABASE RECORD STATUS TO 'SENT'
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

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private formatMessageHtml(title: string, body: string): string {
    let text = this.escapeHtml(body);

    // Convert **bold** and *bold* to <b>bold</b>
    text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    text = text.replace(/\*([^\n\*]+?)\*/g, '<b>$1</b>');

    // Convert _italic_ to <i>italic</i>
    text = text.replace(/_([^\n_]+?)_/g, '<i>$1</i>');

    // Convert `code` to <code>code</code>
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');

    if (title && title.trim()) {
      return `<b>${this.escapeHtml(title.trim())}</b>\n\n${text}`;
    }
    return text;
  }
}

export const broadcastWorker = new BroadcastWorker();
