import { Context, Markup } from 'telegraf';
import { broadcastWorker } from '../services/broadcastWorker.js';

export async function handleAdminBroadcastCommand(ctx: Context) {
  const text = (ctx.message as any)?.text || '';
  // Command format: /broadcast [Title] | [Message]
  const parts = text.replace('/broadcast', '').trim().split('|');

  if (parts.length < 2) {
    return ctx.reply(
      'ℹ️ *How to Broadcast via Bot:*\n\n' +
      'Format: `/broadcast Title | Message text`\n\n' +
      'Example: `/broadcast 50% Sold Out! | Grab your lucky ticket before countdown expires!`\n\n' +
      '_Tip: You can also use the Admin Web Dashboard to upload photos and add CTA action buttons!_',
      { parse_mode: 'Markdown' }
    );
  }

  const title = parts[0].trim();
  const message = parts.slice(1).join('|').trim();

  await ctx.reply('⏳ Queueing broadcast for dispatch...');

  try {
    await broadcastWorker.processBroadcast({
      id: `bc-bot-${Date.now()}`,
      title,
      message_text: message,
      status: 'SENDING',
      total_recipients: 0,
      successful_deliveries: 0,
      failed_deliveries: 0
    });

    await ctx.reply('✅ Broadcast dispatch successfully initiated to all active users and channels!');
  } catch (err: any) {
    await ctx.reply(`❌ Failed to dispatch broadcast: ${err.message}`);
  }
}

export async function handleAdminChannelPostCommand(ctx: Context) {
  const text = (ctx.message as any)?.text || '';
  // Format: /post_channel @channel | [Text]
  const args = text.replace('/post_channel', '').trim().split('|');

  if (args.length < 2) {
    return ctx.reply(
      'ℹ️ *How to Post to Channel:*\n\n' +
      'Format: `/post_channel @channel_handle | Announcement text`\n\n' +
      'Example: `/post_channel @MyLotteryChannel | Grand draw is tonight at 8:00 PM!`\n\n' +
      '_Note: Ensure the bot is an Admin with Post Messages permission in the channel._',
      { parse_mode: 'Markdown' }
    );
  }

  const channel = args[0].trim();
  const content = args.slice(1).join('|').trim();

  try {
    await ctx.telegram.sendMessage(channel, content, {
      parse_mode: 'HTML'
    });
    await ctx.reply(`✅ Successfully posted announcement to ${channel}!`);
  } catch (err: any) {
    await ctx.reply(`❌ Could not post to ${channel}: ${err.message}\n(Make sure bot is an Administrator in the channel!)`);
  }
}
