import { Context, Markup } from 'telegraf';
import { supabase } from '../services/supabase.js';
import { I18N } from '../i18n.js';
import { getUserLanguage } from './start.js';

export async function handleResultsWinners(ctx: Context) {
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  try {
    // Query recently announced winners
    const { data: winners, error } = await supabase
      .from('winners')
      .select(`
        ticket_number,
        prize_title,
        announcement_text,
        selected_at,
        lottery_events (
          title,
          ticket_price
        ),
        participants (
          full_name,
          phone_number
        )
      `)
      .order('selected_at', { ascending: false })
      .limit(10);

    if (error || !winners || winners.length === 0) {
      // Check if any events are completed or winner selected
      const { data: events } = await supabase
        .from('lottery_events')
        .select('title, winner_message, updated_at')
        .in('status', ['WINNER_SELECTED', 'COMPLETED'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (events && events.length > 0) {
        let msg = userLang === 'am' ? '🏆 *የቅርብ ጊዜ ይፋዊ የዕጣ አሸናፊዎች*\n\n' :
          userLang === 'om' ? '🏆 *Bu\'aawwan Lootarii Dhihoo*\n\n' :
          '🏆 *Recent Official Lottery Winners*\n\n';

        events.forEach((ev, idx) => {
          msg += `*${idx + 1}. ${ev.title}*\n` +
            `   🎉 ${ev.winner_message || 'Winner selected'}\n\n`;
        });

        return ctx.reply(msg, { parse_mode: 'Markdown' });
      }

      return ctx.reply(t.resultsPending, {
        reply_markup: {
          inline_keyboard: [
            [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
          ]
        }
      });
    }

    let msg = userLang === 'am' ? '🏆 *የቅርብ ጊዜ ይፋዊ የዕጣ አሸናፊዎች*\n\n' :
      userLang === 'om' ? '🏆 *Bu\'aawwan Lootarii Dhihoo*\n\n' :
      '🏆 *Recent Official Lottery Winners*\n\n';

    winners.forEach((w: any, idx: number) => {
      const evt = w.lottery_events || {};
      const part = w.participants || {};
      const maskedPhone = part.phone_number ? part.phone_number.slice(0, 4) + '****' + part.phone_number.slice(-3) : '';

      msg += `*${idx + 1}. 🎟️ ቲኬት #${w.ticket_number}*\n` +
        `   • ${userLang === 'am' ? 'ውድድር' : 'Event'}: *${evt.title || w.prize_title}*\n` +
        `   • ${userLang === 'am' ? 'አሸናፊ' : 'Winner'}: *${part.full_name || 'Lucky Participant'}* (${maskedPhone})\n` +
        `   • ${userLang === 'am' ? 'ቀን' : 'Date'}: ${new Date(w.selected_at).toLocaleDateString()}\n\n`;
    });

    msg += userLang === 'am' ? '_ሁሉም ዕጣዎች በይፋዊና ፍትሃዊ መንገድ የወጡ ናቸው።_' :
      '_All prize draws are verified and provably fair._';

    return ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[WinnersHandler] Error fetching winners:', err);
    return ctx.reply(t.resultsPending);
  }
}
