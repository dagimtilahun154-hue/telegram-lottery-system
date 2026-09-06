import { Context, Markup } from 'telegraf';
import { dbService } from '../services/supabase.js';
import { I18N } from '../i18n.js';
import { getUserLanguage } from './start.js';

export async function handleMyTickets(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const username = ctx.from?.username;
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  // Fetch all tickets linked to this telegram user, associated phones, and participant IDs
  const tickets = await dbService.getUserTickets(telegramId, username);

  if (!tickets || tickets.length === 0) {
    const participantId = await dbService.getParticipantId(telegramId);
    if (!participantId) {
      const regPrompt =
        userLang === 'am' ? '⚠️ *የእርስዎን ቲኬቶች ለመመልከት እባክዎ መጀመሪያ ስልክ ቁጥርዎን ያጋሩ 📱*' :
        userLang === 'om' ? '⚠️ *Tikkeettii keessan ilaaluuf dura bilbila keessan nuuf qoodaa 📱*' :
        '⚠️ *To view and track your tickets, please share your contact first 📱*';

      return ctx.reply(regPrompt, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          [Markup.button.contactRequest(I18N[userLang].shareContactButton)]
        ]).resize().oneTime()
      });
    }

    const noTicketsMsg = userLang === 'am' ? '🎫 በአሁኑ ሰዓት የተቆረጠ ይፋዊ ቲኬት የለዎትም።\n\nዕድልዎን ለመሞከር ከታች ያለውን አዝራር ይጫኑ!' :
      userLang === 'om' ? '🎫 Tikkeettii kaffaltiin isaa mirkanaa\'e hin qabdu.\n\nCarraa keessan yaaluuf furtuu armaan gadii tuqaa!' :
      '🎫 You do not currently have any active lottery tickets.\n\nTap "Active Lotteries" below to reserve a lucky number!';

    return ctx.reply(
      noTicketsMsg,
      Markup.inlineKeyboard([
        [Markup.button.callback(t.menuActiveLotteries, 'nav_active_lotteries')]
      ])
    );
  }

  const header = userLang === 'am' ? `🎫 *የእርስዎ ይፋዊ የሎተሪ ቲኬቶች (${tickets.length})*\n\n` :
    userLang === 'om' ? `🎫 *Tikkeettii Lootarii Keessan (${tickets.length})*\n\n` :
    `🎫 *Your Official Lottery Tickets (${tickets.length})*\n\n`;

  let text = header;

  tickets.forEach((tick: any, idx: number) => {
    const event = tick.lottery_events;
    const isWinner = tick.status === 'WINNER';
    const statusLabel = isWinner ? 
      (userLang === 'am' ? '🏆 አሸናፊ (WINNER)' : userLang === 'om' ? '🏆 Injifataa (WINNER)' : '🏆 WINNER') :
      (userLang === 'am' ? '✅ ፀድቋል (ISSUED)' : userLang === 'om' ? '✅ Mirkanaa\'e (ISSUED)' : '✅ Verified (ISSUED)');

    const ticketDate = tick.issued_at ? new Date(tick.issued_at).toLocaleDateString() : 'N/A';

    text += `*${idx + 1}. #${tick.ticket_number}*\n` +
      `   • ${userLang === 'am' ? 'ውድድር' : userLang === 'om' ? 'Lootarii' : 'Event'}: ${event?.title || 'Lottery'}\n` +
      `   • ${userLang === 'am' ? 'ዋጋ' : userLang === 'om' ? 'Gatii' : 'Price'}: ${event?.ticket_price || 0} ETB\n` +
      `   • ${userLang === 'am' ? 'ሁኔታ' : userLang === 'om' ? 'Haala' : 'Status'}: ${statusLabel}\n` +
      `   • ${userLang === 'am' ? 'የተቆረጠበት ቀን' : userLang === 'om' ? 'Guyyaa' : 'Date'}: ${ticketDate}\n\n`;
  });

  text += userLang === 'am' ? '_ሁሉም ቲኬቶች ተረጋግጠው በይፋዊው የዕጣ ማውጫ ስርዓት ውስጥ ተመዝግበዋል።_' :
    userLang === 'om' ? '_Tikkeettiin hundi mirkanaa\'ee sirna carraa keessa galeera._' :
    '_All tickets are verified and registered in the prize draw database._';

  await ctx.reply(text, { parse_mode: 'Markdown' });
}
