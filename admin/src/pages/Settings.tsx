import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  Check, 
  AlertCircle, 
  Database, 
  Bot, 
  User, 
  Megaphone, 
  Radio, 
  BellRing,
  Save
} from 'lucide-react';
import { getAdminCredentials, updateAdminCredentials } from '../lib/auth';
import { useI18n } from '../lib/i18n';

export const Settings: React.FC = () => {
  const { t } = useI18n();
  const currentCreds = getAdminCredentials();
  const [username, setUsername] = useState(currentCreds.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Channels & Groups Settings
  const [channelHandle, setChannelHandle] = useState(() => localStorage.getItem('lottery_channel_handle') || '@RichoLottery');
  const [groupHandle, setGroupHandle] = useState(() => localStorage.getItem('lottery_group_handle') || '@RichoCommunity');
  const [autoPostEvents, setAutoPostEvents] = useState(() => localStorage.getItem('lottery_autopost_events') !== 'false');
  const [autoPostDraws, setAutoPostDraws] = useState(() => localStorage.getItem('lottery_autopost_draws') !== 'false');
  const [channelSaveSuccess, setChannelSaveSuccess] = useState(false);

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (currentPassword !== currentCreds.password) {
      setStatusMessage({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }

    if (newPassword && newPassword.length < 3) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 3 characters long.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    const updated = updateAdminCredentials(
      username.trim(),
      newPassword ? newPassword : currentCreds.password
    );

    if (updated) {
      setStatusMessage({ type: 'success', text: 'Admin credentials successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to update credentials. Please try again.' });
    }
  };

  const handleSaveChannels = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('lottery_channel_handle', channelHandle);
    localStorage.setItem('lottery_group_handle', groupHandle);
    localStorage.setItem('lottery_autopost_events', String(autoPostEvents));
    localStorage.setItem('lottery_autopost_draws', String(autoPostDraws));
    setChannelSaveSuccess(true);
    setTimeout(() => setChannelSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t.systemSettings}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin credentials, Telegram channels, and system integrations.
          </p>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Security & Credentials */}
        <div className="reference-card p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.adminCredentials}</h3>
              <p className="text-[10px] text-slate-400">Update administrative login credentials</p>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateAccount} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200/80 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="input-clean"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Optional"
                  className="input-clean"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="input-clean"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 mt-2"
            >
              <Shield className="w-3.5 h-3.5" />
              {t.saveChanges}
            </button>
          </form>
        </div>

        {/* Right: Telegram Channels & Groups Configuration */}
        <div className="space-y-6">
          <form onSubmit={handleSaveChannels} className="reference-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t.telegramChannels}</h3>
                <p className="text-[10px] text-slate-400">Set default channel handles for broadcasting</p>
              </div>
            </div>

            {channelSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Channel preferences saved!</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Official Announcement Channel
                </label>
                <input
                  type="text"
                  value={channelHandle}
                  onChange={(e) => setChannelHandle(e.target.value)}
                  placeholder="@MyLotteryChannel or -100..."
                  className="input-clean"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Community Discussion Group
                </label>
                <input
                  type="text"
                  value={groupHandle}
                  onChange={(e) => setGroupHandle(e.target.value)}
                  placeholder="@MyCommunityGroup or -100..."
                  className="input-clean"
                />
              </div>

              <div className="pt-2 space-y-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPostEvents}
                    onChange={(e) => setAutoPostEvents(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium">Auto-post newly created lotteries to channel</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPostDraws}
                    onChange={(e) => setAutoPostDraws(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-slate-700 font-medium">Auto-post 15-min draw countdown & winner alerts</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-secondary w-full py-2 mt-2 flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Channel Preferences
              </button>
            </div>
          </form>

          {/* Telebirr Veritas Multi-Key Pool Card */}
          <div className="reference-card p-6 space-y-4 border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Telebirr Veritas Pool
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pooled keys for 1,000+ monthly verifications
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                10 Keys Active
              </span>
            </div>

            {/* Capacity Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Keys Active</div>
                <div className="text-lg font-black text-blue-600 mt-0.5">10 Keys</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Monthly Quota</div>
                <div className="text-lg font-black text-emerald-600 mt-0.5">1,000 / mo</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Rate Limit</div>
                <div className="text-lg font-black text-slate-800 mt-0.5">100 req/min</div>
              </div>
            </div>

            {/* CBE Direct Verifier Notice */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-start gap-2.5 text-xs text-emerald-900">
              <span className="text-sm font-bold text-emerald-700">✓</span>
              <div>
                <span className="font-bold block">CBE Verification is 100% Free & Unlimited:</span>
                CBE payments use the direct web verifier and never consume any Veritas API quota.
              </div>
            </div>

            {/* Add / Edit Keys */}
            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Telebirr Veritas API Keys (Comma-separated)
              </label>
              <textarea
                rows={3}
                defaultValue="veritas_key_01, veritas_key_02, veritas_key_03, veritas_key_04, veritas_key_05, veritas_key_06, veritas_key_07, veritas_key_08, veritas_key_09, veritas_key_10"
                placeholder="Paste your 10 keys separated by commas..."
                className="input-clean font-mono text-[11px] leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Each key adds +100 verifications/month & +10 req/min</span>
                <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                  Auto-Rotates & Failover Active
                </span>
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="reference-card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" /> Supabase Database
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" /> Telegram Bot Polling
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Daemon Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
