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

function AdminContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState('ALL');

  // Real State: Live Supabase data with 10s auto-refresh
  const [events, setEvents] = useState<LotteryEvent[]>(() => {
    try {
      const saved = localStorage.getItem('lottery_admin_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((e: any) => !String(e.id).startsWith('evt-'));
        return filtered;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('lottery_admin_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeReceiptPurchase, setActiveReceiptPurchase] = useState<any>(null);

  // Fetch real live records from Supabase on mount and poll every 10 seconds
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [liveEvents, livePurchases] = await Promise.all([
          fetchLiveEvents(),
          fetchLivePurchases()
        ]);
        if (isMounted) {
          if (liveEvents && liveEvents.length > 0) {
            setEvents(liveEvents);
            localStorage.setItem('lottery_admin_events', JSON.stringify(liveEvents));
          }
          if (livePurchases) {
            setPurchases(livePurchases);
            localStorage.setItem('lottery_admin_purchases', JSON.stringify(livePurchases));
          }
        }
      } catch (err) {
        console.error('Failed to sync live data:', err);
      }
    }
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => { 
      isMounted = false; 
      clearInterval(timer);
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
    const updated = [newEvent, ...events];
    setEvents(updated);
    localStorage.setItem('lottery_admin_events', JSON.stringify(updated));

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

      // Refresh live events from Supabase to sync authoritative state
      const refreshedEvents = await fetchLiveEvents();
      if (refreshedEvents && refreshedEvents.length > 0) {
        setEvents(refreshedEvents);
        localStorage.setItem('lottery_admin_events', JSON.stringify(refreshedEvents));
      }
    } catch (err: any) {
      console.error('[Supabase] Exception in handleAddEvent:', err.message);
    }
  };

  const handleUpdateEventStatus = (eventId: string, newStatus: any) => {
    const updated = events.map(e => e.id === eventId ? { ...e, status: newStatus } : e);
    setEvents(updated);
    localStorage.setItem('lottery_admin_events', JSON.stringify(updated));
    supabase.from('lottery_events').update({ status: newStatus }).eq('id', eventId).then();
  };

  const handleAddManualSale = async (newSale: any) => {
    // 1. Optimistic UI update
    const updatedPurchases = [newSale, ...purchases];
    setPurchases(updatedPurchases);
    localStorage.setItem('lottery_admin_purchases', JSON.stringify(updatedPurchases));

    const updatedEvents = events.map(e => {
      if (e.id === newSale.eventId) {
        const sold = (e.sold_tickets || 0) + 1;
        return {
          ...e,
          sold_tickets: sold,
          revenue: (e.revenue || 0) + newSale.amount
        };
      }
      return e;
    });
    setEvents(updatedEvents);
    localStorage.setItem('lottery_admin_events', JSON.stringify(updatedEvents));

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
    const updatedPurchases = purchases.map(p => {
      if (p.id === id) {
        return { ...p, status: 'ISSUED' as const, rejectionReason: null };
      }
      return p;
    });
    setPurchases(updatedPurchases);
    localStorage.setItem('lottery_admin_purchases', JSON.stringify(updatedPurchases));

    const updatedEvents = events.map(e => {
      if (e.id === approved.eventId) {
        const sold = (e.sold_tickets || 0) + 1;
        return {
          ...e,
          sold_tickets: sold,
          revenue: (e.revenue || 0) + approved.amount
        };
      }
      return e;
    });
    setEvents(updatedEvents);
    localStorage.setItem('lottery_admin_events', JSON.stringify(updatedEvents));
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

      // e) Queue Telegram bot direct notification if participant has a telegram ID
      if (approved.telegramUserId) {
        await supabase.from('broadcasts').insert({
          event_id: approved.eventId,
          title: `🎟️ Ticket #${approved.ticketNumber} Payment Confirmed!`,
          message_text: `🎉 *እንኳን ደስ አለዎት! ክፍያዎ ተረጋግጧል!*\n\nለ *${approved.eventTitle}* የቆረጡት ቲኬት ቁጥር *#${approved.ticketNumber}* በተሳካ ሁኔታ ተረጋግጦ ይፋ ሆኗል።\n\nመልካም ዕድል! 🤞`,
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
    const updatedPurchases = purchases.map(p => {
      if (p.id === id) {
        return { ...p, status: 'REJECTED' as const, rejectionReason: reason };
      }
      return p;
    });
    setPurchases(updatedPurchases);
    localStorage.setItem('lottery_admin_purchases', JSON.stringify(updatedPurchases));
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
          {activeTab === 'dashboard' && (
            <Dashboard 
              events={events}
              purchases={purchases}
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
