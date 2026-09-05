import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Grid, 
  Send, 
  Settings, 
  Ticket,
  LogOut,
  Calendar,
  ShoppingBag,
  Trophy,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LotteryEvent } from '../types';
import { useI18n } from '../lib/i18n';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  events: LotteryEvent[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  pendingReviewCount: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingReviewCount,
  onLogout
}) => {
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);

  // 5 Essential Daily Duties for Non-Technical Operators
  const primaryMenuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { 
      id: 'purchases', 
      label: t.payments, 
      icon: Users, 
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-rose-500'
    },
    { id: 'grid', label: t.grid, icon: Grid },
    { id: 'broadcast', label: t.broadcast, icon: Send },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  // Secondary Tools (Available upon expanding)
  const secondaryMenuItems = [
    { id: 'manual-sales', label: t.manualSales, icon: ShoppingBag },
    { id: 'events', label: t.events, icon: Calendar },
    { id: 'winners', label: t.winners, icon: Trophy },
    { id: 'reports', label: t.reports, icon: FileText },
  ];

  return (
    <>
      {/* Desktop Navy Sidebar with Smooth Curve Design */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0a1727] text-slate-300 min-h-screen shrink-0 sticky top-0 h-screen z-30 select-none border-r border-white/[0.04]">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-glow-blue font-bold">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-sm tracking-wide text-white flex items-center">
              Richo <span className="text-blue-400 ml-1">ekup</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Simple Admin Panel</div>
          </div>
        </div>

        {/* Primary 5 Simple Duties */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Main Operations
          </div>

          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-glow-blue scale-[1.02]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${item.badgeColor} animate-pulse shadow-sm`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Secondary Tools Toggle */}
          <div className="pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              <span>More Tools</span>
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMore && (
              <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                {secondaryMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isActive ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bot Status Card */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white">System Active</div>
              <div className="text-[10px] text-emerald-400">Veritas Pool + CBE Direct</div>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.signOut}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 Primary Items) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a1727]/95 backdrop-blur-lg border-t border-white/[0.08] shadow-2xl px-2 py-1.5 flex items-center justify-around">
        {primaryMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="mt-0.5 truncate max-w-[56px]">{item.label.split(' ')[0]}</span>
              {item.badge !== undefined && (
                <span className="absolute -top-0.5 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0a1727]" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
