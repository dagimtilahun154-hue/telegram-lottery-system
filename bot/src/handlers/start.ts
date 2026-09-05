import { Context, Markup } from 'telegraf';
import { dbService } from '../services/supabase.js';
import { I18N, SupportedLanguage, getLang } from '../i18n.js';

// Fast in-memory language cache (0ms latency lookup)
export const userLanguageCache = new Map<number, SupportedLanguage>();

/**
 * Get the current user's preferred language (Cache -> DB -> Default: 'am')
 */
export async function getUserLanguage(ctx: Context): Promise<SupportedLanguage> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return 'am';

  if (userLanguageCache.has(telegramId)) {
    return userLanguageCache.get(telegramId)!;
  }

  const user = await dbService.getUser(telegramId);
  const lang = getLang(user?.language || 'am');
  userLanguageCache.set(telegramId, lang);
  return lang;
}

/**
 * /start command handler
 * First choice: Language Selection (Amharic, Afaan Oromoo, English)
 */
export async function handleStart(ctx: Context) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const existingUser = await dbService.getUser(telegramId);

  if (existingUser && existingUser.phone_number) {
    const userLang = getLang(existingUser.language);
    userLanguageCache.set(telegramId, userLang);
    return showMainMenu(ctx, userLang);
  }

  // Ask for language preference first (Amharic, Afaan Oromoo, English)
  await ctx.reply(
    `👋 *Welcome to the Official Lottery & Ekup Platform!*\n` +
    `እንኳን ወደ ይፋዊው የሎተሪ እና እቁብ መድረክ በደህና መጡ!\n` +
    `Baga nagaan gara Lootarii fi Iquubii dhuftan!\n\n` +
    `🌐 *እባክዎ ቋንቋዎን ይምረጡ / Filadhaa / Choose Language:*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🇪🇹 አማርኛ', 'lang_am'),
          Markup.button.callback('🌳 Afaan Oromoo', 'lang_om')
        ],
        [
          Markup.button.callback('🇺🇸 English', 'lang_en')
        ]
      ])
    }
  );
}

/**
 * Handles language selection callback ('lang_am' | 'lang_om' | 'lang_en')
 */
export async function handleLanguageSelect(ctx: Context, lang: SupportedLanguage) {
  await ctx.answerCbQuery().catch(() => {});
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  userLanguageCache.set(telegramId, lang);
  await dbService.setUserLanguage(telegramId, lang);

  const t = I18N[lang];

  await ctx.reply(
    t.shareContactPrompt,
    Markup.keyboard([
      [Markup.button.contactRequest(t.shareContactButton)]
    ]).resize().oneTime()
  );
}

/**
 * Handles verified phone contact sharing
 */
export async function handleContact(ctx: Context) {
  const message = ctx.message as any;
  const contact = message?.contact;
  const from = ctx.from;

  if (!contact || !from) return;

  const userLang = await getUserLanguage(ctx);
  const t = I18N[userLang];

  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Participant';
  let phone = contact.phone_number;
  if (!phone.startsWith('+') && !phone.startsWith('0')) {
    phone = '+' + phone;
  }

  // Upsert user and participant with selected language
  await dbService.upsertUser({
    telegramId: from.id,
    username: from.username,
    fullName,
    phoneNumber: phone,
    language: userLang
  });

  await ctx.reply(
    t.regSuccess(fullName),
    Markup.removeKeyboard()
  );

  return showMainMenu(ctx, userLang);
}

/**
 * Displays the dynamic trilingual Main Menu
 */
export async function showMainMenu(ctx: Context, langStr?: string) {
  const telegramId = ctx.from?.id;
  const lang = getLang(langStr || (telegramId ? userLanguageCache.get(telegramId) : undefined));
  const t = I18N[lang];

  await ctx.reply(
    t.mainMenuTitle,
    Markup.keyboard([
      [t.menuActiveLotteries, t.menuMyTickets],
      [t.menuResults, t.menuChangeLanguage],
      [t.menuHelp]
    ]).resize()
  );
}
