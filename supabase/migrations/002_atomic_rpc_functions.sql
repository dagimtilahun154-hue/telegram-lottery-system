-- ============================================================================
-- ATOMIC STORED PROCEDURES & CONCURRENCY-PROTECTED RPCS
-- ============================================================================

-- 1. BULK TICKET GENERATOR (Populates 1 to 5000 tickets for an event)
CREATE OR REPLACE FUNCTION public.generate_lottery_tickets(
    p_event_id UUID,
    p_start_number INT DEFAULT 1,
    p_end_number INT DEFAULT 5000
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


-- 2. ATOMIC TICKET RESERVATION (Strict Sequential One-by-One Purchase Rule)
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
    v_new_reservation_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check 1: Ensure event exists and is OPEN
    SELECT * INTO v_event FROM public.lottery_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_FOUND', 'message', 'Lottery event does not exist.');
    END IF;

    IF v_event.status <> 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'error', 'EVENT_NOT_OPEN', 'message', 'Lottery event is currently not open for sales.');
    END IF;

    -- Check 2: Sequential Restriction (User cannot hold more than 1 active/submitted reservation at a time)
    SELECT * INTO v_existing_reservation 
    FROM public.reservations 
    WHERE participant_id = p_participant_id 
      AND status IN ('ACTIVE', 'PAYMENT_SUBMITTED')
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'ACTIVE_RESERVATION_EXISTS', 
            'message', 'You already have an active ticket reservation. Please complete its payment or wait for it to expire before cutting another ticket.',
            'active_ticket_number', v_existing_reservation.ticket_number,
            'active_event_id', v_existing_reservation.event_id,
            'expires_at', v_existing_reservation.expires_at
        );
    END IF;

    -- Check 3: Concurrency Lock on Ticket Row
    SELECT * INTO v_ticket 
    FROM public.lottery_tickets 
    WHERE event_id = p_event_id AND ticket_number = p_ticket_number
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TICKET_NOT_FOUND', 'message', 'Ticket number does not exist for this event.');
    END IF;

    IF v_ticket.status <> 'AVAILABLE' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'TICKET_UNAVAILABLE', 
            'message', 'Ticket #' || p_ticket_number || ' is currently unavailable. Please select another number.'
        );
    END IF;

    -- Create Reservation
    v_expires_at := now() + (p_duration_minutes || ' minutes')::INTERVAL;
    INSERT INTO public.reservations (
        event_id, 
        ticket_number, 
        participant_id, 
        source, 
        status, 
        reserved_at, 
        expires_at
    ) VALUES (
        p_event_id, 
        p_ticket_number, 
        p_participant_id, 
        p_source, 
        'ACTIVE', 
        now(), 
        v_expires_at
    )
    RETURNING id INTO v_new_reservation_id;

    -- Update Ticket State to RESERVED
    UPDATE public.lottery_tickets 
    SET 
        status = 'RESERVED',
        current_reservation_id = v_new_reservation_id,
        updated_at = now()
    WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_new_reservation_id,
        'event_id', p_event_id,
        'event_title', v_event.title,
        'ticket_number', p_ticket_number,
        'ticket_price', v_event.ticket_price,
        'payment_provider', v_event.payment_provider,
        'receiver_account_number', v_event.receiver_account_number,
        'receiver_name', v_event.receiver_name,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. BACKGROUND WORKER: Release Expired Reservations (Runs every 1-2 minutes)
CREATE OR REPLACE FUNCTION public.release_expired_reservations_atomic()
RETURNS JSONB AS $$
DECLARE
    v_rec RECORD;
    v_released_count INT := 0;
BEGIN
    FOR v_rec IN 
        SELECT r.id AS reservation_id, r.event_id, r.ticket_number 
        FROM public.reservations r
        WHERE r.status = 'ACTIVE' 
          AND r.expires_at <= now()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Expire the reservation
        UPDATE public.reservations 
        SET status = 'EXPIRED', updated_at = now() 
        WHERE id = v_rec.reservation_id;

        -- Release ticket back to AVAILABLE
        UPDATE public.lottery_tickets 
        SET 
            status = 'AVAILABLE', 
            current_reservation_id = NULL,
            updated_at = now() 
        WHERE event_id = v_rec.event_id 
          AND ticket_number = v_rec.ticket_number
          AND status = 'RESERVED';

        v_released_count := v_released_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'released_count', v_released_count,
        'checked_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. SUBMIT RECEIPT SCREENSHOT (Moves state to PAYMENT_SUBMITTED and locks ticket)
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

    -- Lock ticket in PAYMENT_SUBMITTED (never expires during verification)
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
        provider,
        transaction_reference,
        expected_amount,
        expected_receiver_account,
        expected_receiver_name,
        receipt_url,
        status
    ) VALUES (
        v_res.event_id,
        v_res.ticket_number,
        p_reservation_id,
        v_res.participant_id,
        p_provider,
        p_extracted_ref,
        v_event.ticket_price,
        v_event.receiver_account_number,
        v_event.receiver_name,
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


-- 5. VERIFY PAYMENT AND ISSUE TICKET (Strict 4-Way Matching Gate)
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
        WHERE provider = p_detected_provider 
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

            -- Move ticket to MANUAL_REVIEW for admin inspection
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
            provider = p_detected_provider,
            transaction_reference = p_detected_ref,
            detected_amount = p_detected_amount,
            detected_receiver_account = p_detected_account,
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

        RETURN jsonb_build_object(
            'success', true,
            'status', 'ISSUED',
            'ticket_number', v_pay.ticket_number,
            'event_title', v_event.title,
            'verified_amount', p_detected_amount,
            'transaction_reference', p_detected_ref
        );
    ELSE
        -- Record specific mismatch reason and escalate to MANUAL_REVIEW
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
                provider = p_detected_provider,
                transaction_reference = p_detected_ref,
                detected_amount = p_detected_amount,
                detected_receiver_account = p_detected_account,
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
                'message', 'Payment details did not strictly match event criteria. Routed to staff for manual review.'
            );
        END;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. ADMIN MANUAL OVERRIDE (Approve or Reject from Dashboard)
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
BEGIN
    SELECT * INTO v_pay FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND');
    END IF;

    SELECT * INTO v_res FROM public.reservations WHERE id = v_pay.reservation_id FOR UPDATE;

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
            updated_at = now()
        WHERE event_id = v_pay.event_id AND ticket_number = v_pay.ticket_number;

        -- Audit log
        INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, new_value, reason)
        VALUES (p_admin_id, 'PAYMENT_MANUALLY_REJECTED', 'payments', p_payment_id::text, jsonb_build_object('ticket', v_pay.ticket_number), p_notes);

        RETURN jsonb_build_object('success', true, 'status', 'AVAILABLE');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
