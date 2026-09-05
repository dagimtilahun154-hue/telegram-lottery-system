import { Context, Markup } from 'telegraf';
import { dbService } from '../services/supabase.js';
import { I18N } from '../i18n.js';
import { getUserLanguage } from './start.js';

export async function handleRangeBrowse(ctx: Context, eventId: string, start: number, end: number) {
  await ctx.answerCbQuery().catch(() => {});
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const available = await dbService.getAvailableNumbersInRange(eventId, start, end, 30);

  if (available.length === 0) {
    return ctx.reply(
      userLang === 'am' ? `⚠️ በቁጥር ክልል ${start} - ${end} መካከል ክፍት ቁጥር የለም። እባክዎ ሌላ ክልል ይምረጡ።` :
      userLang === 'om' ? `⚠️ Lakkoofsa ${start} - ${end} gidduutti tikkeettiin banaa hin jiru. Maaloo isa biraa filadhaa.` :
      `⚠️ No available numbers in range ${start} - ${end}. Please try another range block.`
    );
  }

  // Create number buttons (5 per row)
  const buttons: any[] = [];
  for (let i = 0; i < available.length; i += 5) {
    const row = available.slice(i, i + 5).map(num => 
      Markup.button.callback(`#${num}`, `reserve_${eventId}_${num}`)
    );
    buttons.push(row);
  }

  // Back button
  buttons.push([
    Markup.button.callback(
      userLang === 'am' ? '⬅️ ወደ ውድድሮች ተመለስ' : userLang === 'om' ? '⬅️ Gara Lootariitti Deebi\'i' : '⬅️ Back to Events',
      `ev_select_${eventId}`
    )
  ]);

  const browseTitle = userLang === 'am' ? `🔢 *በቁጥር ክልል ${start} - ${end} ውስጥ ያሉ ክፍት ቁጥሮች*\n\nየሚፈልጉትን ቁጥር ለ15 ደቂቃ ለመያዝ አንዱን ይጫኑ:` :
    userLang === 'om' ? `🔢 *Lakkoofsa ${start} - ${end} Gidduu Jiran*\n\nDaqiiqaa 15f qabachuuf isa tokko tuqaa:` :
    `🔢 *Available Numbers in Range ${start} - ${end}*\n\nTap any number to reserve it for 15 minutes:`;

  await ctx.reply(browseTitle, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons)
  });
}

export async function handleReserveTicket(ctx: Context, eventId: string, ticketNumber: number) {
  await ctx.answerCbQuery().catch(() => {});
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const participantId = await dbService.getParticipantId(telegramId);
  if (!participantId) {
    const regPrompt =
      userLang === 'am' ? '⚠️ *ቲኬት ከመቁረጥዎ በፊት እባክዎ መጀመሪያ ይመዝገቡ!*\n\nምዝገባው ቲኬቶችዎን ለመከታተል፣ ክፍያዎን ለማረጋገጥ እና አሸናፊ ሲሆኑ ማሳወቂያ ለመላክ ያገለግላል።' :
      userLang === 'om' ? '⚠️ *Tikkeettii qabachuu dura maaloo dura galmaa\'aa!*\n\nGalmeen kun tikkeettii hordofuu fi beeksisa argachuuf fayyada.' :
      '⚠️ *Please complete registration before reserving a ticket!*\n\nRegistration allows you to track your tickets, verify payments, and receive draw notifications.';

    return ctx.reply(regPrompt, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        [Markup.button.contactRequest(I18N[userLang].shareContactButton)]
      ]).resize().oneTime()
    });
  }

  const result = await dbService.reserveTicket(eventId, ticketNumber, participantId);

  if (!result || !result.success) {
    if (result?.error === 'ACTIVE_RESERVATION_EXISTS') {
      return ctx.reply(t.activeReservationExists, { parse_mode: 'Markdown' });
    }

    if (result?.error === 'TICKET_UNAVAILABLE') {
      return ctx.reply(t.ticketUnavailable(ticketNumber));
    }

    return ctx.reply(`❌ Could not reserve ticket: ${result?.message || 'Please try again.'}`);
  }

  const event = await dbService.getEventById(eventId);
  const price = event?.ticket_price || 0;
  const title = event?.title || 'Lottery';

  const confirmationMsg = t.reservedSuccess(ticketNumber, title, price);

  const cbeBtnLabel = userLang === 'am' ? '🏦 በኢትዮጵያ ንግድ ባንክ (CBE)' : userLang === 'om' ? '🏦 Baankii Daldala Itoophiyaa (CBE)' : '🏦 Commercial Bank of Ethiopia (CBE)';
  const tbBtnLabel = userLang === 'am' ? '📱 በቴሌብር (Telebirr)' : userLang === 'om' ? '📱 Telebirr' : '📱 Telebirr';
  const cancelBtnLabel = userLang === 'am' ? '❌ ይዞታን ሰርዝ' : userLang === 'om' ? '❌ Haqi' : '❌ Cancel Reservation';

  await ctx.reply(confirmationMsg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(cbeBtnLabel, `pay_cbe_${eventId}_${ticketNumber}`)],
      [Markup.button.callback(tbBtnLabel, `pay_tb_${eventId}_${ticketNumber}`)],
      [Markup.button.callback(cancelBtnLabel, `cancel_res_${eventId}_${ticketNumber}`)]
    ])
  });
}

/**
 * Handle CBE Payment Method Selection
 */
export async function handleSelectCbe(ctx: Context, eventId: string, ticketNumber: number) {
  await ctx.answerCbQuery().catch(() => {});
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const event = await dbService.getEventById(eventId);
  const price = event?.ticket_price || 0;
  const account = event?.receiver_account_number || '';
  const name = event?.receiver_name || '';

  const msg =
    `🏦 *${t.cbeTitle}*\n\n` +
    (account ? `• ${userLang === 'am' ? 'የሂሳብ ቁጥር' : userLang === 'om' ? 'Lakk Herregaa' : 'Account Number'}: \`${account}\`\n` : '') +
    (name ? `• ${userLang === 'am' ? 'የሂሳብ ስም' : userLang === 'om' ? 'Maqaa' : 'Account Name'}: *${name}*\n` : '') +
    `• ${t.pricePerTicket}: *${price} ETB*\n` +
    `• ${userLang === 'am' ? 'የተያዘ ቲኬት' : userLang === 'om' ? 'Tikkeettii' : 'Ticket Reserved'}: *#${ticketNumber}*\n\n` +
    `📋 *${t.paymentInstructions}:*\n` +
    `${t.howToPayCbe(price)}\n\n` +
    `${t.pasteReferenceHint}`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

/**
 * Handle Telebirr Payment Method Selection
 */
export async function handleSelectTelebirr(ctx: Context, eventId: string, ticketNumber: number) {
  await ctx.answerCbQuery().catch(() => {});
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const event = await dbService.getEventById(eventId);
  const price = event?.ticket_price || 0;
  const phone = event?.receiver_account_number || '';
  const name = event?.receiver_name || '';

  const msg =
    `📱 *${t.telebirrTitle}*\n\n` +
    (phone ? `• ${userLang === 'am' ? 'የቴሌብር ቁጥር' : userLang === 'om' ? 'Lakk Telebirr' : 'Telebirr Number'}: \`${phone}\`\n` : '') +
    (name ? `• ${userLang === 'am' ? 'የተቀባይ ስም' : userLang === 'om' ? 'Maqaa' : 'Receiver Name'}: *${name}*\n` : '') +
    `• ${t.pricePerTicket}: *${price} ETB*\n` +
    `• ${userLang === 'am' ? 'የተያዘ ቲኬት' : userLang === 'om' ? 'Tikkeettii' : 'Ticket Reserved'}: *#${ticketNumber}*\n\n` +
    `📋 *${t.paymentInstructions}:*\n` +
    `${t.howToPayTelebirr(price)}\n\n` +
    `${t.pasteReferenceHint}`;

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

/**
 * Handle Reservation Cancellation
 */
export async function handleCancelReservation(ctx: Context, eventId: string, ticketNumber: number) {
  await ctx.answerCbQuery().catch(() => {});
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const participantId = await dbService.getParticipantId(telegramId);
  if (!participantId) return;

  await dbService.cancelPendingReservation(participantId, eventId);
  return ctx.reply(
    t.reservationCancelled(ticketNumber),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
        ]
      }
    }
  );
}

export async function handleRandomTicket(ctx: Context, eventId: string) {
  await ctx.answerCbQuery().catch(() => {});
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const event = await dbService.getEventById(eventId);
  const total = event?.total_tickets || 500;
  const available = await dbService.getAvailableNumbersInRange(eventId, 1, total, 50);

  if (available.length === 0) {
    return ctx.reply(
      userLang === 'am' ? '⚠️ ሁሉም ቁጥሮች በአሁኑ ሰዓት ተይዘዋል ወይም ተሽጠዋል!' :
      userLang === 'om' ? '⚠️ Tikkeettiin hundi qabameera ykn gurgurameera!' :
      '⚠️ All tickets for this event are currently reserved or sold!'
    );
  }

  const randomTicket = available[Math.floor(Math.random() * available.length)];
  return handleReserveTicket(ctx, eventId, randomTicket);
}
