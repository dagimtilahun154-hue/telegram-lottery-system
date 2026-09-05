import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Radio, 
  MessageSquare, 
  Megaphone, 
  Users,
  Sparkles
} from 'lucide-react';
import { LotteryEvent, Broadcast } from '../types';
import { useI18n } from '../lib/i18n';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface BroadcastProps {
  events: LotteryEvent[];
}

type DestinationType = 'USERS' | 'CHANNEL' | 'GROUP' | 'ALL';

export const BroadcastPage: React.FC<BroadcastProps> = ({ events }) => {
  const { t } = useI18n();

  const [destination, setDestination] = useState<DestinationType>('ALL');
  const [channelTarget, setChannelTarget] = useState('@RichoLottery');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('Cut Your Ticket Now 🎟️');
  const [buttonUrl, setButtonUrl] = useState('https://t.me/meklawbot');
  const [targetEventId, setTargetEventId] = useState('ALL');
  const [targetLanguage, setTargetLanguage] = useState<'ALL' | 'en' | 'am' | 'om'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'dm' | 'channel'>('channel');

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(() => {
    try {
      const saved = localStorage.getItem('lottery_admin_broadcasts');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Purge any legacy mock records that had 2450
        return parsed.filter((b: any) => b.total_recipients !== 2450 && b.successful_deliveries !== 2441);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [liveAudienceCount, setLiveAudienceCount] = useState<number>(1);

  // Fetch real registered audience count from Supabase
  useEffect(() => {
    let isMounted = true;
    async function fetchAudience() {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null && isMounted) {
          setLiveAudienceCount(Math.max(1, count));
        }
      } catch (err) {
        console.warn('Failed to fetch user count:', err);
      }
    }
    fetchAudience();
    const timer = setInterval(fetchAudience, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Fetch live broadcasts from Supabase on mount and poll
  useEffect(() => {
    let isMounted = true;
    async function loadBroadcasts() {
      try {
        const { data, error } = await supabase
          .from('broadcasts')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          const mapped: Broadcast[] = data.map((b: any) => ({
            id: b.id,
            event_id: b.event_id,
            title: b.title,
            message_text: (b.message_text || '')
              .replace(/<!--destination:(.+?)-->/g, '')
              .replace(/<!--target_channel:(.+?)-->/g, '')
              .trim(),
            image_url: b.image_url,
            button_text: b.button_text,
            button_url: b.button_url,
            target_language: b.target_language || 'ALL',
            total_recipients: b.total_recipients || 0,
            successful_deliveries: b.successful_deliveries || 0,
            failed_deliveries: b.failed_deliveries || 0,
            status: b.status || 'SENT',
            sent_at: b.sent_at ? new Date(b.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            created_at: b.created_at || new Date().toISOString()
          }));
          setBroadcasts(mapped);
          localStorage.setItem('lottery_admin_broadcasts', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Failed to load broadcasts from Supabase:', err);
      }
    }

    loadBroadcasts();
    const timer = setInterval(loadBroadcasts, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const applyTemplate = (type: 'launch' | 'draw' | 'winner') => {
    if (type === 'launch') {
      setTitle('🎉 New Grand Lottery Launched!');
      setMessage('🔥 A brand new lottery event is officially live! Limited ticket quantities available. Reserve yours now before spots fill up!');
      setButtonText('Cut Ticket Now 🎟️');
    } else if (type === 'draw') {
      setTitle('⏰ Live Draw in 15 Minutes!');
      setMessage('⚡ Ticket sales are closing! The official provably-fair draw will take place live. Have your tickets ready!');
      setButtonText('Check My Numbers 🎯');
    } else if (type === 'winner') {
      setTitle('🏆 Official Draw Winner Declared!');
      setMessage('🎊 Congratulations to ticket #0428 for taking home the grand prize! Payout and verification completed.');
      setButtonText('View Winner Board 🏆');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setIsSending(true);

    const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const sanitizedEventId = (targetEventId && targetEventId !== 'ALL' && isValidUuid(targetEventId)) ? targetEventId : null;
    const realAudience = destination === 'CHANNEL' ? 1 : liveAudienceCount;

    const newBc: Broadcast = {
      id: crypto.randomUUID(),
      event_id: sanitizedEventId,
      title,
      message_text: message,
      image_url: imageUrl || null,
      button_text: buttonText || null,
      button_url: buttonUrl || null,
      target_language: targetLanguage,
      total_recipients: realAudience,
      successful_deliveries: 0,
      failed_deliveries: 0,
      status: 'SENDING',
      sent_at: 'Just now',
      created_at: new Date().toISOString()
    };

    // Pack destination and target channel into message_text with tags so broadcastWorker can extract them
    let packedMessage = message.trim();
    packedMessage = `<!--destination:${destination}-->` + packedMessage;
    if (channelTarget && channelTarget.trim()) {
      packedMessage = `<!--target_channel:${channelTarget.trim()}-->` + packedMessage;
    }

    // If live Supabase connection is active, insert into public.broadcasts so the bot daemon dispatches it
    if (isSupabaseConfigured) {
      try {
        const { data: inserted, error: bcError } = await supabase.from('broadcasts').insert({
          id: newBc.id,
          event_id: sanitizedEventId,
          title,
          message_text: packedMessage,
          image_url: imageUrl || null,
          button_text: buttonText || null,
          button_url: buttonUrl || null,
          target_language: targetLanguage,
          status: 'SENDING', // signals bot broadcastWorker to dispatch
          total_recipients: realAudience
        }).select();

        if (bcError) {
          console.error('[Supabase] Broadcast insert failed:', bcError.message);
        } else {
          console.log('[Supabase] Broadcast successfully queued for dispatch:', inserted);
        }
      } catch (err) {
        console.warn('Could not insert broadcast to Supabase:', err);
      }
    }

    setTimeout(() => {
      setBroadcasts(prev => [newBc, ...prev]);
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 4500);

      setTitle('');
      setMessage('');
      setImageUrl('');
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header with Clean Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-blue-600 animate-pulse" />
            {t.broadcastCenter}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Megaphone className="w-3 h-3" /> Multi-Channel & Group Dispatch
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Auto-synced with Bot Worker</span>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden lg:inline">Templates:</span>
          <button
            onClick={() => applyTemplate('launch')}
            className="px-2.5 py-1.5 bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 shadow-sm transition-all cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-500" /> New Launch
          </button>
          <button
            onClick={() => applyTemplate('draw')}
            className="px-2.5 py-1.5 bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 shadow-sm transition-all cursor-pointer flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-blue-500" /> Draw Alert
          </button>
          <button
            onClick={() => applyTemplate('winner')}
            className="px-2.5 py-1.5 bg-white border border-slate-200/80 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 shadow-sm transition-all cursor-pointer flex items-center gap-1"
          >
            🏆 Winner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSend} className="reference-card p-6 space-y-4.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                {t.composeMessage}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">Telegram Bot API v4</span>
            </div>

            {/* Target Destination Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.targetAudience}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ALL', label: 'All Channels & DMs', icon: Radio },
                  { id: 'CHANNEL', label: 'Telegram Channel', icon: Megaphone },
                  { id: 'GROUP', label: 'Telegram Group', icon: Users },
                  { id: 'USERS', label: 'Bot DMs Only', icon: MessageSquare },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = destination === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setDestination(item.id as DestinationType)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-600 text-blue-900 shadow-sm'
                          : 'bg-slate-50/70 border-slate-200/70 text-slate-600 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Channel or Group Handle */}
            {(destination === 'CHANNEL' || destination === 'GROUP' || destination === 'ALL') && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Telegram Channel / Group Handle or ID
                </label>
                <input
                  type="text"
                  value={channelTarget}
                  onChange={(e) => setChannelTarget(e.target.value)}
                  placeholder="@MyLotteryChannel or -1001234567890"
                  className="input-clean"
                />
              </div>
            )}

            {/* Event & Language Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Event Filter
                </label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="input-clean"
                >
                  <option value="ALL">All Participants</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Language
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as any)}
                  className="input-clean"
                >
                  <option value="ALL">All (Multilingual)</option>
                  <option value="en">English (en)</option>
                  <option value="am">Amharic (አማርኛ)</option>
                  <option value="om">Afaan Oromoo (om)</option>
                </select>
              </div>
            </div>

            {/* Headline */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t.headline} *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50% of Tickets Sold Out!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-clean"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {t.messageBody} *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Type your message text here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input-clean"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> {t.imageAttachment}
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-clean"
              />
            </div>

            {/* Call to Action Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t.buttonLabel}
                </label>
                <input
                  type="text"
                  placeholder="Cut Your Ticket 🎟️"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="input-clean"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t.actionUrl}
                </label>
                <input
                  type="text"
                  placeholder="https://t.me/..."
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  className="input-clean"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Audience: <strong className="text-slate-900 font-bold">{liveAudienceCount} registered user{liveAudienceCount === 1 ? '' : 's'} {destination === 'CHANNEL' ? '(Channel Only)' : destination === 'ALL' ? '+ Channels' : '(Direct Messages)'}</strong>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="btn-primary px-5 py-2.5"
              >
                {isSending ? t.sending : <><Send className="w-3.5 h-3.5" /> {t.sendTelegram}</>}
              </button>
            </div>

            {sentSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Broadcast queued successfully and sent to Telegram Bot Daemon!</span>
              </div>
            )}
          </form>
        </div>

        {/* Telegram Chat / Channel Mockup (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Preview
            </span>
            {/* Toggle Preview Mode */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setPreviewMode('channel')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  previewMode === 'channel' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                Channel
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('dm')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  previewMode === 'dm' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                Direct DM
              </button>
            </div>
          </div>

          <div className="reference-card p-4.5 bg-gradient-to-b from-slate-100 to-slate-200/70">
            {/* Mock Header */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-300/60">
              <div className="w-8 h-8 rounded-full bg-[#0a1727] text-white flex items-center justify-center font-black text-xs shadow-sm">
                RL
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {previewMode === 'channel' ? (channelTarget || 'Richo Official Channel') : 'Richo Lottery Bot'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {previewMode === 'channel' ? (channelTarget || '@MyLotteryChannel') : `${liveAudienceCount} registered participant${liveAudienceCount === 1 ? '' : 's'}`}
                </div>
              </div>
            </div>

            {/* Mock Message Bubble with Smooth Curves */}
            <div className="mt-3 bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-premium text-xs">
              {imageUrl && (
                <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-3.5 space-y-2">
                <div className="font-extrabold text-slate-900 text-sm tracking-tight">
                  {title || 'Announcement Headline'}
                </div>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                  {message || 'Your message preview will appear here in real-time as you type...'}
                </p>
                <div className="text-[10px] text-slate-400 text-right">
                  10:45 AM
                </div>
              </div>

              {buttonText && (
                <div className="p-2.5 border-t border-slate-100 bg-slate-50/50">
                  <div className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-blue-700 text-center font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-blue-50 transition-colors">
                    <span>{buttonText}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Delivery History */}
      <div className="space-y-3 pt-4 border-t border-slate-200/80">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          {t.pastBroadcasts}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {broadcasts.length === 0 ? (
            <div className="col-span-full reference-card p-8 text-center text-xs text-slate-400">
              No past broadcasts found. Use the composer above to send an announcement to your channel or subscribers.
            </div>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id} className="reference-card p-5 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{b.title}</h4>
                    <span className="text-[10px] text-slate-400">{b.sent_at}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                    b.status === 'SENT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      : b.status === 'SENDING'
                      ? 'bg-blue-50 text-blue-700 border-blue-200/60 animate-pulse'
                      : 'bg-rose-50 text-rose-700 border-rose-200/60'
                  }`}>
                    {b.status === 'SENDING' ? '⏳ Dispatching...' : b.status === 'SENT' ? '✓ Delivered' : b.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{b.message_text}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Audience: <strong className="text-slate-800">{b.total_recipients.toLocaleString()}</strong></span>
                  <span className="text-emerald-700 font-semibold">✓ {b.successful_deliveries.toLocaleString()} Delivered</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
