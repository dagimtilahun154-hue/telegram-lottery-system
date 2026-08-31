/**
 * Reply keyboard definitions for the Telegram bot.
 * Two states: pre-registration and post-registration.
 */
const { Keyboard } = require('grammy');

/**
 * Get locale strings based on language code
 */
function getLocale(langCode) {
  try {
    return require(`../locales/${langCode || 'am'}.json`);
  } catch {
    return require('../locales/en.json');
  }
}

/**
 * Pre-registration keyboard: only Register + Language
 */
function registrationKeyboard(langCode) {
  const t = getLocale(langCode);
  return new Keyboard()
    .requestContact(t.menu.register)
    .row()
    .text(t.menu.language)
    .resized()
    .persistent();
}

/**
 * Post-registration main menu keyboard
 */
function mainMenuKeyboard(langCode) {
  const t = getLocale(langCode);
  const webAppUrl = process.env.MINI_APP_URL || 'https://mini-app-ten-orpin.vercel.app';
  return new Keyboard()
    .webApp('📲 Open App UI', webAppUrl)
    .row()
    .text(t.menu.buy_ticket)
    .text(t.menu.my_tickets)
    .row()
    .text(t.menu.draws)
    .text(t.menu.language)
    .row()
    .text(t.menu.support)
    .resized()
    .persistent();
}

/**
 * Language selection inline keyboard
 */
function languageInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' },
        { text: '🇬🇧 English', callback_data: 'lang_en' },
        { text: 'Oromoo', callback_data: 'lang_om' },
      ],
    ],
  };
}

module.exports = {
  getLocale,
  registrationKeyboard,
  mainMenuKeyboard,
  languageInlineKeyboard,
};
