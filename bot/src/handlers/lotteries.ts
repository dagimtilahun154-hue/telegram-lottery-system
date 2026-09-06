import { Context, Markup } from 'telegraf';
import { dbService } from '../services/supabase.js';
import { I18N } from '../i18n.js';
import { getUserLanguage } from './start.js';

export async function handleLotteriesList(ctx: Context) {
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const events = await dbService.getActiveEvents();

  if (!events || events.length === 0) {
    return ctx.reply(t.noActiveLotteries);
  }

  const buttons = events.map((ev: any) => {
    return [
      Markup.button.callback(
        `🎟️ ${ev.title} — ${ev.ticket_price} ETB`,
        `ev_select_${ev.id}`
      )
    ];
  });

  await ctx.reply(
    t.activeLotteriesTitle,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

export async function handleEventSelection(ctx: Context, eventId: string) {
  await ctx.answerCbQuery().catch(() => {});
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const event = await dbService.getEventById(eventId);

  if (!event) {
    return ctx.reply('❌ Event not found or expired.');
  }

  const message = `🎟️ *${event.title}*\n\n` +
    `💰 *${t.pricePerTicket}:* ${event.ticket_price} ETB\n` +
    `🔢 *${t.ticketsPool}:* 1 - ${event.total_tickets}\n` +
    `🏆 *${t.drawDate}:* ${new Date(event.draw_at).toLocaleString()}\n\n` +
    `💳 *${t.paymentInstructions}:*\n` +
    `• ${userLang === 'am' ? 'ባንክ / የክፍያ ዘዴ' : userLang === 'om' ? 'Mala Kaffaltii' : 'Provider'}: *${event.payment_provider || 'Telebirr / CBE'}*\n` +
    `• ${userLang === 'am' ? 'የሂሳብ ቁጥር / ስልክ' : userLang === 'om' ? 'Lakk Herregaa' : 'Account Number / Phone'}: \`${event.receiver_account_number}\`\n` +
    `• ${userLang === 'am' ? 'የተቀባይ ስም' : userLang === 'om' ? 'Maqaa' : 'Receiver Name'}: *${event.receiver_name}*\n\n` +
    `${t.selectEventPrompt}`;

  const total = event.total_tickets;
  const chunks = [];
  
  const chunkSize = total <= 100 ? 20 : total <= 500 ? 50 : total <= 2000 ? 100 : 250;
  for (let i = 1; i <= total; i += chunkSize) {
    const end = Math.min(i + chunkSize - 1, total);
    chunks.push(Markup.button.callback(`${i} - ${end}`, `rng_${event.id}_${i}_${end}`));
  }

  const inlineKeyboardRows: any[] = [];
  for (let i = 0; i < chunks.length; i += 2) {
    inlineKeyboardRows.push(chunks.slice(i, i + 2));
  }

  const randomLabel = userLang === 'am' ? '🎲 የዕድል ቁጥር በዘፈቀደ ምረጥ' :
    userLang === 'om' ? '🎲 Lakkoofsa Carraa Filadhu' :
    '🎲 Pick Lucky Random Number';

  inlineKeyboardRows.unshift([
    Markup.button.callback(randomLabel, `rng_random_${event.id}`)
  ]);

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(inlineKeyboardRows)
  });
}
