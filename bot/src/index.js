/**
 * Telegram Lottery Bot — Entry Point
 * Wires all handlers and starts the bot.
 */
require('dotenv').config();

// 1. ALWAYS start HTTP health check server FIRST for Render.com Web Service
const http = require('http');
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Diktyo Telegram Lottery Bot is running 24/7!\n');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Health check HTTP server listening on 0.0.0.0:${PORT}`);
});

const { Bot } = require('grammy');

// Validate env vars with warning instead of crash
const requiredEnv = ['BOT_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`⚠️ Warning: Missing environment variable ${key}. Please set it in Render Environment settings.`);
  }
}

const botToken = process.env.BOT_TOKEN || '7576469313:AAHVDZtfliFmBPEKnl8LP7pFYRSx5H5JdxU';
const bot = new Bot(botToken);

// Import handlers
const { registerStartHandler } = require('./handlers/start');
const { registerRegistrationHandler } = require('./handlers/register');
const { registerLanguageHandler } = require('./handlers/language');
const { registerTicketsHandler } = require('./handlers/tickets');
const { registerMyTicketsHandler } = require('./handlers/mytickets');
const { registerDrawsHandler } = require('./handlers/draws');
const { registerReceiptHandler } = require('./handlers/receipt');

// Global error handler
bot.catch((err) => {
  const rawErr = err.error || err;
  const msg = typeof rawErr === 'object' ? (rawErr.message || JSON.stringify(rawErr)) : String(rawErr);
  console.error('Bot error:', msg);
});

// Register all handlers (order matters — more specific first)
registerStartHandler(bot);
registerRegistrationHandler(bot);
registerLanguageHandler(bot);
registerReceiptHandler(bot);       // Photo handler before text handler
registerTicketsHandler(bot);       // Text handler includes message:text fallthrough
registerMyTicketsHandler(bot);
registerDrawsHandler(bot);

// Handle support button
bot.hears([/❓\s*(Support|ድጋፍ|Gargaarsa)/], async (ctx) => {
  await ctx.reply(
    '📞 For support, contact our admin.\n' +
    '📧 Or send a message describing your issue and we\'ll get back to you.'
  );
});

// Start the bot
async function start() {
  console.log('🤖 Lottery Bot starting...');

  // Delete any existing webhook (in case switching from webhook to polling)
  try {
    await bot.api.deleteWebhook();
  } catch (err) {
    console.warn('⚠️ Webhook check skipped:', err.message);
  }

  // Start polling
  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
      console.log(`📊 Handlers loaded: start, register, language, tickets, mytickets, draws, receipt`);
    },
  });
}

start().catch((err) => {
  console.error('Failed to start bot:', err.message || err);
});
