import { Telegraf } from 'telegraf';
import { CONFIG } from './config.js';
import { handleStart, handleLanguageSelect, handleContact, showMainMenu, getUserLanguage } from './handlers/start.js';
import { handleLotteriesList, handleEventSelection } from './handlers/lotteries.js';
import { 
  handleRangeBrowse, 
  handleReserveTicket, 
  handleRandomTicket,
  handleSelectCbe,
  handleSelectTelebirr,
  handleCancelReservation
} from './handlers/tickets.js';

import http from 'http';
import { handleReceiptPhoto, handleReceiptDocument, handleReceiptText, handleGenericMedia } from './handlers/receipt.js';
import { handleMyTickets } from './handlers/mytickets.js';
import { expirationWorker } from './services/expirationWorker.js';
import { broadcastWorker } from './services/broadcastWorker.js';
import { handleAdminBroadcastCommand, handleAdminChannelPostCommand } from './handlers/broadcast.js';
import { handleResultsWinners } from './handlers/winners.js';
import { I18N } from './i18n.js';

if (!CONFIG.BOT_TOKEN) {
  console.warn('⚠️ WARNING: BOT_TOKEN is not defined in environment variables.');
}

export const bot = new Telegraf(CONFIG.BOT_TOKEN || 'dummy_token');

// ⚡ Real-Time Typing Indicator Middleware (Displays "typing..." instantly)
bot.use(async (ctx, next) => {
  if (ctx.chat?.id) {
    ctx.sendChatAction('typing').catch(() => {});
  }
  return next();
});

// Primary Commands
bot.start(handleStart);
bot.command('menu', (ctx) => showMainMenu(ctx));
bot.command('lotteries', handleLotteriesList);
bot.command('mytickets', handleMyTickets);
bot.command('broadcast', handleAdminBroadcastCommand);
bot.command('post_channel', handleAdminChannelPostCommand);

// Trilingual Language Selection Callbacks
bot.action('lang_en', (ctx) => handleLanguageSelect(ctx, 'en'));
bot.action('lang_am', (ctx) => handleLanguageSelect(ctx, 'am'));
bot.action('lang_om', (ctx) => handleLanguageSelect(ctx, 'om'));

// Verified Contact Sharing Handler
bot.on('contact', handleContact);

// Trilingual Text Menu Button Actions
bot.hears(['🎯 Active Lotteries', '🎯 ንቁ ሎተሪዎች', '🎯 Lootariiwwan Jiranii'], handleLotteriesList);
bot.hears(['🎫 My Tickets', '🎫 የእኔ ቲኬቶች', '🎫 Tikkeettiikoo'], handleMyTickets);

bot.hears(['🌐 Change Language', '🌐 ቋንቋ ቀይር', '🌐 Afaan Jijjiiri'], async (ctx) => {
  return ctx.reply(
    '🌐 *እባክዎ ቋንቋ ይምረጡ / Afaan filadhaa / Select Language:*',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' },
            { text: '🌳 Afaan Oromoo', callback_data: 'lang_om' }
          ],
          [
            { text: '🇺🇸 English', callback_data: 'lang_en' }
          ]
        ]
      }
    }
  );
});

bot.command('results', handleResultsWinners);
bot.command('winners', handleResultsWinners);

bot.hears(['🏆 Results & Winners', '🏆 ውጤቶች እና አሸናፊዎች', "🏆 Bu'aawwan"], handleResultsWinners);

bot.hears(['ℹ️ Help & Support', 'ℹ️ እገዛ እና መረጃ', 'ℹ️ Gargaarsa'], async (ctx) => {
  const userLang = await getUserLanguage(ctx);
  return ctx.reply(I18N[userLang].helpText, { parse_mode: 'Markdown' });
});

// Event and Ticket Navigation Actions
bot.action('nav_active_lotteries', handleLotteriesList);
bot.action('nav_my_tickets', handleMyTickets);
bot.action('nav_help', async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const userLang = await getUserLanguage(ctx);
  return ctx.reply(I18N[userLang].helpText, { parse_mode: 'Markdown' });
});

bot.action(/^ev_select_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  return handleEventSelection(ctx, eventId);
});

bot.action(/^rng_random_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  return handleRandomTicket(ctx, eventId);
});

bot.action(/^rng_(.+)_(.+)_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  const start = parseInt(ctx.match[2], 10);
  const end = parseInt(ctx.match[3], 10);
  return handleRangeBrowse(ctx, eventId, start, end);
});

bot.action(/^reserve_(.+)_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  const ticketNum = parseInt(ctx.match[2], 10);
  return handleReserveTicket(ctx, eventId, ticketNum);
});

bot.action(/^pay_cbe_(.+)_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  const ticketNum = parseInt(ctx.match[2], 10);
  return handleSelectCbe(ctx, eventId, ticketNum);
});

bot.action(/^pay_tb_(.+)_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  const ticketNum = parseInt(ctx.match[2], 10);
  return handleSelectTelebirr(ctx, eventId, ticketNum);
});

bot.action(/^cancel_res_(.+)_(.+)$/, (ctx) => {
  const eventId = ctx.match[1];
  const ticketNum = parseInt(ctx.match[2], 10);
  return handleCancelReservation(ctx, eventId, ticketNum);
});

// Payment receipt listeners (Photos, Document Files, and Reference Text)
bot.on('photo', handleReceiptPhoto);
bot.on('document', handleReceiptDocument);
bot.on('text', handleReceiptText);

// Generic media listener (Stickers, Voice notes, Videos) - NEVER LEAVE ON SEEN!
bot.on(['sticker', 'voice', 'video', 'video_note', 'animation'], handleGenericMedia);

// Error boundary
bot.catch((err, ctx) => {
  console.error(`[Telegraf] Unhandled error for ${ctx.updateType}:`, err);
});

// Lightweight HTTP Healthcheck server for Hugging Face Spaces
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      service: 'Telegram Lottery Engine',
      environment: CONFIG.NODE_ENV,
      port: CONFIG.PORT,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Bootstrap function
export async function startBot() {
  // Start reservation expiration cleanup background worker
  expirationWorker.start();

  // Start Telegram broadcast worker
  broadcastWorker.init(bot);
  broadcastWorker.start();

  // Start HTTP healthcheck server for Render / container health monitor
  server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`🌐 Healthcheck server listening on http://0.0.0.0:${CONFIG.PORT}`);
  });

  if (CONFIG.BOT_TOKEN && CONFIG.BOT_TOKEN !== 'dummy_token') {
    try {
      console.log('🚀 Clearing lingering webhooks & starting Telegram Bot polling...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
      await bot.launch();
      console.log('🤖 Telegram Bot is running successfully and polling.');
    } catch (botErr) {
      console.error('❌ Failed to launch Telegram polling:', botErr);
    }
  } else {
    console.log('ℹ️ Telegram Bot compiled and ready. Provide BOT_TOKEN to launch polling.');
  }

  // Graceful stop
  const shutdown = () => {
    console.log('🛑 Shutting down cleanly...');
    server.close();
    expirationWorker.stop();
    broadcastWorker.stop();
    try {
      bot.stop('SIGTERM');
    } catch (_) {}
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

// Always auto-run when index.js is executed
startBot().catch((err) => {
  console.error('❌ Fatal error during bot startup:', err);
  process.exit(1);
});
