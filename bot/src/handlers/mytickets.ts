import { Context, Markup } from 'telegraf';
import { dbService } from '../services/supabase.js';
import { I18N } from '../i18n.js';
import { getUserLanguage } from './start.js';

export async function handleMyTickets(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const participantId = await dbService.getParticipantId(telegramId);
  if (!participantId) {
    return ctx.reply(
      userLang === 'am' ? '⚠️ እባክዎ መጀመሪያ በ /start ስልክ ቁጥርዎን ይመዝግቡ።' :
      userLang === 'om' ? '⚠️ Maaloo dura /start fayyadamuun galmaa\'aa.' :
      '⚠️ Please register your phone number first using /start.'
    );
  }

  const tickets = await dbService.getUserTickets(participantId);

  if (!tickets || tickets.length === 0) {
    const noTicketsMsg = userLang === 'am' ? '🎫 በአሁኑ ሰዓት የተቆረጠ ይፋዊ ቲኬት የለዎትም።\n\nዕድልዎን ለመሞከር ከታች ያለውን አዝራር ይጫኑ!' :
      userLang === 'om' ? '🎫 Tikkeettii kaffaltiin isaa mirkanaa\'e hin qabdu.\n\nCarraa keessan yaaluuf furtuu armaan gadii tuqaa!' :
      '🎫 You do not currently have any issued lottery tickets.\n\nTap "Active Lotteries" below to reserve a lucky number!';

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
    text += `*${idx + 1}. #${tick.ticket_number}*\n` +
      `   • ${userLang === 'am' ? 'ውድድር' : userLang === 'om' ? 'Lootarii' : 'Event'}: ${event?.title || 'Lottery'}\n` +
      `   • ${userLang === 'am' ? 'ዋጋ' : userLang === 'om' ? 'Gatii' : 'Price'}: ${event?.ticket_price || 0} ETB\n` +
      `   • ${userLang === 'am' ? 'ሁኔታ' : userLang === 'om' ? 'Haala' : 'Status'}: ✅ ፀድቋል (ISSUED)\n` +
      `   • ${userLang === 'am' ? 'የተቆረጠበት ቀን' : userLang === 'om' ? 'Guyyaa' : 'Date'}: ${new Date(tick.issued_at).toLocaleDateString()}\n\n`;
  });

  text += userLang === 'am' ? '_ሁሉም ቲኬቶች ተረጋግጠው በይፋዊው የዕጣ ማውጫ ስርዓት ውስጥ ተመዝግበዋል።_' :
    userLang === 'om' ? '_Tikkeettiin hundi mirkanaa\'ee sirna carraa keessa galeera._' :
    '_All tickets are verified and registered in the prize draw database._';

  await ctx.reply(text, { parse_mode: 'Markdown' });
}
