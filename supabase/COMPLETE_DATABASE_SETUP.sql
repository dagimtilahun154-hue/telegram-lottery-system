-- ============================================================================
-- RICHO EKUP & TELEGRAM LOTTERY SYSTEM — COMPLETE SUPABASE DATABASE SETUP
-- Paste and Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bottnxyxyvecvdladcoe/sql/new
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Telegram accounts registered via Bot)
CREATE TABLE IF NOT EXISTS public.users (
    telegram_id BIGINT PRIMARY KEY,
    telegram_username TEXT,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    language TEXT DEFAULT 'am' CHECK (language IN ('en', 'am', 'om')),
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(telegram_username);


-- 2. PARTICIPANTS TABLE (Unified Buyer Registry across BOT, MANUAL, WALK_IN)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(telegram_id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    telegram_username TEXT,
    source TEXT NOT NULL DEFAULT 'BOT' CHECK (source IN ('BOT', 'MANUAL', 'WALK_IN')),
    created_by_admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_phone ON public.participants(phone_number);


-- 3. LOTTERY EVENTS TABLE (Concurrent Events with Distinct Pricing & Payment Accounts)
CREATE TABLE IF NOT EXISTS public.lottery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    ticket_price NUMERIC(12, 2) NOT NULL CHECK (ticket_price > 0),
    start_number INT NOT NULL DEFAULT 1 CHECK (start_number > 0),
    end_number INT NOT NULL DEFAULT 500 CHECK (end_number >= start_number),
    total_tickets INT NOT NULL CHECK (total_tickets > 0),
    payment_provider TEXT NOT NULL CHECK (payment_provider IN ('CBE', 'TELEBIRR', 'DASHEN', 'ABYSSINIA', 'CBE_BIRR', 'MPESA', 'OTHER')),
    receiver_account_number TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    sales_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sales_end_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    draw_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '31 days'),
    winner_message TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'SCHEDULED', 'OPEN', 'SALES_CLOSED', 'DRAW_PENDING', 'WINNER_SELECTED', 'COMPLETED', 'ARCHIVED')),
    sold_tickets INT NOT NULL DEFAULT 0,
    reserved_tickets INT NOT NULL DEFAULT 0,
    revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_event_dates CHECK (sales_end_at >= sales_start_at AND draw_at >= sales_end_at)
);

CREATE INDEX IF NOT EXISTS idx_events_status ON public.lottery_events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.lottery_events(slug);


-- 4. RESERVATIONS TABLE (15-Minute Reservation Lifecycle)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.lottery_events(id) ON DELETE CASCADE,
    ticket_number INT NOT NULL,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'BOT' CHECK (source IN ('BOT', 'MANUAL', 'WALK_IN')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAYMENT_SUBMITTED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reservations_participant ON public.reservations(participant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires ON public.reservations(expires_at) WHERE status = 'ACTIVE';


-- 5. LOTTERY TICKETS TABLE (Individual Ticket Inventory per Event)
CREATE TABLE IF NOT EXISTS public.lottery_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.lottery_events(id) ON DELETE CASCADE,
    ticket_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'PAYMENT_SUBMITTED', 'VERIFYING', 'MANUAL_REVIEW', 'ISSUED', 'WINNER', 'EXPIRED', 'CANCELLED')),
    current_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    owner_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    reserved_by_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    reserved_at TIMESTAMP WITH TIME ZONE,
    reservation_expires_at TIMESTAMP WITH TIME ZONE,
    issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_event_ticket_number UNIQUE (event_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_tickets_event_status ON public.lottery_tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON public.lottery_tickets(owner_participant_id);

-- Compatibility view so queries targeting 'tickets' or 'lottery_tickets' both succeed
CREATE OR REPLACE VIEW public.tickets AS 
SELECT * FROM public.lottery_tickets;


-- 6. PAYMENTS TABLE (Veritas Verification & Receipt Management)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.lottery_events(id) ON DELETE CASCADE,
    ticket_number INT NOT NULL,
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    payment_rail TEXT NOT NULL DEFAULT 'TELEBIRR' CHECK (payment_rail IN ('CBE', 'TELEBIRR', 'DASHEN', 'ABYSSINIA', 'CBE_BIRR', 'MPESA', 'CASH', 'OTHER')),
    amount NUMERIC(12, 2) NOT NULL,
    transaction_reference TEXT,
    proof_image_url TEXT,
    detected_account TEXT,
    detected_name TEXT,
    detected_amount NUMERIC(12, 2),
    veritas_verification_id TEXT,
    veritas_raw_response JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFYING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED')),
    rejection_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_event ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(transaction_reference);


-- 7. BROADCASTS TABLE (Admin Channel & User Messaging Queue)
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.lottery_events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message_text TEXT NOT NULL,
    image_url TEXT,
    button_text TEXT,
    button_url TEXT,
    target_language TEXT DEFAULT 'ALL' CHECK (target_language IN ('ALL', 'en', 'am', 'om')),
    target_event_buyers_only BOOLEAN DEFAULT FALSE,
    total_recipients INT DEFAULT 0,
    successful_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENDING', 'SENT', 'FAILED')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON public.broadcasts(status);


-- 8. WINNERS TABLE (Provably-Fair Draw Winners)
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.lottery_events(id) ON DELETE CASCADE,
    ticket_number INT NOT NULL,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    prize_title TEXT NOT NULL,
    draw_method TEXT NOT NULL DEFAULT 'PROVABLY_FAIR' CHECK (draw_method IN ('PROVABLY_FAIR', 'MANUAL_SELECTION', 'RANDOM_ALGORITHM')),
    provably_fair_seed TEXT,
    provably_fair_hash TEXT,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notified_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_winners_event ON public.winners(event_id);


-- ============================================================================
-- 9. ATOMIC STORED PROCEDURES (Concurrency Protection & Sequential Rules)
-- ============================================================================

-- Function: Generate bulk tickets for an event
CREATE OR REPLACE FUNCTION public.generate_lottery_tickets(
    p_event_id UUID,
    p_start_number INT DEFAULT 1,
    p_end_number INT DEFAULT 500
)
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO public.lottery_tickets (event_id, ticket_number, status)
    SELECT p_event_id, s.num, 'AVAILABLE'
    FROM generate_series(p_start_number, p_end_number) AS s(num)
    ON CONFLICT (event_id, ticket_number) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Atomic Ticket Reservation (15-Minute Lock)
CREATE OR REPLACE FUNCTION public.reserve_ticket_atomic(
    p_event_id UUID,
    p_ticket_number INT,
    p_participant_id UUID,
    p_source TEXT DEFAULT 'BOT',
    p_duration_minutes INT DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
    v_event RECORD;
    v_ticket RECORD;
    v_new_res_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verify event is open
    SELECT * INTO v_event FROM public.lottery_events WHERE id = p_event_id;
    IF NOT FOUND OR v_event.status <> 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_OPEN', 'message', 'This event is not open for ticket sales.');
    END IF;

    -- Row-level lock on ticket
    SELECT * INTO v_ticket 
    FROM public.lottery_tickets 
    WHERE event_id = p_event_id AND ticket_number = p_ticket_number 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_NOT_FOUND', 'message', 'Ticket number does not exist.');
    END IF;

    IF v_ticket.status <> 'AVAILABLE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_UNAVAILABLE', 'message', 'This ticket number is already reserved or issued.');
    END IF;

    v_expires_at := now() + (p_duration_minutes || ' minutes')::INTERVAL;

    -- Create reservation
    INSERT INTO public.reservations (
        event_id, ticket_number, participant_id, source, status, reserved_at, expires_at
    ) VALUES (
        p_event_id, p_ticket_number, p_participant_id, p_source, 'ACTIVE', now(), v_expires_at
    ) RETURNING id INTO v_new_res_id;

    -- Update ticket status
    UPDATE public.lottery_tickets
    SET status = 'RESERVED',
        current_reservation_id = v_new_res_id,
        reserved_by_participant_id = p_participant_id,
        reserved_at = now(),
        reservation_expires_at = v_expires_at,
        updated_at = now()
    WHERE id = v_ticket.id;

    -- Update event reservation count
    UPDATE public.lottery_events
    SET reserved_tickets = reserved_tickets + 1,
        updated_at = now()
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_new_res_id,
        'ticket_number', p_ticket_number,
        'expires_at', v_expires_at,
        'duration_minutes', p_duration_minutes,
        'ticket_price', v_event.ticket_price,
        'payment_provider', v_event.payment_provider,
        'receiver_account_number', v_event.receiver_account_number,
        'receiver_name', v_event.receiver_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Release Expired Reservations
CREATE OR REPLACE FUNCTION public.release_expired_reservations_atomic()
RETURNS JSONB AS $$
DECLARE
    v_released_count INT := 0;
    r RECORD;
BEGIN
    FOR r IN
        SELECT res.id AS reservation_id, res.event_id, res.ticket_number
        FROM public.reservations res
        WHERE res.status = 'ACTIVE' AND res.expires_at < now()
        FOR UPDATE
    LOOP
        UPDATE public.reservations
        SET status = 'EXPIRED', updated_at = now()
        WHERE id = r.reservation_id;

        UPDATE public.lottery_tickets
        SET status = 'AVAILABLE',
            current_reservation_id = NULL,
            reserved_by_participant_id = NULL,
            reserved_at = NULL,
            reservation_expires_at = NULL,
            updated_at = now()
        WHERE event_id = r.event_id AND ticket_number = r.ticket_number AND status = 'RESERVED';

        UPDATE public.lottery_events
        SET reserved_tickets = GREATEST(0, reserved_tickets - 1),
            updated_at = now()
        WHERE id = r.event_id;

        v_released_count := v_released_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'released_count', v_released_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated full read access
CREATE POLICY "Public read events" ON public.lottery_events FOR SELECT USING (true);
CREATE POLICY "Public read tickets" ON public.lottery_tickets FOR SELECT USING (true);
CREATE POLICY "Public read winners" ON public.winners FOR SELECT USING (true);
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public read participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Public read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Public read broadcasts" ON public.broadcasts FOR SELECT USING (true);

-- Allow anon and authenticated inserts/updates for operational flow
CREATE POLICY "Allow anon insert users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow anon insert participants" ON public.participants FOR ALL USING (true);
CREATE POLICY "Allow anon insert events" ON public.lottery_events FOR ALL USING (true);
CREATE POLICY "Allow anon manage payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow anon manage reservations" ON public.reservations FOR ALL USING (true);
CREATE POLICY "Allow anon manage tickets" ON public.lottery_tickets FOR ALL USING (true);
CREATE POLICY "Allow anon manage broadcasts" ON public.broadcasts FOR ALL USING (true);


-- ============================================================================
-- 11. INITIAL SEED DATA (2 Active Ethiopian Grand Lotteries)
-- ============================================================================

DO $$
DECLARE
    v_evt1_id UUID := 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
    v_evt2_id UUID := 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
BEGIN
    -- Event 1: iPhone 16 Pro Max
    INSERT INTO public.lottery_events (
        id, title, slug, description, image_url, ticket_price,
        start_number, end_number, total_tickets, payment_provider,
        receiver_account_number, receiver_name, status
    ) VALUES (
        v_evt1_id,
        'iPhone 16 Pro Max 256GB Grand Ekup',
        'iphone-16-pro-max-grand-ekup',
        'Win a brand new sealed iPhone 16 Pro Max 256GB Natural Titanium! Daily live draw via provably fair random selection.',
        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800',
        100.00,
        1, 500, 500, 'TELEBIRR',
        '0911234567', 'Richo Ekup Official', 'OPEN'
    ) ON CONFLICT (id) DO NOTHING;

    -- Event 2: Samsung Galaxy S25 Ultra
    INSERT INTO public.lottery_events (
        id, title, slug, description, image_url, ticket_price,
        start_number, end_number, total_tickets, payment_provider,
        receiver_account_number, receiver_name, status
    ) VALUES (
        v_evt2_id,
        'Samsung Galaxy S25 Ultra 512GB Draw',
        'samsung-galaxy-s25-ultra-draw',
        'Win the flagship Samsung Galaxy S25 Ultra Titanium Black! Verified via CBE direct transaction matching.',
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800',
        150.00,
        1, 500, 500, 'CBE',
        '1000123456789', 'Richo Ekup Enterprises', 'OPEN'
    ) ON CONFLICT (id) DO NOTHING;

    -- Generate tickets for both events
    PERFORM public.generate_lottery_tickets(v_evt1_id, 1, 500);
    PERFORM public.generate_lottery_tickets(v_evt2_id, 1, 500);

END $$;
