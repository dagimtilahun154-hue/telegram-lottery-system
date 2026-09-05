import React from 'react';
import { Search, Bell, ChevronDown, Globe, LogOut } from 'lucide-react';
import { LotteryEvent } from '../types';
import { useI18n } from '../lib/i18n';

interface TopNavbarProps {
  events: LotteryEvent[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  pendingReviewCount: number;
  currentUser?: string;
  onLogout?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  events,
  selectedEventId,
  setSelectedEventId,
  pendingReviewCount,
  currentUser = 'Richo@123',
  onLogout
}) => {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="h-16 glass-header px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-all">
      {/* Left: Active Event Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">{t.activeEvent}:</span>
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            aria-label={t.activeEvent}
            className="appearance-none bg-white/90 border border-slate-200/80 hover:border-slate-300 rounded-xl pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm transition-all"
          >
            <option value="ALL">{t.allEvents}</option>
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Right: Search, Language Switcher, Notification Bell, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search input */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-64 pl-8 pr-3 py-1.5 bg-slate-100/70 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Language Switcher Pill */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/70 shadow-inner">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              language === 'en'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('am')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              language === 'am'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            አማርኛ
          </button>
        </div>

        {/* Notifications */}
        <div className="relative cursor-pointer p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors">
          <Bell className="w-4 h-4" />
          {pendingReviewCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
              {pendingReviewCount}
            </span>
          )}
        </div>

        {/* User Pill with Quick Logout */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200/80">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0a1727] to-[#163153] text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {currentUser.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser}</div>
            <div className="text-[10px] text-emerald-600 font-semibold leading-tight">{t.administrator}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title={t.signOut}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
