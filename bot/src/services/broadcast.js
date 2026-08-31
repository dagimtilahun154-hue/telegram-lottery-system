/**
 * Broadcast service — sends messages to all registered users or the public channel.
 */
const { getAllUsers, logBroadcast } = require('./supabase');

/**
 * Send a text message (with optional photo) to all registered users.
 * @param {import('grammy').Bot} bot
 * @param {object} options
 * @param {string} options.text - Message text
 * @param {string} [options.photoUrl] - Optional photo URL
 * @param {string} [options.buttonText] - Optional inline button text
 * @param {string} [options.buttonUrl] - Optional inline button URL
 * @param {string} [options.messageType] - Broadcast type for logging
 * @param {string} [options.itemId] - Related lottery item ID
 * @param {number} [options.createdBy] - Admin telegram ID
 * @returns {Promise<number>} Number of users successfully reached
 */
async function broadcastToAll(bot, options) {
  const { text, photoUrl, buttonText, buttonUrl, messageType, itemId, createdBy } = options;
  const users = await getAllUsers();
  let sentCount = 0;

  const inlineKeyboard = buttonText && buttonUrl
    ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
    : undefined;

  for (const user of users) {
    try {
      if (photoUrl) {
        await bot.api.sendPhoto(user.telegram_id, photoUrl, {
          caption: text,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
      } else {
        await bot.api.sendMessage(user.telegram_id, text, {
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        });
      }
      sentCount++;
    } catch (err) {
      // User may have blocked the bot — skip silently
      console.warn(`Failed to send to ${user.telegram_id}: ${err.message}`);
    }

    // Rate limiting: Telegram allows ~30 messages/second
    if (sentCount % 25 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Log the broadcast
  if (messageType) {
    await logBroadcast({
      itemId,
      messageType,
      textContent: text,
      mediaUrl: photoUrl,
      mediaType: photoUrl ? 'PHOTO' : 'NONE',
      buttonText,
      buttonUrl,
      sentCount,
      createdBy,
    });
  }

  return sentCount;
}

/**
 * Post a message to the public Telegram channel.
 */
async function postToChannel(bot, { text, photoUrl, buttonText, buttonUrl }) {
  const channelId = process.env.CHANNEL_ID;
  if (!channelId) return null;

  const inlineKeyboard = buttonText && buttonUrl
    ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
    : undefined;

  try {
    let message;
    if (photoUrl) {
      message = await bot.api.sendPhoto(channelId, photoUrl, {
        caption: text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      });
    } else {
      message = await bot.api.sendMessage(channelId, text, {
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
      });
    }
    return message.message_id;
  } catch (err) {
    console.error('Failed to post to channel:', err.message);
    return null;
  }
}

module.exports = { broadcastToAll, postToChannel };
