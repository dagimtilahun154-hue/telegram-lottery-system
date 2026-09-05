-- ============================================================================
-- TELEGRAM LOTTERY MANAGEMENT PLATFORM - SUPABASE POSTGRESQL SCHEMA (v2.0)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Telegram Accounts)
CREATE TABLE IF NOT EXISTS public.users (
    telegram_id BIGINT PRIMARY KEY,
    telegram_username TEXT,
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'am', 'om')),
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

-- 3. LOTTERY EVENTS TABLE (Multiple Concurrent Events with Distinct Pricing)
CREATE TABLE IF NOT EXISTS public.lottery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    ticket_price NUMERIC(12, 2) NOT NULL CHECK (ticket_price > 0),
    start_number INT NOT NULL DEFAULT 1 CHECK (start_number > 0),
    end_number INT NOT NULL DEFAULT 5000 CHECK (end_number >= start_number),
    total_tickets INT NOT NULL CHECK (total_tickets > 0),
    payment_provider TEXT NOT NULL CHECK (payment_provider IN ('CBE', 'TELEBIRR', 'DASHEN', 'ABYSSINIA', 'CBE_BIRR', 'MPESA', 'OTHER')),
    receiver_account_number TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    sales_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sales_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    draw_at TIMESTAMP WITH TIME ZONE NOT NULL,
    winner_message TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'OPEN', 'SALES_CLOSED', 'DRAW_PENDING', 'WINNER_SELECTED', 'COMPLETED', 'ARCHIVED')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_event_dates CHECK (sales_end_at > sales_start_at AND draw_at >= sales_end_at)
);

CREATE INDEX IF NOT EXISTS idx_events_status ON public.lottery_events(status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.lottery_events(slug);

-- 4. RESERVATIONS TABLE (15-Minute Reservation Window)
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
    issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_event_ticket_number UNIQUE (event_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_tickets_event_status ON public.lottery_tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON public.lottery_tickets(owner_participant_id);

-- 6. PAYMENTS TABLE (Veritas Verification & Receipt Management)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.lottery_events(id) ON DELETE CASCADE,
    ticket_number INT NOT NULL,
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('CBE', 'TELEBIRR', 'DASHEN', 'ABYSSINIA', 'CBE_BIRR', 'MPESA', 'CASH', 'OTHER')),
    transaction_reference TEXT,
    expected_amount NUMERIC(12, 2) NOT NULL,
    detected_amount NUMERIC(12, 2),
    expected_receiver_account TEXT NOT NULL,
    detected_receiver_account TEXT,
    expected_receiver_name TEXT NOT NULL,
    detected_receiver_name TEXT,
    receipt_url TEXT,
    receipt_hash TEXT,
    veritas_raw_response JSONB,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'EXTRACTING', 'VERIFYING', 'VERIFIED', 'REJECTED', 'MANUAL_REVIEW', 'ERROR')),
    rejection_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Strict reference uniqueness for successfully verified transactions
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_reference ON public.payments(provider, transaction_reference)
    WHERE status = 'VERIFIED' AND transaction_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_event ON public.payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 7. WINNERS TABLE (Draw Results)
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.lottery_events(id) ON DELETE CASCADE,
    ticket_number INT NOT NULL,
    ticket_id UUID NOT NULL REFERENCES public.lottery_tickets(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    selected_by UUID,
    announcement_text TEXT,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_winners_event ON public.winners(event_id);

-- 8. BROADCASTS & BROADCAST LOGS TABLE (Admin to Bot Users)
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
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENDING', 'SENT', 'FAILED')),
    sent_by UUID,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
