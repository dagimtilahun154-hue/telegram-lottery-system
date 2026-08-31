/**
 * Active Draws handler — shows all active lottery items with draw info.
 */
const { getUser, getActiveItems, getActiveRound, getSoldCount } = require('../services/supabase');
const { getLocale } = require('../keyboards/main');
const { formatPrice, formatDate, timeRemaining } = require('../utils/helpers');

function registerDrawsHandler(bot) {
  bot.hears([/📅\s*(Active Draws|ንቁ ዕጣዎች|Eebba Hojii irra jiran|Draws)/], async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await getUser(telegramId);

    if (!user) {
      const t = getLocale('am');
      await ctx.reply(t.errors.not_registered);
      return;
    }

    const t = getLocale(user.language_code);
    const items = await getActiveItems();

    if (items.length === 0) {
      await ctx.reply(t.draws.none);
      return;
    }

    let message = t.draws.header;

    for (const item of items) {
      const round = await getActiveRound(item.id);
      const sold = round ? await getSoldCount(round.id) : 0;
      const drawDate = round?.draw_date || item.end_date;

      message += t.draws.entry
        .replace('{title}', item.title)
        .replace('{price}', formatPrice(item.ticket_price))
        .replace('{sold}', sold.toString())
        .replace('{total}', item.total_spots.toString())
        .replace('{draw_date}', formatDate(drawDate))
        .replace('{time_left}', timeRemaining(drawDate));
    }

    await ctx.reply(message);
  });
}

module.exports = { registerDrawsHandler };
