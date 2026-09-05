-- ============================================================================
-- SEED DATA FOR DEMONSTRATION & LOCAL DEVELOPMENT
-- ============================================================================

DO $$
DECLARE
    v_event1_id UUID;
    v_event2_id UUID;
    v_part1_id UUID;
    v_part2_id UUID;
    v_part3_id UUID;
    v_part4_id UUID;
    v_res1_id UUID;
    v_res2_id UUID;
BEGIN
    -- 1. Create Sample Users
    INSERT INTO public.users (telegram_id, telegram_username, full_name, phone_number, language)
    VALUES 
        (100101, 'abebe_k', 'Abebe Kebede', '+251911223344', 'am'),
        (100102, 'chala_m', 'Chala Mengistu', '+251922334455', 'en'),
        (100103, 'fatima_h', 'Fatima Hassen', '+251933445566', 'en'),
        (100104, 'dawit_t', 'Dawit Tefera', '+251944556677', 'am')
    ON CONFLICT (telegram_id) DO NOTHING;

    -- 2. Create Sample Participants
    INSERT INTO public.participants (user_id, full_name, phone_number, telegram_username, source)
    VALUES (100101, 'Abebe Kebede', '+251911223344', 'abebe_k', 'BOT')
    RETURNING id INTO v_part1_id;

    INSERT INTO public.participants (user_id, full_name, phone_number, telegram_username, source)
    VALUES (100102, 'Chala Mengistu', '+251922334455', 'chala_m', 'BOT')
    RETURNING id INTO v_part2_id;

    INSERT INTO public.participants (user_id, full_name, phone_number, telegram_username, source)
    VALUES (100103, 'Fatima Hassen', '+251933445566', 'fatima_h', 'BOT')
    RETURNING id INTO v_part3_id;

    INSERT INTO public.participants (user_id, full_name, phone_number, telegram_username, source)
    VALUES (NULL, 'Walk-in Customer Bekele', '+251955667788', NULL, 'WALK_IN')
    RETURNING id INTO v_part4_id;

    -- 3. Create Lottery Event 1: iPhone 17 Pro Max (500 ETB)
    INSERT INTO public.lottery_events (
        title, 
        slug, 
        description, 
        image_url, 
        ticket_price, 
        start_number, 
        end_number, 
        total_tickets, 
        payment_provider, 
        receiver_account_number, 
        receiver_name, 
        sales_start_at, 
        sales_end_at, 
        draw_at, 
        winner_message, 
        status
    ) VALUES (
        'iPhone 17 Pro Max Super Lottery',
        'iphone-17-pro-max',
        'Win a brand new sealed iPhone 17 Pro Max 512GB! Each ticket is strictly 500 ETB. Fast automated verification with Telebirr.',
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
        500.00,
        1,
        5000,
        5000,
        'TELEBIRR',
        '0911223344',
        'Dagim Tilahun',
        now() - INTERVAL '3 days',
        now() + INTERVAL '20 days',
        now() + INTERVAL '21 days',
        'Congratulations! You have won the brand new iPhone 17 Pro Max. Our team will contact you shortly.',
        'OPEN'
    )
    RETURNING id INTO v_event1_id;

    -- Populate 5,000 tickets for Event 1
    PERFORM public.generate_lottery_tickets(v_event1_id, 1, 5000);

    -- 4. Create Lottery Event 2: Bajaj / Boxer Motorcycle (2,500 ETB)
    INSERT INTO public.lottery_events (
        title, 
        slug, 
        description, 
        image_url, 
        ticket_price, 
        start_number, 
        end_number, 
        total_tickets, 
        payment_provider, 
        receiver_account_number, 
        receiver_name, 
        sales_start_at, 
        sales_end_at, 
        draw_at, 
        winner_message, 
        status
    ) VALUES (
        'Bajaj / Boxer 150cc Motorcycle Lottery',
        'bajaj-motorcycle',
        'Win a brand new Bajaj Boxer 150cc delivery motorcycle with full plate registration! Each ticket is 2,500 ETB verified via CBE.',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
        2500.00,
        1,
        5000,
        5000,
        'CBE',
        '1000123456789',
        'Dagim Tilahun',
        now() - INTERVAL '5 days',
        now() + INTERVAL '25 days',
        now() + INTERVAL '26 days',
        'Congratulations! You are the official owner of the Bajaj Boxer 150cc motorcycle! Contact our office to pick up keys and title.',
        'OPEN'
    )
    RETURNING id INTO v_event2_id;

    -- Populate 5,000 tickets for Event 2
    PERFORM public.generate_lottery_tickets(v_event2_id, 1, 5000);

    -- 5. Seed some ISSUED / CONFIRMED tickets for Event 1 (iPhone 17)
    -- Ticket #29 owned by Abebe
    UPDATE public.lottery_tickets 
    SET status = 'ISSUED', owner_participant_id = v_part1_id, issued_at = now() - INTERVAL '2 hours'
    WHERE event_id = v_event1_id AND ticket_number = 29;

    INSERT INTO public.payments (
        event_id, ticket_number, reservation_id, participant_id, provider, 
        transaction_reference, expected_amount, detected_amount, 
        expected_receiver_account, detected_receiver_account, 
        expected_receiver_name, detected_receiver_name, 
        receipt_url, status, verified_at
    ) VALUES (
        v_event1_id, 29, gen_random_uuid(), v_part1_id, 'TELEBIRR',
        'FT26471283912', 500.00, 500.00,
        '0911223344', '0911223344',
        'Dagim Tilahun', 'Dagim Tilahun',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600', 'VERIFIED', now() - INTERVAL '2 hours'
    );

    -- Ticket #108 owned by Fatima
    UPDATE public.lottery_tickets 
    SET status = 'ISSUED', owner_participant_id = v_part3_id, issued_at = now() - INTERVAL '1 hour'
    WHERE event_id = v_event1_id AND ticket_number = 108;

    INSERT INTO public.payments (
        event_id, ticket_number, reservation_id, participant_id, provider, 
        transaction_reference, expected_amount, detected_amount, 
        expected_receiver_account, detected_receiver_account, 
        expected_receiver_name, detected_receiver_name, 
        receipt_url, status, verified_at
    ) VALUES (
        v_event1_id, 108, gen_random_uuid(), v_part3_id, 'TELEBIRR',
        'TB9912048201', 500.00, 500.00,
        '0911223344', '0911223344',
        'Dagim Tilahun', 'Dagim Tilahun',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600', 'VERIFIED', now() - INTERVAL '1 hour'
    );

    -- 6. Seed a pending 15-minute ACTIVE reservation for Chala (Ticket #77)
    INSERT INTO public.reservations (
        event_id, ticket_number, participant_id, source, status, reserved_at, expires_at
    ) VALUES (
        v_event1_id, 77, v_part2_id, 'BOT', 'ACTIVE', now() - INTERVAL '5 minutes', now() + INTERVAL '10 minutes'
    ) RETURNING id INTO v_res1_id;

    UPDATE public.lottery_tickets 
    SET status = 'RESERVED', current_reservation_id = v_res1_id
    WHERE event_id = v_event1_id AND ticket_number = 77;

    -- 7. Seed a MANUAL_REVIEW item with mismatch (Ticket #204)
    INSERT INTO public.reservations (
        event_id, ticket_number, participant_id, source, status, reserved_at, expires_at, payment_submitted_at
    ) VALUES (
        v_event1_id, 204, v_part4_id, 'WALK_IN', 'PAYMENT_SUBMITTED', now() - INTERVAL '12 minutes', now() + INTERVAL '3 minutes', now() - INTERVAL '2 minutes'
    ) RETURNING id INTO v_res2_id;

    UPDATE public.lottery_tickets 
    SET status = 'MANUAL_REVIEW', current_reservation_id = v_res2_id
    WHERE event_id = v_event1_id AND ticket_number = 204;

    INSERT INTO public.payments (
        event_id, ticket_number, reservation_id, participant_id, provider, 
        transaction_reference, expected_amount, detected_amount, 
        expected_receiver_account, detected_receiver_account, 
        expected_receiver_name, detected_receiver_name, 
        receipt_url, status, rejection_reason
    ) VALUES (
        v_event1_id, 204, v_res2_id, v_part4_id, 'TELEBIRR',
        'TB3381029411', 500.00, 500.00,
        '0911223344', '0922998877', -- Mismatched account!
        'Dagim Tilahun', 'Other Person Plc', -- Mismatched name!
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600', 
        'MANUAL_REVIEW', 
        'WRONG_RECEIVER_ACCOUNT (Got: 0922998877, Expected: 0911223344); WRONG_RECEIVER_NAME (Got: other person plc, Expected: dagim tilahun);'
    );

    -- 8. Seed an ISSUED ticket in Event 2 (Motorcycle, Ticket #15)
    UPDATE public.lottery_tickets 
    SET status = 'ISSUED', owner_participant_id = v_part1_id, issued_at = now() - INTERVAL '1 day'
    WHERE event_id = v_event2_id AND ticket_number = 15;

    INSERT INTO public.payments (
        event_id, ticket_number, reservation_id, participant_id, provider, 
        transaction_reference, expected_amount, detected_amount, 
        expected_receiver_account, detected_receiver_account, 
        expected_receiver_name, detected_receiver_name, 
        receipt_url, status, verified_at
    ) VALUES (
        v_event2_id, 15, gen_random_uuid(), v_part1_id, 'CBE',
        'FT88391029412', 2500.00, 2500.00,
        '1000123456789', '1000123456789',
        'Dagim Tilahun', 'Dagim Tilahun',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600', 'VERIFIED', now() - INTERVAL '1 day'
    );

END $$;
