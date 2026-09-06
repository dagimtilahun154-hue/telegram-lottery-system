-- ============================================================================
-- RICHO EKUP & TELEGRAM LOTTERY SYSTEM — COMPLETE SUPABASE DATABASE SETUP
-- 100% IDEMPOTENT (Safe to run multiple times on existing or new databases)
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

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'am';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

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
    payment_provider TEXT NOT NULL CHECK (payment_provider IN ('CBE', 'TELEBIRR', 'DASHEN', 'ABYSSINIA', 'CBE_BIRR', 'MPESA', 'CASH', 'OTHER')),
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lottery_events ADD COLUMN IF NOT EXISTS sold_tickets INT NOT NULL DEFAULT 0;
ALTER TABLE public.lottery_events ADD COLUMN IF NOT EXISTS reserved_tickets INT NOT NULL DEFAULT 0;
ALTER TABLE public.lottery_events ADD COLUMN IF NOT EXISTS revenue NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.lottery_events ADD COLUMN IF NOT EXISTS winner_message TEXT;

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

ALTER TABLE public.lottery_tickets ADD COLUMN IF NOT EXISTS reserved_by_participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL;
ALTER TABLE public.lottery_tickets ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.lottery_tickets ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE;

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
    provider TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    expected_amount NUMERIC(12, 2),
    detected_amount NUMERIC(12, 2),
    transaction_reference TEXT,
    proof_image_url TEXT,
    receipt_url TEXT,
    expected_receiver_account TEXT,
    detected_account TEXT,
    detected_receiver_account TEXT,
    expected_receiver_name TEXT,
    detected_name TEXT,
    detected_receiver_name TEXT,
    veritas_verification_id TEXT,
    veritas_raw_response JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'EXTRACTING', 'VERIFYING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED', 'ERROR')),
    rejection_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS detected_amount NUMERIC(12, 2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS expected_receiver_account TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS detected_receiver_account TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS expected_receiver_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS detected_receiver_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

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
    ticket_id UUID REFERENCES public.lottery_tickets(id) ON DELETE SET NULL,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    prize_title TEXT NOT NULL,
    draw_method TEXT NOT NULL DEFAULT 'PROVABLY_FAIR' CHECK (draw_method IN ('PROVABLY_FAIR', 'MANUAL_SELECTION', 'RANDOM_ALGORITHM')),
    provably_fair_seed TEXT,
    provably_fair_hash TEXT,
    selected_by UUID,
    announcement_text TEXT,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    notified_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_winners_event ON public.winners(event_id);


-- 9. AUDIT LOGS TABLE (For Admin Actions & Traceability)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);


-- ============================================================================
-- 10. ATOMIC STORED PROCEDURES (Concurrency Protection & Sequential Rules)
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
    v_existing_reservation RECORD;
    v_new_res_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Ensure event exists and is OPEN
    SELECT * INTO v_event FROM public.lottery_events WHERE id = p_event_id;
    IF NOT FOUND OR v_event.status <> 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_OPEN', 'message', 'This event is not open for ticket sales.');
    END IF;

    -- 2. Sequential Protection: User cannot hold multiple active unpaid tickets at once
    SELECT * INTO v_existing_reservation 
    FROM public.reservations 
    WHERE participant_id = p_participant_id 
      AND status IN ('ACTIVE', 'PAYMENT_SUBMITTED')
      AND expires_at > now()
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'ACTIVE_RESERVATION_EXISTS', 
            'message', 'You already have an active ticket reservation. Please complete payment or cancel it first.',
            'active_ticket_number', v_existing_reservation.ticket_number,
            'active_event_id', v_existing_reservation.event_id,
            'expires_at', v_existing_reservation.expires_at
        );
    END IF;

    -- 3. Row-level lock on ticket
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

    -- 4. Create reservation
    INSERT INTO public.reservations (
        event_id, ticket_number, participant_id, source, status, reserved_at, expires_at
    ) VALUES (
        p_event_id, p_ticket_number, p_participant_id, p_source, 'ACTIVE', now(), v_expires_at
    ) RETURNING id INTO v_new_res_id;

    -- 5. Update ticket status
    UPDATE public.lottery_tickets
    SET status = 'RESERVED',
        current_reservation_id = v_new_res_id,
        reserved_by_participant_id = p_participant_id,
        reserved_at = now(),
        reservation_expires_at = v_expires_at,
        updated_at = now()
    WHERE id = v_ticket.id;

    -- 6. Update event reservation count
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
        WHERE res.status = 'ACTIVE' AND res.expires_at <= now()
        FOR UPDATE SKIP LOCKED
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

    RETURN jsonb_build_object('success', true, 'released_count', v_released_count, 'checked_at', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Submit Payment Receipt
CREATE OR REPLACE FUNCTION public.submit_payment_receipt_atomic(
    p_reservation_id UUID,
    p_receipt_url TEXT,
    p_provider TEXT DEFAULT 'TELEBIRR',
    p_extracted_ref TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_event RECORD;
    v_payment_id UUID;
BEGIN
    SELECT * INTO v_res FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_res.status NOT IN ('ACTIVE', 'PAYMENT_SUBMITTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_RESERVATION_STATE', 'message', 'Reservation is already ' || v_res.status);
    END IF;

    SELECT * INTO v_event FROM public.lottery_events WHERE id = v_res.event_id;

    -- Update reservation state
    UPDATE public.reservations 
    SET 
        status = 'PAYMENT_SUBMITTED',
        payment_submitted_at = now(),
        updated_at = now()
    WHERE id = p_reservation_id;

    -- Lock ticket in PAYMENT_SUBMITTED
    UPDATE public.lottery_tickets 
    SET 
        status = 'PAYMENT_SUBMITTED',
        updated_at = now()
    WHERE event_id = v_res.event_id AND ticket_number = v_res.ticket_number;

    -- Insert Payment record
    INSERT INTO public.payments (
        event_id,
        ticket_number,
        reservation_id,
        participant_id,
        payment_rail,
        provider,
        transaction_reference,
        amount,
        expected_amount,
        expected_receiver_account,
        expected_receiver_name,
        proof_image_url,
        receipt_url,
        status
    ) VALUES (
        v_res.event_id,
        v_res.ticket_number,
        p_reservation_id,
        v_res.participant_id,
        p_provider,
        p_provider,
        p_extracted_ref,
        v_event.ticket_price,
        v_event.ticket_price,
        v_event.receiver_account_number,
        v_event.receiver_name,
        p_receipt_url,
        p_receipt_url,
        'VERIFYING'
    )
    RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'reservation_id', p_reservation_id,
        'ticket_number', v_res.ticket_number,
        'event_id', v_res.event_id,
        'ticket_price', v_event.ticket_price,
        'expected_account', v_event.receiver_account_number,
        'expected_name', v_event.receiver_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Verify Payment and Issue Ticket
CREATE OR REPLACE FUNCTION public.verify_and_issue_ticket_atomic(
    p_payment_id UUID,
    p_veritas_raw JSONB,
    p_detected_provider TEXT,
    p_detected_ref TEXT,
    p_detected_amount NUMERIC,
    p_detected_account TEXT,
    p_detected_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_pay RECORD;
    v_event RECORD;
    v_res RECORD;
    v_norm_detected_name TEXT;
    v_norm_expected_name TEXT;
    v_is_account_match BOOLEAN;
    v_is_name_match BOOLEAN;
    v_is_amount_match BOOLEAN;
    v_duplicate_count INT;
BEGIN
    SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND');
    END IF;

    SELECT * INTO v_event FROM public.lottery_events WHERE id = v_pay.event_id;
    SELECT * INTO v_res FROM public.reservations WHERE id = v_pay.reservation_id FOR UPDATE;

    -- Check Criterion 4: Duplicate Reference Check
    IF p_detected_ref IS NOT NULL THEN
        SELECT COUNT(*) INTO v_duplicate_count 
        FROM public.payments 
        WHERE (payment_rail = p_detected_provider OR provider = p_detected_provider)
          AND transaction_reference = p_detected_ref 
          AND status = 'VERIFIED'
          AND id <> p_payment_id;

        IF v_duplicate_count > 0 THEN
            UPDATE public.payments 
            SET 
                status = 'REJECTED', 
                rejection_reason = 'DUPLICATE_REFERENCE',
                veritas_raw_response = p_veritas_raw,
                updated_at = now()
            WHERE id = p_payment_id;

            UPDATE public.lottery_tickets 
            SET status = 'MANUAL_REVIEW', updated_at = now() 
            WHERE event_id = v_pay.event_id AND ticket_number = v_pay.ticket_number;

            RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REFERENCE', 'message', 'This transaction reference has already been used.');
        END IF;
    END IF;

    -- Check Criterion 1: Receiver Account Number
    v_is_account_match := (p_detected_account IS NOT NULL AND p_detected_account = v_event.receiver_account_number);

    -- Check Criterion 2: Receiver Name (Normalized check)
    v_norm_detected_name := lower(regexp_replace(COALESCE(p_detected_name, ''), '\s+', ' ', 'g'));
    v_norm_expected_name := lower(regexp_replace(COALESCE(v_event.receiver_name, ''), '\s+', ' ', 'g'));
    v_is_name_match := (
        v_norm_detected_name = v_norm_expected_name 
        OR position(v_norm_expected_name in v_norm_detected_name) > 0 
        OR position(v_norm_detected_name in v_norm_expected_name) > 0
    );

    -- Check Criterion 3: Exact Ticket Price
    v_is_amount_match := (p_detected_amount IS NOT NULL AND p_detected_amount >= v_event.ticket_price);

    -- ALL 4 MATCH GATE
    IF v_is_account_match AND v_is_name_match AND v_is_amount_match THEN
        -- 1. Update Payment to VERIFIED
        UPDATE public.payments 
        SET 
            payment_rail = p_detected_provider,
            provider = p_detected_provider,
            transaction_reference = p_detected_ref,
            detected_amount = p_detected_amount,
            detected_account = p_detected_account,
            detected_receiver_account = p_detected_account,
            detected_name = p_detected_name,
            detected_receiver_name = p_detected_name,
            veritas_raw_response = p_veritas_raw,
            status = 'VERIFIED',
            verified_at = now(),
            updated_at = now()
        WHERE id = p_payment_id;

        -- 2. Complete Reservation
        UPDATE public.reservations 
        SET 
            status = 'COMPLETED',
            completed_at = now(),
            updated_at = now()
        WHERE id = v_pay.reservation_id;

        -- 3. Issue Ticket
        UPDATE public.lottery_tickets 
        SET 
            status = 'ISSUED',
            owner_participant_id = v_pay.participant_id,
            issued_at = now(),
            updated_at = now()
        WHERE event_id = v_pay.event_id AND ticket_number = v_pay.ticket_number;

        -- 4. Update Event stats
        UPDATE public.lottery_events
        SET 
            sold_tickets = sold_tickets + 1,
            reserved_tickets = GREATEST(0, reserved_tickets - 1),
            revenue = revenue + p_detected_amount,
            updated_at = now()
        WHERE id = v_pay.event_id;

        RETURN jsonb_build_object(
            'success', true,
            'status', 'ISSUED',
            'ticket_number', v_pay.ticket_number,
            'event_title', v_event.title,
            'verified_amount', p_detected_amount,
            'transaction_reference', p_detected_ref
        );
    ELSE
        -- Record mismatch reason and escalate to MANUAL_REVIEW
        DECLARE
            v_reason TEXT := '';
        BEGIN
            IF NOT v_is_account_match THEN 
                v_reason := v_reason || 'WRONG_RECEIVER_ACCOUNT (Got: ' || COALESCE(p_detected_account, 'null') || ', Expected: ' || v_event.receiver_account_number || '); ';
            END IF;
            IF NOT v_is_name_match THEN 
                v_reason := v_reason || 'WRONG_RECEIVER_NAME (Got: ' || COALESCE(p_detected_name, 'null') || ', Expected: ' || v_event.receiver_name || '); ';
            END IF;
            IF NOT v_is_amount_match THEN 
                v_reason := v_reason || 'INSUFFICIENT_AMOUNT (Got: ' || COALESCE(p_detected_amount::text, '0') || ', Expected: ' || v_event.ticket_price::text || '); ';
            END IF;

            UPDATE public.payments 
            SET 
                payment_rail = p_detected_provider,
                provider = p_detected_provider,
                transaction_reference = p_detected_ref,
                detected_amount = p_detected_amount,
                detected_account = p_detected_account,
                detected_receiver_account = p_detected_account,
                detected_name = p_detected_name,
                detected_receiver_name = p_detected_name,
                veritas_raw_response = p_veritas_raw,
                status = 'MANUAL_REVIEW',
                rejection_reason = v_reason,
                updated_at = now()
            WHERE id = p_payment_id;

            UPDATE public.lottery_tickets 
            SET status = 'MANUAL_REVIEW', updated_at = now() 
            WHERE event_id = v_pay.event_id AND ticket_number = v_pay.ticket_number;

            RETURN jsonb_build_object(
                'success', false,
                'status', 'MANUAL_REVIEW',
                'reason', v_reason,
                'ticket_number', v_pay.ticket_number,
                'message', 'Payment routed to manual review.'
            );
        END;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Admin Manual Override
CREATE OR REPLACE FUNCTION public.admin_review_payment_atomic(
    p_payment_id UUID,
    p_admin_id UUID,
    p_decision TEXT, -- 'APPROVE' or 'REJECT'
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_pay RECORD;
    v_res RECORD;
    v_event RECORD;
BEGIN
    SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND');
    END IF;

    SELECT * INTO v_res FROM public.reservations WHERE id = v_pay.reservation_id FOR UPDATE;
    SELECT * INTO v_event FROM public.lottery_events WHERE id = v_pay.event_id;

    IF p_decision = 'APPROVE' THEN
        -- Mark payment verified
        UPDATE public.payments 
        SET 
            status = 'VERIFIED',
            reviewed_by = p_admin_id,
            reviewed_at = now(),
            verified_at = now(),
            updated_at = now()
        WHERE id = p_payment_id;

        -- Complete reservation
        UPDATE public.reservations 
        SET status = 'COMPLETED', completed_at = now(), updated_at = now() 
        WHERE id = v_pay.reservation_id;

        -- Issue ticket
        UPDATE public.lottery_tickets 
        SET 
            status = 'ISSUED',
            owner_participant_id = v_pay.participant_id,
            issued_at = now(),
            updated_at = now()
        WHERE event_id = v_pay.event_id AND ticket_number = v_pay.ticket_number;

        -- Increment event totals
        UPDATE public.lottery_events
        SET 
            sold_tickets = sold_tickets + 1,
            reserved_tickets = GREATEST(0, reserved_tickets - 1),
            revenue = revenue + v_pay.amount,
            updated_at = now()
        WHERE id = v_pay.event_id;

        -- Audit log
        INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_value, reason)
        VALUES (p_admin_id, 'PAYMENT_MANUALLY_APPROVED', 'payments', p_payment_id::text, jsonb_build_object('ticket', v_pay.ticket_number), p_notes);

        RETURN jsonb_build_object('success', true, 'status', 'ISSUED');
    ELSE
        -- Reject
        UPDATE public.payments 
        SET 
            status = 'REJECTED',
            rejection_reason = p_notes,
            reviewed_by = p_admin_id,
            reviewed_at = now(),
            updated_at = now()
        WHERE id = p_payment_id;

        -- Cancel reservation
        UPDATE public.reservations 
        SET status = 'CANCELLED', updated_at = now() 
        WHERE id = v_pay.reservation_id;

        -- Release ticket to AVAILABLE
        UPDATE public.lottery_tickets 
        SET 
            status = 'AVAILABLE',
            current_reservation_id = NULL,
            reserved_by_participant_id = NULL,
            reserved_at = NULL,
            reservation_expires_at = NULL,
            updated_at = now()
        WHERE event_id = v_pay.event_id AND ticket_number = v_pay.ticket_number;

        -- Decrement event reserved count
        UPDATE public.lottery_events
        SET reserved_tickets = GREATEST(0, reserved_tickets - 1),
            updated_at = now()
        WHERE id = v_pay.event_id;

        -- Audit log
        INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_value, reason)
        VALUES (p_admin_id, 'PAYMENT_MANUALLY_REJECTED', 'payments', p_payment_id::text, jsonb_build_object('ticket', v_pay.ticket_number), p_notes);

        RETURN jsonb_build_object('success', true, 'status', 'AVAILABLE');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES (Idempotent: Drop if exists then create)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Public read events" ON public.lottery_events;
CREATE POLICY "Public read events" ON public.lottery_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read tickets" ON public.lottery_tickets;
CREATE POLICY "Public read tickets" ON public.lottery_tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read winners" ON public.winners;
CREATE POLICY "Public read winners" ON public.winners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read users" ON public.users;
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read participants" ON public.participants;
CREATE POLICY "Public read participants" ON public.participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read payments" ON public.payments;
CREATE POLICY "Public read payments" ON public.payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read broadcasts" ON public.broadcasts;
CREATE POLICY "Public read broadcasts" ON public.broadcasts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read audit_logs" ON public.audit_logs;
CREATE POLICY "Public read audit_logs" ON public.audit_logs FOR SELECT USING (true);

-- Manage/Insert policies
DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
CREATE POLICY "Allow anon insert users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon insert participants" ON public.participants;
CREATE POLICY "Allow anon insert participants" ON public.participants FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon insert events" ON public.lottery_events;
CREATE POLICY "Allow anon insert events" ON public.lottery_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon manage payments" ON public.payments;
CREATE POLICY "Allow anon manage payments" ON public.payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon manage reservations" ON public.reservations;
CREATE POLICY "Allow anon manage reservations" ON public.reservations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon manage tickets" ON public.lottery_tickets;
CREATE POLICY "Allow anon manage tickets" ON public.lottery_tickets FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon manage broadcasts" ON public.broadcasts;
CREATE POLICY "Allow anon manage broadcasts" ON public.broadcasts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon manage winners" ON public.winners;
CREATE POLICY "Allow anon manage winners" ON public.winners FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon insert audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon insert audit_logs" ON public.audit_logs FOR ALL USING (true);


-- ============================================================================
-- 12. INITIAL SEED DATA (2 Active Ethiopian Grand Lotteries)
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
