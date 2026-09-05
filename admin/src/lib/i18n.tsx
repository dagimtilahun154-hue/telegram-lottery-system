import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'am';

export interface Translations {
  // Navigation
  dashboard: string;
  events: string;
  purchases: string;
  grid: string;
  broadcast: string;
  manualSales: string;
  winners: string;
  reports: string;
  settings: string;
  payments: string;

  // Header & User
  activeEvent: string;
  allEvents: string;
  searchPlaceholder: string;
  administrator: string;
  signOut: string;
  switchLanguage: string;

  // Dashboard Metrics
  totalRevenue: string;
  ticketsIssued: string;
  activeReservations: string;
  manualReviewQueue: string;
  pendingVerifications: string;
  activeLotteries: string;
  recentTransactions: string;
  quickActions: string;
  createEvent: string;
  sendBroadcast: string;
  exportData: string;

  // Ticket & Status
  status: string;
  ticket: string;
  customer: string;
  phone: string;
  amount: string;
  date: string;
  action: string;
  available: string;
  reserved: string;
  issued: string;
  verifying: string;
  manualReview: string;
  rejected: string;
  winner: string;

  // Actions
  approve: string;
  reject: string;
  viewReceipt: string;
  details: string;
  saveChanges: string;
  cancel: string;
  refresh: string;

  // Broadcast & Channels
  broadcastCenter: string;
  composeMessage: string;
  targetAudience: string;
  targetChannel: string;
  directUsers: string;
  headline: string;
  messageBody: string;
  imageAttachment: string;
  buttonLabel: string;
  actionUrl: string;
  sendTelegram: string;
  sending: string;
  chatPreview: string;
  channelPreview: string;
  pastBroadcasts: string;

  // Settings
  systemSettings: string;
  adminCredentials: string;
  databaseStatus: string;
  botEngine: string;
  telegramChannels: string;
}

const translations: Record<Language, Translations> = {
  en: {
    dashboard: 'Dashboard',
    events: 'Lottery Events',
    purchases: 'Purchases & Audits',
    grid: 'Ticket Grid',
    broadcast: 'Broadcast',
    manualSales: 'Manual Sales',
    winners: 'Winners & Draws',
    reports: 'Reports',
    settings: 'Settings',
    payments: 'Payment Review',

    activeEvent: 'Active Event',
    allEvents: 'All Lottery Events',
    searchPlaceholder: 'Search tickets, phones, receipts...',
    administrator: 'Administrator',
    signOut: 'Sign Out',
    switchLanguage: 'Language',

    totalRevenue: 'Total Revenue',
    ticketsIssued: 'Tickets Issued',
    activeReservations: 'Active Reservations',
    manualReviewQueue: 'Manual Review',
    pendingVerifications: 'Verifying',
    activeLotteries: 'Active Lotteries',
    recentTransactions: 'Recent Transactions',
    quickActions: 'Quick Actions',
    createEvent: 'Create Event',
    sendBroadcast: 'Send Broadcast',
    exportData: 'Export CSV',

    status: 'Status',
    ticket: 'Ticket',
    customer: 'Customer',
    phone: 'Phone',
    amount: 'Amount',
    date: 'Date',
    action: 'Action',
    available: 'Available',
    reserved: 'Reserved',
    issued: 'Issued',
    verifying: 'Verifying',
    manualReview: 'Review',
    rejected: 'Rejected',
    winner: 'Winner',

    approve: 'Approve',
    reject: 'Reject',
    viewReceipt: 'View Receipt',
    details: 'Details',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    refresh: 'Refresh',

    broadcastCenter: 'Telegram Broadcast & Channels',
    composeMessage: 'Compose Announcement',
    targetAudience: 'Target Destination',
    targetChannel: 'Telegram Channel / Group',
    directUsers: 'All Bot Users (DM)',
    headline: 'Headline',
    messageBody: 'Message Text',
    imageAttachment: 'Image URL (Optional)',
    buttonLabel: 'Button Label',
    actionUrl: 'Button Link URL',
    sendTelegram: 'Send Announcement',
    sending: 'Dispatching...',
    chatPreview: 'Telegram DM Preview',
    channelPreview: 'Channel Post Preview',
    pastBroadcasts: 'Dispatch History',

    systemSettings: 'Settings & Integrations',
    adminCredentials: 'Admin Credentials',
    databaseStatus: 'Supabase Database',
    botEngine: 'Telegram Bot Engine',
    telegramChannels: 'Connected Channels & Groups',
  },
  am: {
    dashboard: 'ዳሽቦርድ',
    events: 'የሎተሪ ዝግጅቶች',
    purchases: 'ግዢዎች እና ማረጋገጫ',
    grid: 'የቲኬት ሰንጠረዥ',
    broadcast: 'መልእክት ማስተላለፊያ',
    manualSales: 'ቀጥታ ሽያጭ',
    winners: 'አሸናፊዎች እና ዕጣ',
    reports: 'ሪፖርቶች',
    settings: 'ቅንብሮች',
    payments: 'ክፍያ ማረጋገጫ',

    activeEvent: 'የተመረጠ ዝግጅት',
    allEvents: 'ሁሉም የሎተሪ ዝግጅቶች',
    searchPlaceholder: 'ቲኬት፣ ስልክ ወይም ደረሰኝ ፈልግ...',
    administrator: 'አስተዳዳሪ',
    signOut: 'ውጣ',
    switchLanguage: 'ቋንቋ',

    totalRevenue: 'ጠቅላላ ገቢ',
    ticketsIssued: 'የተቆረጡ ቲኬቶች',
    activeReservations: 'በመጠባበቅ ላይ ያሉ',
    manualReviewQueue: 'በእጅ የሚገመገሙ',
    pendingVerifications: 'በማረጋገጥ ላይ',
    activeLotteries: 'ንቁ ሎተሪዎች',
    recentTransactions: 'የቅርብ ጊዜ ግዢዎች',
    quickActions: 'ፈጣን እርምጃዎች',
    createEvent: 'ዝግጅት ፍጠር',
    sendBroadcast: 'መልእክት አስተላልፍ',
    exportData: 'ዳታ አውርድ',

    status: 'ሁኔታ',
    ticket: 'ቲኬት',
    customer: 'ደንበኛ',
    phone: 'ስልክ',
    amount: 'መጠን',
    date: 'ቀን',
    action: 'እርምጃ',
    available: 'ክፍት',
    reserved: 'የተያዘ',
    issued: 'የተቆረጠ',
    verifying: 'በማረጋገጥ ላይ',
    manualReview: 'ግምገማ',
    rejected: 'ውድቅ የተደረገ',
    winner: 'አሸናፊ',

    approve: 'አጽድቅ',
    reject: 'ውድቅ አድርግ',
    viewReceipt: 'ደረሰኝ እይ',
    details: 'ዝርዝር',
    saveChanges: 'ለውጦችን መዝግብ',
    cancel: 'ሰርዝ',
    refresh: 'አድስ',

    broadcastCenter: 'የቴሌግራም መልእክት እና ቻናሎች',
    composeMessage: 'አዲስ መልእክት አዘጋጅ',
    targetAudience: 'የመልእክት መዳረሻ',
    targetChannel: 'ቴሌግራም ቻናል / ግሩፕ',
    directUsers: 'ሁሉም የቦት ተጠቃሚዎች (DM)',
    headline: 'አርዕስት',
    messageBody: 'የመልእክት ዝርዝር',
    imageAttachment: 'የምስል ማስፈንጠሪያ (አማራጭ)',
    buttonLabel: 'የአዝራር ጽሑፍ',
    actionUrl: 'የአዝራር ሊንክ',
    sendTelegram: 'መልእክት ላክ',
    sending: 'በመላክ ላይ...',
    chatPreview: 'የቦት መልእክት ቅድመ-ዕይታ',
    channelPreview: 'የቻናል ፖስት ቅድመ-ዕይታ',
    pastBroadcasts: 'የተላኩ መልእክቶች ታሪክ',

    systemSettings: 'ቅንብሮች እና ግንኙነቶች',
    adminCredentials: 'የአስተዳዳሪ መለያ',
    databaseStatus: 'የሱፓቤዝ ዳታቤዝ',
    botEngine: 'የቴሌግራም ቦት ሲስተም',
    telegramChannels: 'የተገናኙ ቻናሎች እና ግሩፖች',
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('lottery_admin_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lottery_admin_lang', lang);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
