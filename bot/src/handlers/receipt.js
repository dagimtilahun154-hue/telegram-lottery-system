/**
 * Receipt photo handler — processes payment screenshots with OCR.
 * Extracts reference numbers from Telebirr/CBE receipts using Tesseract.js.
 */
const { getUser, getUserPendingTickets, updateTicketReceipt, checkDuplicateRef, uploadReceipt } = require('../services/supabase');
const { extractReference } = require('../services/ocr');
const { getLocale } = require('../keyboards/main');

function registerReceiptHandler(bot) {
  // Handle photo messages (receipt screenshots)
  bot.on('message:photo', async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await getUser(telegramId);

    if (!user) {
      const t = getLocale('am');
      await ctx.reply(t.errors.not_registered);
      return;
    }

    const t = getLocale(user.language_code);

    // Check if user has pending tickets
    const pendingTickets = await getUserPendingTickets(telegramId);
    if (pendingTickets.length === 0) {
      await ctx.reply(t.receipt.no_pending);
      return;
    }

    // Send processing message
    await ctx.reply(t.receipt.processing);

    try {
      // Get the highest resolution photo
      const photos = ctx.message.photo;
      const bestPhoto = photos[photos.length - 1];
      const file = await ctx.api.getFile(bestPhoto.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      // Download the image
      const response = await fetch(fileUrl);
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Run OCR to extract reference
      const ocrResult = await extractReference(imageBuffer);

      // Check for duplicate reference
      if (ocrResult.refCode) {
        const isDuplicate = await checkDuplicateRef(ocrResult.refCode);
        if (isDuplicate) {
          await ctx.reply(t.receipt.duplicate_ref);
          return;
        }
      }

      // Upload receipt image to Supabase Storage (temporary)
      const fileName = `${telegramId}_${Date.now()}.jpg`;
      let receiptUrl = null;
      try {
        receiptUrl = await uploadReceipt(fileName, imageBuffer);
      } catch (uploadErr) {
        console.warn('Receipt upload failed:', uploadErr.message);
        // Continue even if upload fails — we still have the OCR data
      }

      // Update all pending tickets with receipt data
      const ticketIds = pendingTickets.map((t) => t.id);
      await updateTicketReceipt(ticketIds, {
        receiptUrl,
        refCode: ocrResult.refCode,
        ocrConfidence: ocrResult.confidence,
        ocrRawText: ocrResult.rawText,
        paymentMethod: ocrResult.paymentMethod,
      });

      // Send confirmation
      if (ocrResult.refCode) {
        await ctx.reply(
          t.receipt.success.replace('{ref}', ocrResult.refCode)
        );
      } else {
        await ctx.reply(t.receipt.ocr_failed);
      }
    } catch (err) {
      console.error('Receipt processing error:', err);
      await ctx.reply(t.errors.generic);
    }
  });
}

module.exports = { registerReceiptHandler };
