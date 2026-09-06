import { Context, Markup } from 'telegraf';
import fetch from 'node-fetch';
import { supabase, dbService } from '../services/supabase.js';
import { veritasService, VeritasService } from '../services/veritas.js';
import { directVerifier } from '../services/directVerifier.js';
import { localOcrService } from '../services/localOcr.js';
import { I18N } from '../i18n.js';
import { getUserLanguage, pendingRegistrations, showMainMenu, userLanguageCache } from './start.js';

/**
 * Handle Photo Payment Receipts
 */
export async function handleReceiptPhoto(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const participantId = await dbService.getParticipantId(telegramId);
  if (!participantId) {
    return ctx.reply('⚠️ Please register your account with /start first.');
  }

  // 1. Look up active pending reservation for this participant
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .select(`
      id,
      ticket_number,
      event_id,
      expires_at,
      status,
      lottery_events (
        id,
        title,
        ticket_price,
        receiver_account_number,
        receiver_name,
        payment_provider
      )
    `)
    .eq('participant_id', participantId)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (resError || !reservation) {
    return ctx.reply(
      t.noActiveReservationForReceipt,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
          ]
        }
      }
    );
  }

  const ticketNumber = reservation.ticket_number;
  const event = (reservation as any).lottery_events;
  const chosenProvider = (event?.payment_provider || 'CBE').toUpperCase();

  await ctx.reply(
    t.paymentReceivedVerifying(ticketNumber),
    { parse_mode: 'Markdown' }
  );

  // 2. Download photo directly into RAM Buffer (NEVER saved to disk or cloud storage)
  const message = ctx.message as any;
  const photos = message?.photo;
  if (!photos || photos.length === 0) {
    return ctx.reply('❌ Please send a valid photo image of the payment receipt.');
  }

  const largestPhoto = photos[photos.length - 1];
  const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
  const response = await fetch(fileLink.href);
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  // Check caption for explicit user reference or FT code
  const caption = (message?.caption || '').trim();
  const captionFtMatch = caption.match(/\b(FT[0-9A-Za-z]{8,})\b/i);
  const captionRef = captionFtMatch ? captionFtMatch[1].toUpperCase() : null;

  // 3. Local In-Memory OCR Extraction (Zero Image Storage)
  const ocrResult = await localOcrService.extractReference(imageBuffer, chosenProvider);
  const detectedRef = captionRef || ocrResult.reference;
  const activeProvider = ocrResult.detectedProvider !== 'UNKNOWN' ? ocrResult.detectedProvider : chosenProvider;

  console.log(`[ReceiptHandler] OCR Result: Provider=${activeProvider}, Ref=${detectedRef}, Amount=${ocrResult.detectedAmount}`);

  let verificationResult: any = null;

  // 4. Provider-Specific Verification Routing
  if (activeProvider === 'CBE' || (detectedRef && (detectedRef.startsWith('FT') || detectedRef.includes('mbreciept') || detectedRef.startsWith('v2-')))) {
    // CBE: Use Direct CBE Portal Verifier (mbreciept API & apps.cbe.com.et:100 - 100% Free & Unlimited)
    if (detectedRef) {
      console.log(`🏦 [ReceiptHandler] Verifying CBE reference ${detectedRef} via Direct CBE Verifier...`);
      verificationResult = await directVerifier.verifyCbe(detectedRef);
    } else {
      console.log('[ReceiptHandler] CBE receipt without extracted FT or mbreciept number.');
      verificationResult = { isSuccess: false, error: 'Could not extract FT or mbreciept token from CBE receipt' };
    }
  } else {
    // Telebirr: Route to 8-Key Veritas Pool (800+ per month capacity, auto-rotating)
    if (detectedRef) {
      console.log(`📱 [ReceiptHandler] Verifying Telebirr reference ${detectedRef} via 8-Key Veritas Pool...`);
      verificationResult = await veritasService.verifyTelebirrReference(detectedRef);
    } else {
      console.log('[ReceiptHandler] Telebirr receipt without extracted reference number.');
      verificationResult = { isSuccess: false, error: 'Could not extract transaction number from Telebirr receipt' };
    }
  }

  // 5. Strict comparison against event requirements
  const matchResult = verificationResult ? VeritasService.validateStrictly(verificationResult, {
    ticket_price: event.ticket_price,
    receiver_account_number: event.receiver_account_number,
    receiver_name: event.receiver_name
  }) : { valid: false, reason: 'Reference not extracted or verified' };

  // 6. Record in Database WITHOUT saving the screenshot (only extracted metadata saved)
  const paymentRecord = await dbService.submitPaymentReceipt(
    reservation.id,
    null as any, // NEVER store screenshot URL - purely zero storage
    activeProvider,
    detectedRef || undefined
  );

  if (!paymentRecord || !paymentRecord.payment_id) {
    return ctx.reply('❌ Database error recording payment. Please contact admin support.');
  }

  // 7. If verified: Issue Ticket Immediately
  if (verificationResult?.isSuccess && matchResult.valid) {
    const issueResult = await dbService.verifyAndIssueTicket(
      paymentRecord.payment_id,
      verificationResult.rawResponse || {},
      activeProvider,
      matchResult.detectedRef || detectedRef!,
      matchResult.detectedAmount || event.ticket_price,
      matchResult.detectedAccount,
      matchResult.detectedName
    );

    if (issueResult && issueResult.success) {
      const successButtons = [
        [{ text: t.menuMyTickets, callback_data: 'nav_my_tickets' }],
        [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
      ];
      return ctx.reply(
        t.ticketIssued(ticketNumber, event.title, matchResult.detectedAmount || event.ticket_price, matchResult.detectedRef || detectedRef!),
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: successButtons }
        }
      );
    }
  }

  // 8. If verification needs manual check: Apply 30-min extension and queue for Admin
  const extendedExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase
    .from('reservations')
    .update({ expires_at: extendedExpiresAt, status: 'PAYMENT_SUBMITTED' })
    .eq('id', reservation.id);

  const reason = matchResult.reason || verificationResult?.error || 'Manual inspection needed';

  const bankAccount = matchResult.detectedAccount || verificationResult?.receiverAccount || ocrResult.detectedAccount || null;
  const bankName = matchResult.detectedName || verificationResult?.receiverName || ocrResult.detectedName || null;
  const bankAmount = matchResult.detectedAmount !== undefined ? matchResult.detectedAmount : (verificationResult?.amount || ocrResult.detectedAmount || null);
  const bankRef = matchResult.detectedRef || verificationResult?.reference || detectedRef || null;

  await supabase
    .from('payments')
    .update({
      status: 'MANUAL_REVIEW',
      rejection_reason: `${reason} (Extracted Ref: ${bankRef || 'None'})`,
      expected_receiver_account: event.receiver_account_number,
      detected_account: bankAccount,
      detected_receiver_account: bankAccount,
      expected_receiver_name: event.receiver_name,
      detected_name: bankName,
      detected_receiver_name: bankName,
      expected_amount: event.ticket_price,
      detected_amount: bankAmount,
      transaction_reference: bankRef,
      veritas_raw_response: verificationResult?.rawResponse || null
    })
    .eq('id', paymentRecord.payment_id);

  return ctx.reply(
    t.paymentQueuedAdmin(ticketNumber, detectedRef || 'Staff review'),
    { parse_mode: 'Markdown' }
  );
}

/**
 * Handle Document Payment Receipts (e.g. photos sent as uncompressed files/PNG)
 */
export async function handleReceiptDocument(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const doc = (ctx.message as any)?.document;
  const mime = (doc?.mime_type || '').toLowerCase();
  const fileName = (doc?.file_name || '').toLowerCase();

  const isImageDoc = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(fileName);

  if (isImageDoc) {
    // Treat as receipt photo directly in RAM buffer
    const userLang = await getUserLanguage(ctx);
    const t = I18N[userLang];

    const participantId = await dbService.getParticipantId(telegramId);
    if (!participantId) {
      return ctx.reply('⚠️ Please register your account with /start first.');
    }

    const { data: reservation } = await supabase
      .from('reservations')
      .select(`
        id,
        ticket_number,
        event_id,
        expires_at,
        status,
        lottery_events ( id, title, ticket_price, receiver_account_number, receiver_name, payment_provider )
      `)
      .eq('participant_id', participantId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!reservation) {
      return ctx.reply(t.noActiveReservationForReceipt, {
        reply_markup: {
          inline_keyboard: [
            [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
          ]
        }
      });
    }

    const ticketNumber = reservation.ticket_number;
    const event = (reservation as any).lottery_events;
    const chosenProvider = (event?.payment_provider || 'CBE').toUpperCase();

    await ctx.reply(t.paymentReceivedVerifying(ticketNumber), { parse_mode: 'Markdown' });

    const fileLink = await ctx.telegram.getFileLink(doc.file_id);
    const response = await fetch(fileLink.href);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const ocrResult = await localOcrService.extractReference(imageBuffer, chosenProvider);
    const detectedRef = ocrResult.reference;
    const activeProvider = ocrResult.detectedProvider !== 'UNKNOWN' ? ocrResult.detectedProvider : chosenProvider;

    let verificationResult: any = null;
    if (activeProvider === 'CBE' || (detectedRef && (detectedRef.startsWith('FT') || detectedRef.includes('mbreciept') || detectedRef.startsWith('v2-')))) {
      if (detectedRef) {
        verificationResult = await directVerifier.verifyCbe(detectedRef);
      }
    } else if (detectedRef) {
      verificationResult = await veritasService.verifyTelebirrReference(detectedRef);
    }

    const matchResult = verificationResult ? VeritasService.validateStrictly(verificationResult, {
      ticket_price: event.ticket_price,
      receiver_account_number: event.receiver_account_number,
      receiver_name: event.receiver_name
    }) : { valid: false, reason: 'Reference not extracted or verified' };

    const paymentRecord = await dbService.submitPaymentReceipt(
      reservation.id,
      null as any,
      activeProvider,
      detectedRef || undefined
    );

    if (verificationResult?.isSuccess && matchResult.valid && paymentRecord?.payment_id) {
      const issueResult = await dbService.verifyAndIssueTicket(
        paymentRecord.payment_id,
        verificationResult.rawResponse || {},
        activeProvider,
        matchResult.detectedRef || detectedRef!,
        matchResult.detectedAmount || event.ticket_price,
        matchResult.detectedAccount,
        matchResult.detectedName
      );

      if (issueResult?.success) {
        const successButtons = [
          [{ text: t.menuMyTickets, callback_data: 'nav_my_tickets' }],
          [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
        ];
        return ctx.reply(
          t.ticketIssued(ticketNumber, event.title, matchResult.detectedAmount || event.ticket_price, matchResult.detectedRef || detectedRef!),
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: successButtons }
          }
        );
      }
    }

    // Extended hold
    const extendedExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from('reservations').update({ expires_at: extendedExpiresAt, status: 'PAYMENT_SUBMITTED' }).eq('id', reservation.id);
    if (paymentRecord?.payment_id) {
      const bankAccount = matchResult.detectedAccount || verificationResult?.receiverAccount || ocrResult.detectedAccount || null;
      const bankName = matchResult.detectedName || verificationResult?.receiverName || ocrResult.detectedName || null;
      const bankAmount = matchResult.detectedAmount !== undefined ? matchResult.detectedAmount : (verificationResult?.amount || ocrResult.detectedAmount || null);
      const bankRef = matchResult.detectedRef || verificationResult?.reference || detectedRef || null;

      await supabase.from('payments').update({
        status: 'MANUAL_REVIEW',
        rejection_reason: `${matchResult.reason || 'Manual check needed'} (Ref: ${bankRef || 'None'})`,
        expected_receiver_account: event.receiver_account_number,
        detected_account: bankAccount,
        detected_receiver_account: bankAccount,
        expected_receiver_name: event.receiver_name,
        detected_name: bankName,
        detected_receiver_name: bankName,
        expected_amount: event.ticket_price,
        detected_amount: bankAmount,
        transaction_reference: bankRef,
        veritas_raw_response: verificationResult?.rawResponse || null
      }).eq('id', paymentRecord.payment_id);
    }

    return ctx.reply(t.paymentQueuedAdmin(ticketNumber, detectedRef || 'Manual Check'), { parse_mode: 'Markdown' });
  }

  // Non-image document: never leave on seen!
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];
  return ctx.reply(
    `📎 ${t.pasteReferenceHint}\n\n${t.unrecognizedMessage}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }],
          [{ text: t.menuHelp, callback_data: 'nav_help' }]
        ]
      }
    }
  );
}

/**
 * Handle Text Messages (References, Full Name Registration, SMS, Inquiries) - NEVER LEAVES USER ON SEEN
 */
export async function handleReceiptText(ctx: Context) {
  const text = ((ctx.message as any)?.text || '').trim();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  // 1. Check if user is completing registration by entering their full name
  if (pendingRegistrations.has(telegramId)) {
    const pending = pendingRegistrations.get(telegramId)!;
    const fullName = text.trim();

    if (fullName.length < 2 || fullName.startsWith('/')) {
      return ctx.reply(
        userLang === 'am' ? '⚠️ እባክዎ ትክክለኛ ሙሉ ስምዎን (የመጀመሪያ እና የአባት ስም) ያስገቡ:' :
        userLang === 'om' ? '⚠️ Maaloo maqaa keessan guutuu sirrii nuuf galchaa:' :
        '⚠️ Please enter a valid full name (First & Last Name):'
      );
    }

    pendingRegistrations.delete(telegramId);

    await dbService.upsertUser({
      telegramId,
      username: ctx.from?.username,
      fullName,
      phoneNumber: pending.phone,
      language: pending.language
    });

    userLanguageCache.set(telegramId, pending.language);

    const successMsg = 
      userLang === 'am' ? `✅ *እንኳን ደህና መጡ ${fullName}! ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል!*\n\nአሁን የሎተሪ ዕጣዎችን መቁረጥ፣ ቲኬቶችዎን መከታተል እና ማሳወቂያዎችን ማግኘት ይችላሉ።` :
      userLang === 'om' ? `✅ *Baga nagaan dhuftan ${fullName}! Galmeen keessan milkaa'inaan xumurameera!*\n\nAmma lootarii qabachuu, tikkeettii hordofuu fi beeksisa argachuuf qophiidha.` :
      `✅ *Welcome ${fullName}! Your registration is complete!*\n\nYou can now reserve tickets, track your entries, and receive instant draw notifications.`;

    await ctx.reply(successMsg, { parse_mode: 'Markdown' });
    return showMainMenu(ctx, pending.language);
  }

  // Check if user sent CBE FT number, modern mbreciept link/token, or Telebirr code/SMS
  const mbreceiptMatch = text.match(/(?:https?:\/\/)?mbrecie?pt\.cbe\.com\.et\/([a-zA-Z0-9_-]+)/i) || text.match(/\b(v2-[a-zA-Z0-9_-]{12,})\b/i);
  const cbeFtMatch = text.match(/\b(FT[0-9A-Za-z]{8,})\b/i);
  const cbeMatch = mbreceiptMatch || cbeFtMatch;
  const telebirrMatch = text.match(/(?:Transaction\s*No|Txn\s*ID|Ref)[:\s]*([A-Z0-9]{8,15})/i) || text.match(/\b([A-Z]{2}[0-9A-Z]{8,12})\b/);

  // If text is NOT a payment transaction code:
  if (!cbeMatch && !telebirrMatch) {
    const participantId = await dbService.getParticipantId(telegramId);
    if (!participantId) {
      const regPrompt =
        userLang === 'am' ? '⚠️ *ቲኬት ከመቁረጥዎ እና ከመሳተፍዎ በፊት እባክዎ መጀመሪያ ስልክ ቁጥርዎን ያጋሩ 📱*\n\nይህም ቲኬቶችዎን ለመከታተል እና አሸናፊ ሲሆኑ ማሳወቂያ ለመላክ ያገለግላል።' :
        userLang === 'om' ? '⚠️ *Tikkeettii qabachuun dura maaloo lakkoofsa bilbilaa keessan nuuf qoodaa 📱*' :
        '⚠️ *Before reserving tickets, please register your phone number 📱*\n\nThis allows you to track your tickets and receive draw notifications.';

      return ctx.reply(regPrompt, {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          [Markup.button.contactRequest(I18N[userLang].shareContactButton)]
        ]).resize().oneTime()
      });
    }

    // Check if user has an active reservation
    const { data: reservation } = await supabase
      .from('reservations')
      .select(`
        id,
        ticket_number,
        event_id,
        expires_at,
        lottery_events ( title, ticket_price )
      `)
      .eq('participant_id', participantId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (reservation) {
      const ticketNum = reservation.ticket_number;
      const eventTitle = (reservation as any).lottery_events?.title || 'Lottery';
      const expiresAt = new Date(reservation.expires_at).getTime();
      const minsLeft = Math.max(1, Math.round((expiresAt - Date.now()) / (60 * 1000)));

      let pendingNotice = '';
      if (userLang === 'am') {
        pendingNotice = `🎟️ *ለቲኬት #${ticketNum} (${eventTitle}) የተያዘ ክፍት ቦታ አለዎት!*\n` +
          `⏱️ ቀሪ ጊዜ፡ *${minsLeft} ደቂቃ*\n\n` +
          `👉 ክፍያ ከፈጸሙ፣ እባክዎ በ**FT** የሚጀምረውን የትራንዛክሽን ቁጥር ወይም የደረሰኙን ፎቶ እዚህ ይላኩ!\n` +
          `ቦታውን ለመሰረዝ ከታች ያለውን አዝራር ይጫኑ:`;
      } else if (userLang === 'om') {
        pendingNotice = `🎟️ *Tikkeettii #${ticketNum} (${eventTitle}) qabattanii jirtu!*\n` +
          `⏱️ Yeroo hafe: *Daqiiqaa ${minsLeft}*\n\n` +
          `👉 Kaffaltii yoo raawwattan, koodii **FT** ykn suuraa nagahee asitti ergaa!\n` +
          `Haqquuf furtuu armaan gadii tuqaa:`;
      } else {
        pendingNotice = `🎟️ *Active Hold for Ticket #${ticketNum} (${eventTitle})*\n` +
          `⏱️ Time remaining: *${minsLeft} minute(s)*\n\n` +
          `👉 If you completed payment, please paste your **FT...** reference code or photo screenshot here!\n` +
          `Or manage your reservation below:`;
      }

      return ctx.reply(pendingNotice, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: userLang === 'am' ? '❌ ይዞታን ሰርዝ' : userLang === 'om' ? '❌ Haqi' : '❌ Cancel Reservation', callback_data: `cancel_res_${reservation.event_id}_${ticketNum}` }],
            [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
          ]
        }
      });
    }

    // No active reservation - friendly conversational response and immediate interactive buttons
    return ctx.reply(t.unrecognizedMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }],
          [{ text: t.menuMyTickets, callback_data: 'nav_my_tickets' }]
        ]
      }
    });
  }

  const participantId = await dbService.getParticipantId(telegramId);
  if (!participantId) {
    return ctx.reply('⚠️ Please register your account with /start first.');
  }

  // Look up active reservation
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .select(`
      id,
      ticket_number,
      event_id,
      expires_at,
      status,
      lottery_events ( id, title, ticket_price, receiver_account_number, receiver_name, payment_provider )
    `)
    .eq('participant_id', participantId)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (resError || !reservation) {
    return ctx.reply(t.noActiveReservationForReceipt, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
        ]
      }
    });
  }

  const ticketNumber = reservation.ticket_number;
  const event = (reservation as any).lottery_events;
  const isCbe = Boolean(cbeMatch);
  const detectedRef = mbreceiptMatch ? mbreceiptMatch[1] : (cbeFtMatch ? cbeFtMatch[1].toUpperCase() : telebirrMatch![1].toUpperCase());
  const provider = isCbe ? 'CBE' : 'TELEBIRR';

  await ctx.reply(
    `🔍 *Transaction Code Detected:* \`${detectedRef}\` (${provider})\n\n` +
    `⚡ ${t.paymentReceivedVerifying(ticketNumber)}`,
    { parse_mode: 'Markdown' }
  );

  let verificationResult: any = null;
  if (isCbe) {
    verificationResult = await directVerifier.verifyCbe(detectedRef);
  } else {
    verificationResult = await veritasService.verifyTelebirrReference(detectedRef);
  }

  const matchResult = verificationResult ? VeritasService.validateStrictly(verificationResult, {
    ticket_price: event.ticket_price,
    receiver_account_number: event.receiver_account_number,
    receiver_name: event.receiver_name
  }) : { valid: false, reason: 'Verification failed' };

  const paymentRecord = await dbService.submitPaymentReceipt(
    reservation.id,
    null as any,
    provider,
    detectedRef
  );

  if (!paymentRecord || !paymentRecord.payment_id) {
    return ctx.reply('❌ Database error recording payment. Please contact admin support.');
  }

  if (verificationResult?.isSuccess && matchResult.valid) {
    const issueResult = await dbService.verifyAndIssueTicket(
      paymentRecord.payment_id,
      verificationResult.rawResponse || {},
      provider,
      matchResult.detectedRef || detectedRef,
      matchResult.detectedAmount || event.ticket_price,
      matchResult.detectedAccount,
      matchResult.detectedName
    );

    if (issueResult && issueResult.success) {
      const successButtons = [
        [{ text: t.menuMyTickets, callback_data: 'nav_my_tickets' }],
        [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }]
      ];
      return ctx.reply(
        t.ticketIssued(ticketNumber, event.title, matchResult.detectedAmount || event.ticket_price, matchResult.detectedRef || detectedRef),
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: successButtons }
        }
      );
    }
  }

  // If manual review is required:
  const extendedExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase
    .from('reservations')
    .update({ expires_at: extendedExpiresAt, status: 'PAYMENT_SUBMITTED' })
    .eq('id', reservation.id);

  const bankAccount = matchResult.detectedAccount || verificationResult?.receiverAccount || null;
  const bankName = matchResult.detectedName || verificationResult?.receiverName || null;
  const bankAmount = matchResult.detectedAmount !== undefined ? matchResult.detectedAmount : (verificationResult?.amount || null);
  const bankRef = matchResult.detectedRef || verificationResult?.reference || detectedRef || null;

  await supabase
    .from('payments')
    .update({
      status: 'MANUAL_REVIEW',
      rejection_reason: `${matchResult.reason || 'Manual check needed'} (Ref: ${bankRef})`,
      expected_receiver_account: event.receiver_account_number,
      detected_account: bankAccount,
      detected_receiver_account: bankAccount,
      expected_receiver_name: event.receiver_name,
      detected_name: bankName,
      detected_receiver_name: bankName,
      expected_amount: event.ticket_price,
      detected_amount: bankAmount,
      transaction_reference: bankRef,
      veritas_raw_response: verificationResult?.rawResponse || null
    })
    .eq('id', paymentRecord.payment_id);

  return ctx.reply(
    t.paymentQueuedAdmin(ticketNumber, detectedRef),
    { parse_mode: 'Markdown' }
  );
}

/**
 * Handle generic media updates (stickers, voice notes, animations, etc.)
 * NEVER LEAVES THE USER ON SEEN
 */
export async function handleGenericMedia(ctx: Context) {
  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  return ctx.reply(
    t.unrecognizedMessage,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.menuActiveLotteries, callback_data: 'nav_active_lotteries' }],
          [{ text: t.menuMyTickets, callback_data: 'nav_my_tickets' }],
          [{ text: t.menuHelp, callback_data: 'nav_help' }]
        ]
      }
    }
  );
}
