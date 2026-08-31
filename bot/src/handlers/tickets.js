/**
 * Text-based ticket purchase handler.
 * Users select a lottery item, then type spot numbers or "random N".
 */
const { getUser, getActiveItems, getItemById, getActiveRound, getAvailableSpots, reserveSpots, getUserPendingTickets } = require('../services/supabase');
const { getLocale, mainMenuKeyboard } = require('../keyboards/main');
const { parseSpotInput, formatPrice, generatePaymentRef } = require('../utils/helpers');

// In-memory session state for tracking which item a user is buying for
const userSessions = new Map();

function registerTicketsHandler(bot) {
  // "Buy Ticket" button press
  bot.hears([/🎟️\s*(Buy Ticket|ቲኬት ይግዙ|Tikeetii Bitaa)/], async (ctx) => {
    const telegramId = ctx.from.id;
    const user = await getUser(telegramId);

    if (!user) {
      const t = getLocale('am');
      await ctx.reply(t.errors.not_registered);
      return;
    }

    const t = getLocale(user.language_code);

    // Check for existing pending reservations
    const pending = await getUserPendingTickets(telegramId);
    if (pending.length > 0) {
      await ctx.reply(t.reservation.pending);
      return;
    }

    // Get active lottery items
    const items = await getActiveItems();
    if (items.length === 0) {
      await ctx.reply(t.items.none_active);
      return;
    }

    // Show item selection as inline buttons
    const buttons = items.map((item) => ([{
      text: `🎁 ${item.title} — ${formatPrice(item.ticket_price)}`,
      callback_data: `buy_item_${item.id}`,
    }]));

    await ctx.reply(t.items.select, {
      reply_markup: { inline_keyboard: buttons },
    });
  });

  // Handle item selection callback
  bot.callbackQuery(/^buy_item_(.+)$/, async (ctx) => {
    const itemId = ctx.match[1];
    const telegramId = ctx.from.id;
    const user = await getUser(telegramId);
    const t = getLocale(user?.language_code);

    const item = await getItemById(itemId);
    if (!item) {
      await ctx.answerCallbackQuery({ text: 'Item not found' });
      return;
    }

    const round = await getActiveRound(itemId);
    if (!round) {
      await ctx.answerCallbackQuery({ text: 'No active round' });
      return;
    }

    const available = await getAvailableSpots(round.id);

    // Store session: user is now buying for this item/round
    userSessions.set(telegramId, {
      itemId: item.id,
      roundId: round.id,
      itemTitle: item.title,
      ticketPrice: item.ticket_price,
      totalSpots: item.total_spots,
      awaitingSpots: true,
    });

    const message = t.items.details
      .replace('{title}', item.title)
      .replace('{price}', formatPrice(item.ticket_price))
      .replace('{available}', available.length.toString())
      .replace('{total}', item.total_spots.toString())
      .replace('{end_date}', new Date(item.end_date).toLocaleDateString('en-GB'));

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message);
  });

  // Handle text input for spot numbers (when user is in a buy session)
  bot.on('message:text', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = userSessions.get(telegramId);

    // Skip if user isn't in a buy session
    if (!session || !session.awaitingSpots) {
      return next();
    }

    const user = await getUser(telegramId);
    const t = getLocale(user?.language_code);

    const input = parseSpotInput(ctx.message.text);

    if (input.type === 'invalid') {
      await ctx.reply(t.items.invalid_input);
      return;
    }

    let spotNumbers;

    if (input.type === 'random') {
      // Get random available spots
      const available = await getAvailableSpots(session.roundId);
      if (available.length < input.count) {
        await ctx.reply(`Only ${available.length} spots available. Try a smaller number.`);
        return;
      }
      // Shuffle and pick N
      const shuffled = available.sort(() => Math.random() - 0.5);
      spotNumbers = shuffled.slice(0, input.count);
    } else {
      spotNumbers = input.numbers;

      // Validate range
      const outOfRange = spotNumbers.filter((n) => n < 1 || n > session.totalSpots);
      if (outOfRange.length > 0) {
        await ctx.reply(t.items.spots_out_of_range.replace('{max}', session.totalSpots.toString()));
        return;
      }

      // Check availability
      const available = await getAvailableSpots(session.roundId);
      const taken = spotNumbers.filter((n) => !available.includes(n));
      if (taken.length > 0) {
        await ctx.reply(t.items.spots_taken.replace('{spots}', taken.join(', ')));
        return;
      }
    }

    // Reserve the spots
    const paymentRef = generatePaymentRef();
    const reserved = await reserveSpots(session.roundId, session.itemId, telegramId, spotNumbers, paymentRef);

    if (!reserved) {
      await ctx.reply(t.items.spots_taken.replace('{spots}', 'some selected spots'));
      return;
    }

    // Clear session
    userSessions.delete(telegramId);

    const totalPrice = session.ticketPrice * spotNumbers.length;
    const message = t.reservation.success
      .replace('{spots}', spotNumbers.sort((a, b) => a - b).join(', '))
      .replace('{total}', formatPrice(totalPrice))
      .replace(/{ref}/g, paymentRef);

    await ctx.reply(message, {
      reply_markup: mainMenuKeyboard(user?.language_code),
    });
  });
}

// Export session map for receipt handler to access
module.exports = { registerTicketsHandler, userSessions };
