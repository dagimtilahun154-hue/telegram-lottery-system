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

export interface PendingRegistration {
  phone: string;
  language: SupportedLanguage;
}

// In-memory store for users who shared contact and are prompted for their name
export const pendingRegistrations = new Map<number, PendingRegistration>();

/**
 * Handles verified phone contact sharing
 */
export async function handleContact(ctx: Context) {
  const message = ctx.message as any;
  const contact = message?.contact;
  const from = ctx.from;

  if (!contact || !from) return;

  const userLang = await getUserLanguage(ctx);

  let phone = String(contact.phone_number).trim().replace(/[^\d+]/g, '');
  if (!phone.startsWith('+')) {
    if (phone.startsWith('0')) {
      phone = '+251' + phone.substring(1);
    } else if (phone.startsWith('251')) {
      phone = '+' + phone;
    } else {
      phone = '+251' + phone;
    }
  }

  // Save pending contact info awaiting full name
  pendingRegistrations.set(from.id, {
    phone,
    language: userLang
  });

  const promptName = 
    userLang === 'am' 
      ? `📱 *ስልክ ቁጥርዎ (+${phone.replace(/^\+/, '')}) ተረጋግጧል!*\n\n👤 *እባክዎ ሙሉ ስምዎን (የመጀመሪያ እና የአባት ስም) ይጻፉልን፦*\n_(ይህ ስም አሸናፊ ሲሆኑ ቲኬትዎን ለመለየት እና ሽልማትዎን ለመቀበል ያገለግላል)_`
      : userLang === 'om'
      ? `📱 *Lakkoofsi bilbilaa keessan mirkanaa'eera!*\n\n👤 *Maaloo maqaa keessan guutuu (maqaa fi maqaa abbaa) nuuf barreessaa:*\n_(Maqaan kun yeroo mo'attan tikkeettii keessan mirkaneeffachuuf fayyada)_`
      : `📱 *Phone number (+${phone.replace(/^\+/, '')}) verified!*\n\n👤 *Now please enter your full name (First & Last Name):*\n_(This name will be registered to your tickets and used for claiming prizes)_`;

  await ctx.reply(promptName, {
    parse_mode: 'Markdown',
    ...Markup.removeKeyboard()
  });
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
