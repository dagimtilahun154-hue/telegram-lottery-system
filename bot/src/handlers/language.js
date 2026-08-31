/**
 * Language switching handler — inline keyboard with 3 language options.
 */
const { getUser, updateUserLanguage } = require('../services/supabase');
const { getLocale, languageInlineKeyboard, registrationKeyboard, mainMenuKeyboard } = require('../keyboards/main');

function registerLanguageHandler(bot) {
  // Detect language menu button press (matches all 3 locale variants)
  bot.hears([/🌐\s*(Language|ቋንቋ|Afaan)/], async (ctx) => {
    await ctx.reply('Choose your language / ቋንቋ ይምረጡ / Afaan filadhaa:', {
      reply_markup: languageInlineKeyboard(),
    });
  });

  // Handle language selection callback
  bot.callbackQuery(/^lang_(am|en|om)$/, async (ctx) => {
    const langCode = ctx.match[1];
    const telegramId = ctx.from.id;

    const user = await getUser(telegramId);

    if (user) {
      // Registered — update language and refresh main menu
      await updateUserLanguage(telegramId, langCode);
      const t = getLocale(langCode);
      await ctx.answerCallbackQuery({ text: t.language_changed });
      await ctx.editMessageText(t.language_changed);
      await ctx.reply(t.already_registered, {
        reply_markup: mainMenuKeyboard(langCode),
      });
    } else {
      // Not registered — just show updated registration keyboard
      const t = getLocale(langCode);
      await ctx.answerCallbackQuery({ text: t.language_changed });
      await ctx.editMessageText(t.language_changed);
      await ctx.reply(t.start + '\n\n' + t.register_prompt, {
        reply_markup: registrationKeyboard(langCode),
      });
    }
  });
}

module.exports = { registerLanguageHandler };
