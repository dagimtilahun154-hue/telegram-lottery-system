/**
 * Supabase client initialization and database operations.
 */
const { createClient } = require('@supabase/supabase-js');
const { TICKET_STATUS, ITEM_STATUS, ROUND_STATUS, LOCK_DURATION_MS, RECEIPT_RETENTION_MS } = require('../utils/constants');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── USER OPERATIONS ──────────────────────────────────────────

async function getUser(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

async function createUser({ telegramId, firstName, lastName, username, phoneNumber, languageCode }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      first_name: firstName,
      last_name: lastName,
      username: username,
      phone_number: phoneNumber,
      language_code: languageCode || 'am',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateUserLanguage(telegramId, languageCode) {
  const { error } = await supabase
    .from('users')
    .update({ language_code: languageCode })
    .eq('telegram_id', telegramId);
  if (error) throw error;
}

async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('telegram_id, language_code');
  if (error) throw error;
  return data || [];
}

// ── LOTTERY ITEM OPERATIONS ─────────────────────────────────

async function getActiveItems() {
  const { data, error } = await supabase
    .from('lottery_items')
    .select('*')
    .eq('status', ITEM_STATUS.ACTIVE)
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getItemById(itemId) {
  const { data, error } = await supabase
    .from('lottery_items')
    .select('*')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return data;
}

// ── ROUND OPERATIONS ────────────────────────────────────────

async function getActiveRound(itemId) {
  const { data, error } = await supabase
    .from('lottery_rounds')
    .select('*')
    .eq('item_id', itemId)
    .in('status', [ROUND_STATUS.OPEN, ROUND_STATUS.LOCKED])
    .order('round_number', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ── TICKET OPERATIONS ───────────────────────────────────────

async function getAvailableSpots(roundId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('spot_number')
    .eq('round_id', roundId)
    .eq('status', TICKET_STATUS.AVAILABLE);
  if (error) throw error;
  return (data || []).map((t) => t.spot_number);
}

async function getSpotStatuses(roundId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('spot_number, status, user_id')
    .eq('round_id', roundId);
  if (error) throw error;
  return data || [];
}

async function getSoldCount(roundId) {
  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundId)
    .eq('status', TICKET_STATUS.CONFIRMED);
  if (error) throw error;
  return count || 0;
}

async function reserveSpots(roundId, itemId, userId, spotNumbers, paymentRef) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

  // Use a transaction-like approach: update all spots atomically
  const { data, error } = await supabase
    .from('tickets')
    .update({
      user_id: userId,
      status: TICKET_STATUS.PENDING_PAYMENT,
      reserved_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      payment_ref_code: paymentRef,
    })
    .eq('round_id', roundId)
    .eq('status', TICKET_STATUS.AVAILABLE)
    .in('spot_number', spotNumbers)
    .select();

  if (error) throw error;

  // Check if all requested spots were actually reserved
  if (!data || data.length !== spotNumbers.length) {
    // Rollback: release any spots that were partially reserved
    if (data && data.length > 0) {
      await supabase
        .from('tickets')
        .update({
          user_id: null,
          status: TICKET_STATUS.AVAILABLE,
          reserved_at: null,
          expires_at: null,
          payment_ref_code: null,
        })
        .eq('round_id', roundId)
        .eq('user_id', userId)
        .eq('status', TICKET_STATUS.PENDING_PAYMENT)
        .in('spot_number', data.map((t) => t.spot_number));
    }
    return null; // Indicates some spots were taken
  }

  return data;
}

async function getUserPendingTickets(userId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, lottery_items(title, ticket_price), lottery_rounds(round_number)')
    .eq('user_id', userId)
    .eq('status', TICKET_STATUS.PENDING_PAYMENT)
    .gt('expires_at', new Date().toISOString());
  if (error) throw error;
  return data || [];
}

async function getUserTickets(userId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, lottery_items(title, ticket_price)')
    .eq('user_id', userId)
    .in('status', [TICKET_STATUS.PENDING_PAYMENT, TICKET_STATUS.CONFIRMED])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateTicketReceipt(ticketIds, { receiptUrl, refCode, ocrConfidence, ocrRawText, paymentMethod }) {
  const receiptExpiresAt = new Date(Date.now() + RECEIPT_RETENTION_MS);

  const { error } = await supabase
    .from('tickets')
    .update({
      receipt_image_url: receiptUrl,
      payment_ref_code: refCode,
      ocr_confidence: ocrConfidence,
      ocr_raw_text: ocrRawText,
      payment_method: paymentMethod,
      receipt_expires_at: receiptExpiresAt.toISOString(),
    })
    .in('id', ticketIds);
  if (error) throw error;
}

async function checkDuplicateRef(refCode) {
  if (!refCode) return false;
  const { data, error } = await supabase
    .from('tickets')
    .select('id')
    .eq('payment_ref_code', refCode)
    .eq('status', TICKET_STATUS.CONFIRMED)
    .limit(1);
  if (error) throw error;
  return data && data.length > 0;
}

// ── BROADCAST OPERATIONS ────────────────────────────────────

async function logBroadcast({ itemId, messageType, textContent, mediaUrl, mediaType, buttonText, buttonUrl, sentCount, createdBy }) {
  const { error } = await supabase
    .from('broadcast_logs')
    .insert({
      item_id: itemId,
      message_type: messageType,
      text_content: textContent,
      media_url: mediaUrl,
      media_type: mediaType || 'NONE',
      button_text: buttonText,
      button_url: buttonUrl,
      sent_count: sentCount,
      created_by: createdBy,
    });
  if (error) throw error;
}

// ── STORAGE OPERATIONS ──────────────────────────────────────

async function uploadReceipt(fileName, fileBuffer) {
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path);
  return urlData.publicUrl;
}

module.exports = {
  supabase,
  getUser,
  createUser,
  updateUserLanguage,
  getAllUsers,
  getActiveItems,
  getItemById,
  getActiveRound,
  getAvailableSpots,
  getSpotStatuses,
  getSoldCount,
  reserveSpots,
  getUserPendingTickets,
  getUserTickets,
  updateTicketReceipt,
  checkDuplicateRef,
  logBroadcast,
  uploadReceipt,
};
