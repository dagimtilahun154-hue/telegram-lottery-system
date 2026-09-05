export type SupportedLanguage = 'en' | 'am' | 'om';

export interface Translations {
  welcome: string;
  selectLanguage: string;
  shareContactPrompt: string;
  shareContactButton: string;
  regSuccess: (name: string) => string;
  mainMenuTitle: string;
  menuActiveLotteries: string;
  menuMyTickets: string;
  menuResults: string;
  menuChangeLanguage: string;
  menuHelp: string;
  noActiveLotteries: string;
  activeLotteriesTitle: string;
  selectEventPrompt: string;
  pricePerTicket: string;
  ticketsPool: string;
  drawDate: string;
  paymentInstructions: string;
  cbeTitle: string;
  telebirrTitle: string;
  howToPayCbe: (price: number) => string;
  howToPayTelebirr: (price: number) => string;
  pasteReferenceHint: string;
  reservedSuccess: (num: number, title: string, price: number) => string;
  activeReservationExists: string;
  ticketUnavailable: (num: number) => string;
  reservationExpired: (num: number) => string;
  reservationCancelled: (num: number) => string;
  paymentReceivedVerifying: (num: number) => string;
  ticketIssued: (num: number, title: string, amount: number, ref: string) => string;
  paymentQueuedAdmin: (num: number, ref: string) => string;
  noActiveReservationForReceipt: string;
  receiptImageExtracted: string;
  helpText: string;
  resultsPending: string;
  generalHelpPrompt: string;
  unrecognizedMessage: string;
}

export const I18N: Record<SupportedLanguage, Translations> = {
  am: {
    welcome: '👋 እንኳን ወደ ይፋዊው የሎተሪ መድረክ በደህና መጡ!\nየሚፈልጉትን ቋንቋ ይምረጡ:',
    selectLanguage: '🌐 እባክዎ ቋንቋዎን ይምረጡ:',
    shareContactPrompt: '📱 ምዝገባዎን ለማጠናቀቅ፣ እባክዎ ከታች ያለውን አዝራር በመጫን ስልክ ቁጥርዎን ያጋሩ:',
    shareContactButton: '📲 ስልክ ቁጥር አጋራ',
    regSuccess: (name: string) => `✅ ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል፣ ${name}!\n\nአሁን ንቁ ሎተሪዎችን ማየት፣ ቲኬት መቁረጥ እና ሁኔታቸውን መከታተል ይችላሉ።`,
    mainMenuTitle: '🎯 ዋና ማውጫ\nእባክዎ አንዱን አማራጭ ይምረጡ:',
    menuActiveLotteries: '🎯 ንቁ ሎተሪዎች',
    menuMyTickets: '🎫 የእኔ ቲኬቶች',
    menuResults: '🏆 ውጤቶች እና አሸናፊዎች',
    menuChangeLanguage: '🌐 ቋንቋ ቀይር',
    menuHelp: 'ℹ️ እገዛ እና መረጃ',
    noActiveLotteries: 'ℹ️ በአሁኑ ሰዓት ክፍት የሆኑ የሎተሪ ውድድሮች የሉም። እባክዎ ጥቂት ቆይተው እንደገና ይመልከቱ!',
    activeLotteriesTitle: '🎯 *በአሁኑ ሰዓት ንቁ የሆኑ የሎተሪ ውድድሮች*\n\nዋጋቸውን እና የክፍያ መመሪያዎችን ለማየት አንዱን ይምረጡ:',
    selectEventPrompt: 'የዕድል ቁጥርዎን ለመምረጥ ከታች ካሉት አዝራሮች አንዱን ይጫኑ:',
    pricePerTicket: 'የቲኬት ዋጋ',
    ticketsPool: 'አጠቃላይ የቲኬት ብዛት',
    drawDate: 'የዕጣ ማውጫ ቀን',
    paymentInstructions: 'የክፍያ መመሪያ',
    cbeTitle: '🏦 በኢትዮጵያ ንግድ ባንክ (CBE) ለመክፈል',
    telebirrTitle: '📱 በቴሌብር (Telebirr) ለመክፈል',
    howToPayCbe: (price: number) => `ወደ ላይኛው የባንክ ሂሳብ ቁጥር በትክክል *${price} ብር* ያስተላልፉና በ**FT** የሚጀምረውን የትራንዛክሽን ቁጥር ወይም የደረሰኙን ፎቶ እዚህ ይላኩ!`,
    howToPayTelebirr: (price: number) => `ወደ ላይኛው የቴሌብር ቁጥር በትክክል *${price} ብር* ያስተላልፉና የትራንዛክሽን ቁጥሩን ወይም የደረሰኙን ፎቶ እዚህ ይላኩ!`,
    pasteReferenceHint: '💡 _ማሳሰቢያ፡ የደረሰኝ ፎቶ ወይም የትራንዛክሽን ቁጥር በፅሁፍ መላክ ይችላሉ!_',
    reservedSuccess: (num: number, title: string, price: number) => `🎟️ *ቲኬት #${num} ተይዞልዎታል!*\n\n• ውድድር፡ *${title}*\n• ዋጋ፡ *${price} ብር*\n• የጊዜ ገደብ፡ *15 ደቂቃ*\n\nእባክዎ የመክፈያ ዘዴዎን ይምረጡ:`,
    activeReservationExists: '⚠️ *ይቅርታ፣ ያልተከፈለ ቲኬት አለዎት!*\nበአንድ ጊዜ አንድ ቲኬት ብቻ መቁረጥ ይቻላል። እባክዎ ክፍያውን ያጠናቅቁ ወይም የ15 ደቂቃው ጊዜ እስኪያበቃ ይጠብቁ።',
    ticketUnavailable: (num: number) => `❌ ቲኬት #${num} በሌላ ተሳታፊ ተወስዷል። እባክዎ ሌላ ቁጥር ይምረጡ።`,
    reservationExpired: (num: number) => `⏱️ የቲኬት #${num} የ15 ደቂቃ የቆይታ ጊዜ አብቅቷል።`,
    reservationCancelled: (num: number) => `✅ የቲኬት #${num} ቦታ ይዞታ ተሰርዟል። አዲስ ቁጥር መምረጥ ይችላሉ።`,
    paymentReceivedVerifying: (num: number) => `🔍 *ለቲኬት #${num} ክፍያ ደርሶናል!*\nእየተረጋገጠ ነው፣ እባክዎ ጥቂት ሰከንዶች ይጠብቁ...`,
    ticketIssued: (num: number, title: string, amount: number, ref: string) => `🎉 *ክፍያዎ ተረጋግጧል! ቲኬትዎ ፀድቋል!*\n\n• ውድድር፡ *${title}*\n• የቲኬት ቁጥር፡ *#${num}*\n• የተከፈለው መጠን፡ *${amount} ብር*\n• የደረሰኝ ቁጥር፡ \`${ref}\`\n\n✅ ቲኬትዎ በይፋዊው የዕጣ ማውጫ ገብቷል! መልካም ዕድል! 🍀`,
    paymentQueuedAdmin: (num: number, ref: string) => `⏳ *ክፍያዎ ደርሶናል — ለአስተዳዳሪ ማረጋገጫ ተልኳል*\n\n• የቲኬት ቁጥር፡ *#${num}*\n• ቁጥር፡ \`${ref}\`\n\n⏱️ ቦታዎ እንዳይወሰድ የ30 ደቂቃ ተጨማሪ ጊዜ ተሰጥቶታል። አስተዳዳሪው በአጭር ጊዜ ውስጥ ያረጋግጥልዎታል።`,
    noActiveReservationForReceipt: '⚠️ በአሁኑ ሰዓት የተያዘ ክፍት ቲኬት የለዎትም።\n\nደረሰኝ ከመላክዎ በፊት እባክዎ መጀመሪያ ቲኬት ይቁረጡ።',
    receiptImageExtracted: '🤖 የደረሰኝ ፎቶዎን በአስተማማኝ ሁኔታ መርምረናል...',
    helpText: 'ℹ️ *የደንበኞች መረጃ እና መመሪያ*\n\n1. እያንዳንዱ ተሳታፊ በአንድ ጊዜ 1 ቲኬት ብቻ መቁረጥ ይችላል።\n2. ክፍያ ለመፈፀም እና ደረሰኝ ለመላክ 15 ደቂቃ ይሰጥዎታል።\n3. ክፍያዎች ወዲያውኑ በባንክ / ቴሌብር ሲስተም ይረጋገጣሉ።\n4. ለተጨማሪ መረጃ አስተዳዳሪውን ያነጋግሩ።',
    resultsPending: '🏆 የዕጣ ማውጫ ውጤቶች ውድድሩ እንደተጠናቀቀ እዚህ ይፋ ይደረጋሉ።',
    generalHelpPrompt: 'እንዴት ልንረዳዎ እንችላለን? ከታች ካሉት አማራጮች አንዱን ይጫኑ:',
    unrecognizedMessage: '👋 ሰላም! መልእክትዎ ደርሶናል።\n\nየክፍያ ደረሰኝ ወይም FT ቁጥር ካለዎት እዚህ ይላኩ፣ ወይም ቲኬት ለመቁረጥ ዋናውን ማውጫ ይጠቀሙ:'
  },
  om: {
    welcome: '👋 Baga nagaan gara Lootarii Mootummaa dhuftan!\nAfaan barbaaddan filadhaa:',
    selectLanguage: '🌐 Maaloo afaan keessan filadhaa:',
    shareContactPrompt: '📱 Galmee xumuruuf, furtuu armaan gadii tuquun lakkoofsa bilbilaa keessan nuuf qoodaa:',
    shareContactButton: '📲 Lakkoofsa Bilbilaa Qoodi',
    regSuccess: (name: string) => `✅ Galmeen keessan milkaa'eera, ${name}!\n\nAmma lootarii jiran ilaaluu, lakkoofsa carraa keessan qabachuu fi hordofuu dandeessu.`,
    mainMenuTitle: '🎯 Baafata Guddaa\nMaaloo filannoowwan armaan gadii keessaa filadhaa:',
    menuActiveLotteries: '🎯 Lootariiwwan Jiranii',
    menuMyTickets: '🎫 Tikkeettiikoo',
    menuResults: '🏆 Bu\'aawwan',
    menuChangeLanguage: '🌐 Afaan Jijjiiri',
    menuHelp: 'ℹ️ Gargaarsa',
    noActiveLotteries: 'ℹ️ Yeroo ammaa lootariin banaa ta\'e hin jiru. Maaloo yeroo gabaabaa booda deebi\'aa ilaalaa!',
    activeLotteriesTitle: '🎯 *Lootariiwwan Amma Banaa Ta\'an*\n\nGatii fi qajeelfama kaffaltii ilaaluuf isa tokko filadhaa:',
    selectEventPrompt: 'Lakkoofsa carraa keessan filachuuf furtuu armaan gadii tuqaa:',
    pricePerTicket: 'Gatii Tikkeettii',
    ticketsPool: 'Baay\'ina Tikkeettii',
    drawDate: 'Guyyaa Carraan Ba\'u',
    paymentInstructions: 'Qajeelfama Kaffaltii',
    cbeTitle: '🏦 Baankii Daldala Itoophiyaa (CBE)',
    telebirrTitle: '📱 Telebirr Kaffaluuf',
    howToPayCbe: (price: number) => `Lakkoofsa herrega baankii armaan oliitti sirriitti *${price} Birr* ergaa koodii **FT** ykn suuraa nagahee asitti ergaa!`,
    howToPayTelebirr: (price: number) => `Lakkoofsa Telebirr armaan oliitti sirriitti *${price} Birr* ergaa lakkoofsa kaffaltii ykn suuraa nagahee asitti ergaa!`,
    pasteReferenceHint: '💡 _Hubachiisa: Suuraa nagahee ykn lakkoofsa kaffaltii barreeffamaan erguu dandeessu!_',
    reservedSuccess: (num: number, title: string, price: number) => `🎟️ *Tikkeettiin #${num} isiniif qabameera!*\n\n• Lootarii: *${title}*\n• Gatii: *${price} Birr*\n• Yeroo: *Daqiiqaa 15*\n\nMaaloo mala kaffaltii keessan filadhaa:`,
    activeReservationExists: '⚠️ *Tikkeettii hin kaffalmiin qabdu!*\nYeroo tokkotti tikkeettii tokko qofa qabachuun danda\'ama. Maaloo kaffaltii xumuraa ykn daqiiqaa 15 eegaa.',
    ticketUnavailable: (num: number) => `❌ Tikkeettiin #${num} nama biraan qabameera. Maaloo lakkoofsa biraa filadhaa.`,
    reservationExpired: (num: number) => `⏱️ Yeroon tikkeettii #${num} daqiiqaa 15 dhumateera.`,
    reservationCancelled: (num: number) => `✅ Tikkeettii #${num} dhiiftaniittu. Lakkoofsa biraa filachuu dandeessu.`,
    paymentReceivedVerifying: (num: number) => `🔍 *Kaffaltiin tikkeettii #${num} nu gaheera!*\nMirkanaa\'aa jira, maaloo muraasa eegaa...`,
    ticketIssued: (num: number, title: string, amount: number, ref: string) => `🎉 *Kaffaltiin keessan mirkanaa\'eera! Tikkeettiin keessan kennameera!*\n\n• Lootarii: *${title}*\n• Lakkoofsa: *#${num}*\n• Gatii: *${amount} Birr*\n• Koodii: \`${ref}\`\n\n✅ Tikkeettiin keessan carraa keessa galeera! Carraa gaarii! 🍀`,
    paymentQueuedAdmin: (num: number, ref: string) => `⏳ *Kaffaltiin keessan qorannoof darbeera*\n\n• Lakkoofsa: *#${num}*\n• Koodii: \`${ref}\`\n\n⏱️ Yeroon keessan daqiiqaa 30 dheerateera. Hojjataan keenya dafee mirkaneessa.`,
    noActiveReservationForReceipt: '⚠️ Tikkeettii qabattanii jirtan hin qabdu.\n\nNagahee erguun dura maaloo tikkeettii qabadhaa.',
    receiptImageExtracted: '🤖 Nagahee keessan qorachaa jirra...',
    helpText: 'ℹ️ *Qajeelfama fi Deeggarsa*\n\n1. Yeroo tokkotti tikkeettii 1 qofa qabachuun danda\'ama.\n2. Kaffaltii xumuruuf daqiiqaa 15 qabdu.\n3. Kaffaltiin battalumatti mirkanaa\'a.',
    resultsPending: '🏆 Bu\'aan carraa yeroma xumuramu asitti beeksifama.',
    generalHelpPrompt: 'Akkamitti isin gargaaruu dandeenya? Filannoowwan armaan gadii fayyadamaa:',
    unrecognizedMessage: '👋 Nagaa! Ergaan keessan nu gaheera.\n\nNagahee kaffaltii ykn koodii FT yoo qabaattan asitti ergaa, ykn tikkeettii qabachuuf baafata fayyadamaa:'
  },
  en: {
    welcome: '👋 Welcome to the Official Lottery Platform!\nPlease select your preferred language:',
    selectLanguage: '🌐 Please select your preferred language:',
    shareContactPrompt: '📱 To complete your registration, please share your verified phone number using the button below:',
    shareContactButton: '📲 Share Phone Number',
    regSuccess: (name: string) => `✅ Registration successful, ${name}!\n\nYou can now browse active lotteries, reserve lucky numbers, and track your tickets.`,
    mainMenuTitle: '🎯 Main Menu\nPlease select an option below:',
    menuActiveLotteries: '🎯 Active Lotteries',
    menuMyTickets: '🎫 My Tickets',
    menuResults: '🏆 Results & Winners',
    menuChangeLanguage: '🌐 Change Language',
    menuHelp: 'ℹ️ Help & Support',
    noActiveLotteries: 'ℹ️ There are currently no open lottery events. Please check back soon!',
    activeLotteriesTitle: '🎯 *Currently Active Lottery Events*\n\nSelect an event to view ticket pricing, pool details, and payment instructions:',
    selectEventPrompt: 'Tap below to select your lucky numbers:',
    pricePerTicket: 'Price Per Ticket',
    ticketsPool: 'Total Tickets',
    drawDate: 'Draw Date',
    paymentInstructions: 'Payment Instructions',
    cbeTitle: '🏦 Commercial Bank of Ethiopia (CBE) Payment',
    telebirrTitle: '📱 Telebirr Payment',
    howToPayCbe: (price: number) => `Transfer exactly *${price} ETB* via CBE Mobile Banking or CBE Birr and send the **FT** reference number or receipt photo screenshot here!`,
    howToPayTelebirr: (price: number) => `Transfer exactly *${price} ETB* to the Telebirr number above and send the transaction code or receipt photo screenshot here!`,
    pasteReferenceHint: '💡 _Hint: You can upload a screenshot photo or type the reference code directly!_',
    reservedSuccess: (num: number, title: string, price: number) => `🎟️ *Ticket #${num} Reserved Successfully!*\n\n• Event: *${title}*\n• Price: *${price} ETB*\n• Hold Timer: *15 Minutes*\n\n💳 Please choose your payment method below:`,
    activeReservationExists: '⚠️ *Active Reservation Detected*\n\nYou already have a pending ticket reserved.\nAs per platform rules, you can only cut **one ticket at a time**.\nPlease complete payment or wait for the 15-minute timer to expire.',
    ticketUnavailable: (num: number) => `❌ Ticket #${num} was just taken by another participant. Please pick another number.`,
    reservationExpired: (num: number) => `⏱️ The 15-minute hold timer for Ticket #${num} has expired.`,
    reservationCancelled: (num: number) => `✅ Reservation for Ticket #${num} has been cancelled. You are free to pick another number.`,
    paymentReceivedVerifying: (num: number) => `🔍 *Payment Receipt Received for Ticket #${num}!*\nVerifying in-memory with bank APIs, please wait...`,
    ticketIssued: (num: number, title: string, amount: number, ref: string) => `🎉 *PAYMENT VERIFIED & TICKET ISSUED!*\n\n• Event: *${title}*\n• Ticket Number: *#${num}*\n• Amount Paid: *${amount} ETB*\n• Reference: \`${ref}\`\n\n✅ Your ticket is officially registered in the draw pool! Good luck! 🍀`,
    paymentQueuedAdmin: (num: number, ref: string) => `⏳ *Payment Queued for Operator Approval*\n\n• Ticket Number: *#${num}*\n• Reference: \`${ref}\`\n\n⏱️ *30-Minute Hold Extension Applied!* Our admin will review and approve your ticket shortly.`,
    noActiveReservationForReceipt: '⚠️ You do not currently have an active ticket reservation.\n\nPlease select an active lottery and reserve a ticket first before sending payment receipts.',
    receiptImageExtracted: '🤖 Examining receipt screenshot in-memory...',
    helpText: 'ℹ️ *Customer Support & Rules*\n\n1. Each participant can only reserve 1 ticket at a time.\n2. You have 15 minutes to pay and send your receipt screenshot or reference.\n3. Automated checks verify CBE and Telebirr immediately.\n4. For help, contact official admin support.',
    resultsPending: '🏆 Live lottery results will be broadcasted here immediately upon completion of official draws.',
    generalHelpPrompt: 'How can we help you? Tap any of the options below:',
    unrecognizedMessage: '👋 Hello! We received your message.\n\nIf this is a payment receipt, please send your **FT...** code or receipt screenshot. Otherwise, choose an action below:'
  }
};

export function getLang(langStr?: string): SupportedLanguage {
  if (langStr === 'am' || langStr === 'om') return langStr;
  return 'en';
}
