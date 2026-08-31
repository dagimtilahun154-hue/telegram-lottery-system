-- ============================================================
-- TELEGRAM LOTTERY & SPOT RESERVATION SYSTEM
-- Supabase PostgreSQL Schema v1.0
-- ============================================================

-- 1. USERS & PROFILES
-- Stores all Telegram users who have registered via phone share.
-- telegram_id is the primary key (from Telegram's user ID).
CREATE TABLE public.users (
    telegram_id BIGINT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    phone_number TEXT UNIQUE NOT NULL,
    language_code TEXT DEFAULT 'am' CHECK (language_code IN ('am', 'en', 'om')),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_users_phone ON public.users(phone_number);
CREATE INDEX idx_users_admin ON public.users(is_admin) WHERE is_admin = TRUE;


-- 2. LOTTERY ITEMS (Products / Prizes)
-- Each item represents a prize (e.g., TV, Phone, Umbrella).
-- Admin configures: ticket count, price, timeline, and draw cycles.
-- Up to 4 items can be ACTIVE simultaneously.
CREATE TABLE public.lottery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    ticket_price NUMERIC(10, 2) NOT NULL,
    total_spots INT NOT NULL CHECK (total_spots > 0),
    max_draw_cycles INT DEFAULT 1 CHECK (max_draw_cycles > 0),
    current_cycle INT DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

CREATE INDEX idx_lottery_items_status ON public.lottery_items(status);


-- 3. LOTTERY ROUNDS (Draws per Item)
-- Each item can have multiple draw rounds (cycles).
-- Winning spot number and winner are recorded after each draw.
CREATE TABLE public.lottery_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.lottery_items(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'DRAWING', 'COMPLETED')),
    winning_spot_number INT,
    winner_user_id BIGINT REFERENCES public.users(telegram_id),
    draw_date TIMESTAMP WITH TIME ZONE,
    tiktok_stream_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(item_id, round_number)
);

CREATE INDEX idx_rounds_item ON public.lottery_rounds(item_id);
CREATE INDEX idx_rounds_status ON public.lottery_rounds(status);


-- 4. TICKETS / SPOT RESERVATIONS
-- Each row = one spot number in a round.
-- Status lifecycle: AVAILABLE → PENDING_PAYMENT → CONFIRMED (or → CANCELLED)
-- OCR fields store extracted payment reference from receipt screenshot.
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.lottery_rounds(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.lottery_items(id) ON DELETE CASCADE,
    spot_number INT NOT NULL,
    user_id BIGINT REFERENCES public.users(telegram_id),
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED')),

    -- Reservation timing
    reserved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Payment & OCR
    payment_method TEXT CHECK (payment_method IN ('TELEBIRR', 'CBE', 'BANK_TRANSFER', NULL)),
    payment_ref_code TEXT,
    ocr_confidence REAL,
    ocr_raw_text TEXT,
    receipt_image_url TEXT,
    receipt_expires_at TIMESTAMP WITH TIME ZONE,  -- 48hr auto-delete window

    -- Admin verification
    verified_by BIGINT REFERENCES public.users(telegram_id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    UNIQUE(round_id, spot_number)
);

-- Prevent reusing the same payment receipt across different tickets
CREATE UNIQUE INDEX idx_tickets_ref_code ON public.tickets(payment_ref_code)
    WHERE payment_ref_code IS NOT NULL;

CREATE INDEX idx_tickets_round ON public.tickets(round_id);
CREATE INDEX idx_tickets_item ON public.tickets(item_id);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_pending_expiry ON public.tickets(expires_at)
    WHERE status = 'PENDING_PAYMENT';


-- 5. BROADCAST LOGS
-- Audit trail for all messages sent to users (announcements, alerts, winner cards).
CREATE TABLE public.broadcast_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.lottery_items(id) ON DELETE SET NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('NEW_ITEM', 'TIKTOK_LIVE', 'CUSTOM_PROMO', 'WINNER')),
    text_content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('PHOTO', 'VIDEO', 'NONE')),
    button_text TEXT,
    button_url TEXT,
    channel_post_id BIGINT,  -- Telegram message ID in the public channel
    sent_count INT DEFAULT 0,
    created_by BIGINT REFERENCES public.users(telegram_id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_broadcast_item ON public.broadcast_logs(item_id);
CREATE INDEX idx_broadcast_type ON public.broadcast_logs(message_type);


-- ============================================================
-- HELPER: Function to release expired spot reservations
-- Run this via Supabase cron (pg_cron) every minute.
-- ============================================================
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    released_count INTEGER;
BEGIN
    UPDATE public.tickets
    SET
        status = 'AVAILABLE',
        user_id = NULL,
        reserved_at = NULL,
        expires_at = NULL,
        payment_method = NULL,
        payment_ref_code = NULL,
        ocr_confidence = NULL,
        ocr_raw_text = NULL,
        receipt_image_url = NULL,
        receipt_expires_at = NULL
    WHERE status = 'PENDING_PAYMENT'
      AND expires_at < now();

    GET DIAGNOSTICS released_count = ROW_COUNT;
    RETURN released_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- HELPER: Function to clean up expired receipt images
-- Run via cron every hour. Clears URLs for images past 48hr window.
-- (Actual file deletion from Supabase Storage done via Edge Function)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_receipts()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE public.tickets
    SET receipt_image_url = NULL, receipt_expires_at = NULL
    WHERE receipt_image_url IS NOT NULL
      AND receipt_expires_at < now()
      AND status = 'CONFIRMED';

    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- CRON SCHEDULES (run in Supabase SQL Editor → pg_cron)
-- ============================================================
-- Release expired reservations every minute:
-- SELECT cron.schedule('release-expired', '* * * * *', 'SELECT release_expired_reservations()');
--
-- Clean up expired receipt URLs every hour:
-- SELECT cron.schedule('cleanup-receipts', '0 * * * *', 'SELECT cleanup_expired_receipts()');
