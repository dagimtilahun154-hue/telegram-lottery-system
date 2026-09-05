import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  Users, 
  Grid3X3, 
  Send, 
  UserPlus, 
  Trophy, 
  FileSpreadsheet, 
  Ticket, 
  Layers
} from 'lucide-react';
import { LotteryEvent } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  events: LotteryEvent[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  pendingReviewCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  events,
  selectedEventId,
  setSelectedEventId,
  pendingReviewCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Lottery Events', icon: Sparkles },
    { id: 'purchases', label: 'Purchases & Users', icon: Users, badge: pendingReviewCount > 0 ? pendingReviewCount : undefined },
    { id: 'grid', label: 'Ticket Grid (1-5000)', icon: Grid3X3 },
    { id: 'broadcast', label: 'Broadcasts', icon: Send },
    { id: 'manual-sales', label: 'Walk-In Sales', icon: UserPlus },
    { id: 'winners', label: 'Draw & Winners', icon: Trophy },
    { id: 'reports', label: 'Exports & Reports', icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0a0d14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <Ticket className="w-5 h-5 text-black font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">LOTTO<span className="text-emerald-400">ADMIN</span></span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Supabase Live
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Telegram Lottery Management Central</p>
            </div>
          </div>

          {/* Categorized Event Filter Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#111724] border border-white/10 rounded-xl px-3 py-1.5 shadow-inner">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-xs text-slate-400 hidden md:block">Active Event:</div>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
              >
                <option value="ALL" className="bg-[#111724] text-white">All Lottery Events</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-[#111724] text-white">
                    {evt.title} ({evt.ticket_price} ETB)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-white/[0.05]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
