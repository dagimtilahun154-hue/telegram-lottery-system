/**
 * Registration handler — captures phone number via Telegram's native contact share.
 */
const { getUser, createUser } = require('../services/supabase');
const { getLocale, mainMenuKeyboard } = require('../keyboards/main');

function registerRegistrationHandler(bot) {
  // Handle contact (phone number) share
  bot.on('message:contact', async (ctx) => {
    const contact = ctx.message.contact;
    const telegramId = ctx.from.id;

    // Security: only accept contact if it belongs to the sender
    if (contact.user_id !== telegramId) {
      const t = getLocale('am');
      await ctx.reply('⚠️ Please share your own phone number.');
      return;
    }

    // Check if already registered
    const existing = await getUser(telegramId);
    if (existing) {
      const t = getLocale(existing.language_code);
      await ctx.reply(t.already_registered, {
        reply_markup: mainMenuKeyboard(existing.language_code),
      });
      return;
    }

    // Register the user
    try {
      const user = await createUser({
        telegramId,
        firstName: contact.first_name || ctx.from.first_name,
        lastName: contact.last_name || ctx.from.last_name,
        username: ctx.from.username,
        phoneNumber: contact.phone_number,
        languageCode: 'am', // Default to Amharic
      });

      const t = getLocale(user.language_code);
      const name = user.first_name || 'there';
      await ctx.reply(t.register_success.replace('{name}', name), {
        reply_markup: mainMenuKeyboard(user.language_code),
      });
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === '23505') {
        // Unique constraint violation — phone already used
        await ctx.reply('⚠️ This phone number is already registered with another account.');
      } else {
        const t = getLocale('am');
        await ctx.reply(t.errors.generic);
      }
    }
  });
}

module.exports = { registerRegistrationHandler };
