import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { ReceiptModal } from './components/ReceiptModal';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { Purchases } from './pages/Purchases';
import { TicketGrid } from './pages/TicketGrid';
import { BroadcastPage } from './pages/Broadcast';
import { ManualSales } from './pages/ManualSales';
import { Winners } from './pages/Winners';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { isAuthenticated, logout, getSessionUser } from './lib/auth';
import { fetchLiveEvents, fetchLivePurchases, supabase } from './lib/supabase';
import { LotteryEvent, PurchaseRecord } from './types';
import { I18nProvider } from './lib/i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

// Purge any legacy stale localStorage keys on initial module load
try {
  localStorage.removeItem('lottery_admin_events');
  localStorage.removeItem('lottery_admin_purchases');
  localStorage.removeItem('lottery_events_data');
  localStorage.removeItem('lottery_admin_broadcasts');
} catch (_) {}

function AdminContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState('ALL');

  // Real State: 100% Live Supabase data (Zero LocalStorage Fallback)
  const [events, setEvents] = useState<LotteryEvent[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeReceiptPurchase, setActiveReceiptPurchase] = useState<any>(null);

  // Fetch real live records from Supabase on mount and listen to Realtime changes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [liveEvents, livePurchases] = await Promise.all([
          fetchLiveEvents(),
          fetchLivePurchases()
        ]);
        if (isMounted) {
          setEvents(liveEvents || []);
          setPurchases(livePurchases || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to sync live data:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    const timer = setInterval(loadData, 6000);

    // Supabase Realtime Subscription for Instant Bot-to-Admin Sync
    const channel = supabase
      .channel('admin-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          console.log('[Realtime] Payment update detected from Bot, refreshing...');
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          console.log('[Realtime] Ticket reservation update detected from Bot, refreshing...');
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lottery_events' },
        () => {
          console.log('[Realtime] Lottery event update detected, refreshing...');
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'broadcasts' },
        () => {
          console.log('[Realtime] Broadcast status update detected, refreshing...');
          loadData();
        }
      )
      .subscribe();

    return () => { 
      isMounted = false; 
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const currentUser = getSessionUser() || 'Richo@123';

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const pendingReviewCount = purchases.filter(p => p.status === 'MANUAL_REVIEW').length;

  const handleAddEvent = async (newEvent: LotteryEvent) => {
    // Optimistic UI update
    setEvents(prev => [newEvent, ...prev]);

    // Persist to Supabase
    try {
      const { error: evtError } = await supabase.from('lottery_events').insert({
        id: newEvent.id,
        title: newEvent.title,
        slug: newEvent.slug,
        description: newEvent.description,
        image_url: newEvent.image_url,
        ticket_price: newEvent.ticket_price,
        start_number: newEvent.start_number,
        end_number: newEvent.end_number,
        total_tickets: newEvent.total_tickets,
        payment_provider: newEvent.payment_provider,
        receiver_account_number: newEvent.receiver_account_number,
        receiver_name: newEvent.receiver_name,
        sales_start_at: newEvent.sales_start_at,
        sales_end_at: newEvent.sales_end_at,
        draw_at: newEvent.draw_at,
        status: newEvent.status
      });

      if (evtError) {
        console.error('[Supabase] Failed to insert event:', evtError.message);
        alert(`Failed to save event to database: ${evtError.message}`);
        const refreshed = await fetchLiveEvents();
        setEvents(refreshed || []);
        return;
      }

      // Automatically generate tickets 1..total for this event
      const { error: ticketError } = await supabase.rpc('generate_lottery_tickets', {
        p_event_id: newEvent.id,
        p_start_number: newEvent.start_number,
        p_end_number: newEvent.end_number
      });

      if (ticketError) {
        console.warn('[Supabase] generate_lottery_tickets notice:', ticketError.message);
      }

      // Auto-broadcast new event to Telegram Channel and all subscribers
      try {
        const defaultChannel = localStorage.getItem('lottery_channel_handle') || '@RichoLottery';
        const autoPost = localStorage.getItem('lottery_autopost_events') !== 'false';

        if (autoPost) {
          const descSnippet = newEvent.description ? `\n\n📝 *ሽልማቶች እና ዝርዝር:*\n${newEvent.description}` : '';
          const receiverInfo = `\n\n👤 *ስም:* ${newEvent.receiver_name || 'Richo Ekup'}\n💳 *${newEvent.payment_provider} 👉* \`${newEvent.receiver_account_number}\``;

          await supabase.from('broadcasts').insert({
            event_id: newEvent.id,
            title: `🎉 አዲስ የሎተሪ ውድድር ይፋ ሆኗል! (${newEvent.title})`,
            message_text: `<!--destination:ALL--><!--target_channel:${defaultChannel}-->✨ *${newEvent.title}*\n\n💰 *የአንድ ዕጣ ዋጋ ${newEvent.ticket_price} ብር ብቻ ነው!* 🏆${descSnippet}${receiverInfo}\n\n🔢 *ጠቅላላ ዕጣዎች:* 1 – ${newEvent.total_tickets}\n🗓️ *የዕጣ ቀን:* ${new Date(newEvent.draw_at).toLocaleString()}\n\n📍 አድራሻ: ኢትዮጵያ | መልካም ዕድል! 🙏\n\nዕድልዎን አሁኑኑ ይሞክሩ! ቲኬት ለመቁረጥ ከታች ያለውን አዝራር ይጫኑ።`,
            image_url: newEvent.image_url || null,
            button_text: `🎟️ ይሄንን ዕጣ ምረጥ (${newEvent.ticket_price} ETB)`,
            button_url: `https://t.me/meklawbot?start=event_${newEvent.id}`,
            target_language: 'ALL',
            status: 'SENDING',
            total_recipients: 1
          });
          console.log('[Supabase] Auto-broadcast queued for new event:', newEvent.title);
        }
      } catch (bcErr) {
        console.warn('[Supabase] Auto-broadcast queue warning:', bcErr);
      }

      // Refresh live events from Supabase to sync authoritative state
      const refreshedEvents = await fetchLiveEvents();
      setEvents(refreshedEvents || []);
    } catch (err: any) {
      console.error('[Supabase] Exception in handleAddEvent:', err.message);
    }
  };

  const handleUpdateEventStatus = (eventId: string, newStatus: any) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
    supabase.from('lottery_events').update({ status: newStatus }).eq('id', eventId).then(() => {
      fetchLiveEvents().then(evts => setEvents(evts || []));
    });
  };

  const handleAddManualSale = async (newSale: any) => {
    // 1. Optimistic UI update
    setPurchases(prev => [newSale, ...prev]);

    setEvents(prev => prev.map(e => {
      if (e.id === newSale.eventId) {
        const sold = (e.sold_tickets || 0) + 1;
        return {
          ...e,
          sold_tickets: sold,
          revenue: (e.revenue || 0) + newSale.amount
        };
      }
      return e;
    }));

    // 2. Persist to Supabase
    try {
      // a) Ensure participant exists
      let participantId: string | null = null;
      const { data: existingPart } = await supabase
        .from('participants')
        .select('id')
        .eq('phone_number', newSale.phoneNumber)
        .maybeSingle();

      if (existingPart?.id) {
        participantId = existingPart.id;
      } else {
        const { data: createdPart } = await supabase
          .from('participants')
          .insert({
            full_name: newSale.customerName,
            phone_number: newSale.phoneNumber,
            source: 'MANUAL'
          })
          .select('id')
          .single();
        participantId = createdPart?.id || null;
      }

      if (!participantId) {
        console.error('[Supabase] Could not resolve participant ID for manual sale');
        return;
      }

      // b) Create completed reservation
      const resId = crypto.randomUUID();
      await supabase.from('reservations').insert({
        id: resId,
        event_id: newSale.eventId,
        ticket_number: newSale.ticketNumber,
        participant_id: participantId,
        source: 'MANUAL',
        status: 'COMPLETED',
        reserved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        completed_at: new Date().toISOString()
      });

      // c) Issue ticket in inventory
      await supabase.from('lottery_tickets').update({
        status: 'ISSUED',
        current_reservation_id: resId,
        owner_participant_id: participantId,
        issued_at: new Date().toISOString()
      }).match({
        event_id: newSale.eventId,
        ticket_number: newSale.ticketNumber
      });

      // d) Record verified payment
      await supabase.from('payments').insert({
        id: newSale.id,
        event_id: newSale.eventId,
        ticket_number: newSale.ticketNumber,
        reservation_id: resId,
        participant_id: participantId,
        payment_rail: newSale.provider || 'CASH',
        amount: newSale.amount,
        transaction_reference: newSale.reference || `POS-${Date.now()}`,
        status: 'VERIFIED',
        reviewed_at: new Date().toISOString()
      });

      // e) Increment event totals in DB
      const targetEvent = events.find(e => e.id === newSale.eventId);
      if (targetEvent) {
        await supabase.from('lottery_events').update({
          sold_tickets: (targetEvent.sold_tickets || 0) + 1,
          revenue: (targetEvent.revenue || 0) + newSale.amount
        }).eq('id', newSale.eventId);
      }

      // Refresh live records
      const [liveEvts, livePurchases] = await Promise.all([
        fetchLiveEvents(),
        fetchLivePurchases()
      ]);
      if (liveEvts?.length) setEvents(liveEvts);
      if (livePurchases) setPurchases(livePurchases);
    } catch (err) {
      console.error('[Supabase] Failed to persist manual sale:', err);
    }
  };

  const handleApprovePayment = async (id: string, notes?: string) => {
    const approved = purchases.find(p => p.id === id);
    if (!approved) return;

    // 1. Optimistic UI update
    setPurchases(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'ISSUED' as const, rejectionReason: null };
      }
      return p;
    }));

    setEvents(prev => prev.map(e => {
      if (e.id === approved.eventId) {
        const sold = (e.sold_tickets || 0) + 1;
        return {
          ...e,
          sold_tickets: sold,
          revenue: (e.revenue || 0) + approved.amount
        };
      }
      return e;
    }));
    setActiveReceiptPurchase(null);

    // 2. Comprehensive Database & Bot Sync
    try {
      // a) Update payment status
      await supabase.from('payments').update({ 
        status: 'VERIFIED',
        reviewed_at: new Date().toISOString()
      }).eq('id', id);

      // b) Complete reservation
      if (approved.reservationId) {
        await supabase.from('reservations').update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        }).eq('id', approved.reservationId);
      }

      // c) Issue ticket in inventory
      await supabase.from('lottery_tickets').update({
        status: 'ISSUED',
        owner_participant_id: approved.participantId || null,
        issued_at: new Date().toISOString()
      }).match({
        event_id: approved.eventId,
        ticket_number: approved.ticketNumber
      });

      // d) Increment event revenue & sold tickets
      const targetEvent = events.find(e => e.id === approved.eventId);
      if (targetEvent) {
        await supabase.from('lottery_events').update({
          sold_tickets: (targetEvent.sold_tickets || 0) + 1,
          revenue: (targetEvent.revenue || 0) + approved.amount
        }).eq('id', approved.eventId);
      }

      // e) Queue Telegram bot direct notification ONLY to this specific buyer
      if (approved.telegramUserId) {
        await supabase.from('broadcasts').insert({
          event_id: approved.eventId,
          title: `🎟️ Ticket #${approved.ticketNumber} Payment Confirmed!`,
          message_text: `<!--target_user:${approved.telegramUserId}--><!--destination:USERS-->🎉 *እንኳን ደስ አለዎት! ክፍያዎ ተረጋግጧል!*\n\nለ *${approved.eventTitle}* የቆረጡት ቲኬት ቁጥር *#${approved.ticketNumber}* በተሳካ ሁኔታ ተረጋግጦ ይፋ ሆኗል።\n\nመልካም ዕድል! 🤞`,
          target_language: 'ALL',
          status: 'SENDING',
          total_recipients: 1
        });
      }

      // Refresh live records
      const [liveEvts, livePurchases] = await Promise.all([
        fetchLiveEvents(),
        fetchLivePurchases()
      ]);
      if (liveEvts?.length) setEvents(liveEvts);
      if (livePurchases) setPurchases(livePurchases);
    } catch (err) {
      console.error('[Supabase] Failed to execute full payment approval sync:', err);
    }
  };

  const handleRejectPayment = async (id: string, reason: string) => {
    const rejected = purchases.find(p => p.id === id);
    if (!rejected) return;

    // 1. Optimistic UI update
    setPurchases(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'REJECTED' as const, rejectionReason: reason };
      }
      return p;
    }));
    setActiveReceiptPurchase(null);

    // 2. Comprehensive Database & Bot Sync
    try {
      // a) Update payment status
      await supabase.from('payments').update({ 
        status: 'REJECTED', 
        rejection_reason: reason,
        reviewed_at: new Date().toISOString()
      }).eq('id', id);

      // b) Cancel reservation
      if (rejected.reservationId) {
        await supabase.from('reservations').update({
          status: 'CANCELLED'
        }).eq('id', rejected.reservationId);
      }

      // c) Release ticket back to AVAILABLE inventory
      await supabase.from('lottery_tickets').update({
        status: 'AVAILABLE',
        current_reservation_id: null,
        reserved_by_participant_id: null,
        owner_participant_id: null
      }).match({
        event_id: rejected.eventId,
        ticket_number: rejected.ticketNumber
      });

      // d) Queue Telegram bot notice to user
      if (rejected.telegramUserId) {
        await supabase.from('broadcasts').insert({
          event_id: rejected.eventId,
          title: `⚠️ Payment Notice for Ticket #${rejected.ticketNumber}`,
          message_text: `⚠️ *የክፍያ ማስታወቂያ (Payment Notice)*\n\nለ *${rejected.eventTitle}* የቆረጡት ቲኬት #${rejected.ticketNumber} ክፍያ ተቀባይነት አላገኘም፦\n*ምክንያት:* ${reason}\n\nቲኬቱ ለሌሎች ክፍት እንዲሆን ተደርጓል። ጥያቄ ካለዎት ድጋፍ ሰጪን ያነጋግሩ።`,
          target_language: 'ALL',
          status: 'SENDING',
          total_recipients: 1
        });
      }

      // Refresh live records
      const [liveEvts, livePurchases] = await Promise.all([
        fetchLiveEvents(),
        fetchLivePurchases()
      ]);
      if (liveEvts?.length) setEvents(liveEvts);
      if (livePurchases) setPurchases(livePurchases);
    } catch (err) {
      console.error('[Supabase] Failed to execute payment rejection sync:', err);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        events={events}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        pendingReviewCount={pendingReviewCount}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar 
          events={events}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          currentUser={currentUser}
          pendingReviewCount={pendingReviewCount}
          onLogout={handleLogout}
        />

        {/* Dynamic Page View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <ErrorBoundary>
            {activeTab === 'dashboard' && (
              <Dashboard 
                events={events}
                purchases={purchases}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                onNavigate={setActiveTab}
                onOpenReceipt={(p) => setActiveReceiptPurchase(p)}
              />
            )}

            {activeTab === 'events' && (
              <Events 
                events={events}
                onAddEvent={handleAddEvent}
                onUpdateEventStatus={handleUpdateEventStatus}
                onSelectEvent={(id) => {
                  setSelectedEventId(id);
                  setActiveTab('ticket-grid');
                }}
              />
            )}

            {activeTab === 'purchases' && (
              <Purchases 
                purchases={purchases}
                events={events}
                selectedEventId={selectedEventId}
                onSelectEventId={setSelectedEventId}
                onOpenReceipt={(p) => setActiveReceiptPurchase(p)}
              />
            )}

            {activeTab === 'ticket-grid' && (
              <TicketGrid 
                events={events}
                selectedEventId={selectedEventId}
                onSelectEventId={setSelectedEventId}
                purchases={purchases}
                onOpenReceipt={(p) => setActiveReceiptPurchase(p)}
              />
            )}

            {activeTab === 'broadcast' && (
              <BroadcastPage 
                events={events}
              />
            )}

            {activeTab === 'manual-sales' && (
              <ManualSales 
                events={events}
                purchases={purchases}
                onAddManualSale={handleAddManualSale}
              />
            )}

            {activeTab === 'winners' && (
              <Winners 
                events={events}
                purchases={purchases}
              />
            )}

            {activeTab === 'reports' && (
              <Reports 
                events={events}
                purchases={purchases}
              />
            )}

            {activeTab === 'settings' && (
              <Settings />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Universal Receipt Review Modal */}
      {activeReceiptPurchase && (
        <ReceiptModal 
          purchase={activeReceiptPurchase}
          onClose={() => setActiveReceiptPurchase(null)}
          onApprove={(id, notes) => handleApprovePayment(id, notes)}
          onReject={(id, reason) => handleRejectPayment(id, reason)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AdminContent />
    </I18nProvider>
  );
}

export default App;
