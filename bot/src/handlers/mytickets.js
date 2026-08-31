/**
 * "My Tickets" handler — shows user's tickets grouped by lottery item.
 */
const { getUser, getUserTickets } = require('../services/supabase');
const { getLocale } = require('../keyboards/main');
const { SPOT_COLORS } = require('../utils/constants');

function registerMyTicketsHandler(bot) {
  bot.hears([/📋\s*(My Tickets|ቲኬቶቼ|Tikeetiiwwan Koo)/], async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await getUser(telegramId);

    if (!user) {
      const t = getLocale('am');
      await ctx.reply(t.errors.not_registered);
      return;
    }

    const t = getLocale(user.language_code);
    const tickets = await getUserTickets(telegramId);

    if (tickets.length === 0) {
      await ctx.reply(t.tickets.none);
      return;
    }

    // Group tickets by lottery item
    const grouped = {};
    for (const ticket of tickets) {
      const itemTitle = ticket.lottery_items?.title || 'Unknown Item';
      if (!grouped[itemTitle]) {
        grouped[itemTitle] = [];
      }
      grouped[itemTitle].push(ticket);
    }

    // Build message
    let message = t.tickets.header;

    for (const [itemTitle, itemTickets] of Object.entries(grouped)) {
      message += t.tickets.item_header.replace('{title}', itemTitle) + '\n';

      for (const ticket of itemTickets) {
        const statusKey = ticket.status;
        const statusText = t.tickets.status[statusKey] || statusKey;
        const emoji = SPOT_COLORS[statusKey] || '⚪';

        message += t.tickets.entry
          .replace('{spot}', ticket.spot_number)
          .replace('{status_emoji}', emoji)
          .replace('{status}', statusText) + '\n';
      }
    }

    await ctx.reply(message);
  });
}

module.exports = { registerMyTicketsHandler };
