import { Context, Markup } from 'telegraf';
import { dbService } from '../services/supabase.js';
import { I18N } from '../i18n.js';
import { getUserLanguage } from './start.js';

export async function handleLotteriesList(ctx: Context) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const events = await dbService.getActiveEvents();

  if (!events || events.length === 0) {
    return ctx.reply(t.noActiveLotteries);
  }

  const headerText =
    userLang === 'am' ? '🎯 *በአሁኑ ሰዓት ክፍት የሆኑ የሎተሪ ውድድሮች:*\n\nየሚፈልጉትን ውድድር ከመረጡ በኋላ *"🎟️ ይሄንን ዕጣ ምረጥ"* የሚለውን ይጫኑ👇' :
    userLang === 'om' ? '🎯 *Lootariiwwan Amma Banaa Ta\'an:*\n\nIsa barbaaddan filachuuf *"🎟️ Isa Kana Filadhu"* kan jedhu tuqaa👇' :
    '🎯 *Currently Active Lottery Events:*\n\nBrowse the active lotteries below and tap *"🎟️ Choose This Lottery"* to pick your lucky numbers👇';

  await ctx.reply(headerText, { parse_mode: 'Markdown' });

  // Send each active lottery as an individual, visually rich card with its poster/image and direct action button
  for (const ev of events) {
    const formattedDrawDate = ev.draw_at ? new Date(ev.draw_at).toLocaleString() : 'በቅርቡ / Coming soon';
    const providerLabel = ev.payment_provider ? ev.payment_provider.toUpperCase() : 'ንግድ ባንክ (CBE)';
    const receiverName = ev.receiver_name || 'Richo Ekup';
    const receiverAccount = ev.receiver_account_number || '';

    let cardCaption = '';

    if (userLang === 'am') {
      cardCaption = 
        `✨ *${ev.title}*\n\n` +
        `💰 *የአንድ ዕጣ ዋጋ ${ev.ticket_price} ብር ብቻ ነው!* 🏆\n` +
        (ev.description ? `\n${ev.description}\n` : '') +
        `\n👤 *ስም:* ${receiverName}\n` +
        `💳 *${providerLabel} 👉* \`${receiverAccount}\`\n\n` +
        `🗓️ *የዕጣ ቀን:* ${formattedDrawDate}\n` +
        `🔢 *ጠቅላላ ዕጣዎች:* 1 – ${ev.total_tickets}\n\n` +
        `📍 *አድራሻ:* ኢትዮጵያ | መልካም ዕድል! 🙏`;
    } else if (userLang === 'om') {
      cardCaption = 
        `✨ *${ev.title}*\n\n` +
        `💰 *Gatiin carraa tokkoo ${ev.ticket_price} Qr qofa!* 🏆\n` +
        (ev.description ? `\n${ev.description}\n` : '') +
        `\n👤 *Maqaa:* ${receiverName}\n` +
        `💳 *${providerLabel} 👉* \`${receiverAccount}\`\n\n` +
        `🗓️ *Guyyaa Carraa:* ${formattedDrawDate}\n` +
        `🔢 *Waliigala Tikkeettii:* 1 – ${ev.total_tickets}\n\n` +
        `📍 *Iddoo:* Itoophiyaa | Carraa Gaarii! 🙏`;
    } else {
      cardCaption = 
        `✨ *${ev.title}*\n\n` +
        `💰 *Ticket Price: ${ev.ticket_price} ETB Only!* 🏆\n` +
        (ev.description ? `\n${ev.description}\n` : '') +
        `\n👤 *Receiver Name:* ${receiverName}\n` +
        `💳 *${providerLabel} 👉* \`${receiverAccount}\`\n\n` +
        `🗓️ *Draw Date:* ${formattedDrawDate}\n` +
        `🔢 *Total Tickets:* 1 – ${ev.total_tickets}\n\n` +
        `📍 *Location:* Ethiopia | Good Luck! 🙏`;
    }

    const chooseButtonLabel =
      userLang === 'am' ? `🎟️ ይሄንን ዕጣ ምረጥ (${ev.ticket_price} ብር)` :
      userLang === 'om' ? `🎟️ Isa Kana Filadhu (${ev.ticket_price} Qr)` :
      `🎟️ Choose This Lottery (${ev.ticket_price} ETB)`;

    const randomButtonLabel =
      userLang === 'am' ? `🎲 በዘፈቀደ ቁጥር ቁረጥ` :
      userLang === 'om' ? `🎲 Carraan Filadhu` :
      `🎲 Pick Random Number`;

    const inlineKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback(chooseButtonLabel, `ev_select_${ev.id}`)],
      [Markup.button.callback(randomButtonLabel, `rng_random_${ev.id}`)]
    ]);

    // Send photo card if image_url exists and is a valid URL
    if (ev.image_url && ev.image_url.startsWith('http')) {
      try {
        await ctx.replyWithPhoto(ev.image_url, {
          caption: cardCaption,
          parse_mode: 'Markdown',
          ...inlineKeyboard
        });
        continue;
      } catch (err) {
        console.warn(`[Bot] Failed to send photo for event ${ev.id}, falling back to text:`, err);
      }
    }

    // Fallback if no photo or photo fails to load
    await ctx.reply(cardCaption, {
      parse_mode: 'Markdown',
      ...inlineKeyboard
    });
  }
}

export async function handleEventSelection(ctx: Context, eventId: string) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const event = await dbService.getEventById(eventId);

  if (!event) {
    return ctx.reply('❌ Event not found or expired.');
  }

  const message = `🎟️ *${event.title}*\n\n` +
    `💰 *${t.pricePerTicket}:* ${event.ticket_price} ETB\n` +
    `🔢 *${t.ticketsPool}:* 1 – ${event.total_tickets}\n` +
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

  const backLabel = userLang === 'am' ? '⬅️ ወደ ሁሉም ሎተሪዎች ተመለስ' :
    userLang === 'om' ? '⬅️ Gara Lootariitti Deebi\'i' :
    '⬅️ Back to Active Lotteries';

  inlineKeyboardRows.unshift([
    Markup.button.callback(randomLabel, `rng_random_${event.id}`)
  ]);

  inlineKeyboardRows.push([
    Markup.button.callback(backLabel, 'nav_active_lotteries')
  ]);

  // If photo is present, send with photo
  if (event.image_url && event.image_url.startsWith('http')) {
    try {
      await ctx.replyWithPhoto(event.image_url, {
        caption: message,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineKeyboardRows)
      });
      return;
    } catch (err) {
      console.warn(`[Bot] Failed to send photo in selection for ${event.id}:`, err);
    }
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(inlineKeyboardRows)
  });
}
