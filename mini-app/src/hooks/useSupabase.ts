import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { TICKET_STATUS, ITEM_STATUS } from '../utils/constants';
import type { UserProfile, LotteryItem, LotteryRound, Ticket } from '../utils/constants';

export function useUser(telegramId: number | null) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!telegramId) return;

    async function fetchUser() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();
      
      if (!error && data) setUser(data);
      setLoading(false);
    }

    fetchUser();
  }, [telegramId]);

  return { user, loading, setUser };
}

export function useActiveItems() {
  const [items, setItems] = useState<LotteryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('lottery_items')
        .select('*')
        .eq('status', ITEM_STATUS.ACTIVE)
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false });

      if (!error && data) setItems(data);
      setLoading(false);
    }

    fetchItems();
  }, []);

  return { items, loading };
}

export function useRound(itemId: string | null) {
  const [round, setRound] = useState<LotteryRound | null>(null);

  useEffect(() => {
    if (!itemId) return;

    async function fetchRound() {
      const { data, error } = await supabase
        .from('lottery_rounds')
        .select('*')
        .eq('item_id', itemId)
        .in('status', ['OPEN', 'LOCKED'])
        .order('round_number', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) setRound(data);
    }

    fetchRound();
  }, [itemId]);

  return { round };
}

export function useTickets(roundId: string | null, userId: number | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!roundId) return;

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('round_id', roundId);

    if (!error && data) setTickets(data);
    setLoading(false);
  }, [roundId]);

  useEffect(() => {
    fetchTickets();

    // Subscribe to realtime changes
    if (!roundId) return;

    const channel = supabase
      .channel(`tickets-${roundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `round_id=eq.${roundId}`,
        },
        () => {
          // Refetch all tickets on any change
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId, fetchTickets]);

  return { tickets, loading, refetch: fetchTickets };
}

export function useUserTickets(userId: number | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchUserTickets() {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, lottery_items(title, ticket_price)')
        .eq('user_id', userId)
        .in('status', [TICKET_STATUS.PENDING_PAYMENT, TICKET_STATUS.CONFIRMED])
        .order('created_at', { ascending: false });

      if (!error && data) setTickets(data);
      setLoading(false);
    }

    fetchUserTickets();
  }, [userId]);

  return { tickets, loading };
}
