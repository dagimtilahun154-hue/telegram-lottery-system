/**
 * /start command handler — the gatekeeper.
 * Checks if user is registered; shows appropriate keyboard.
 */
const { getUser } = require('../services/supabase');
const { getLocale, registrationKeyboard, mainMenuKeyboard } = require('../keyboards/main');

function registerStartHandler(bot) {
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await getUser(telegramId);

    if (user) {
      // Registered user — show full menu
      const t = getLocale(user.language_code);
      await ctx.reply(t.already_registered, {
        reply_markup: mainMenuKeyboard(user.language_code),
      });
    } else {
      // Unregistered — show only Register + Language
      const t = getLocale('am'); // Default to Amharic
      await ctx.reply(t.start + '\n\n' + t.register_prompt, {
        reply_markup: registrationKeyboard('am'),
      });
    }
  });
}

module.exports = { registerStartHandler };
