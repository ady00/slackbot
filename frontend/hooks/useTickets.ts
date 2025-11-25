'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Ticket, Message } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/tickets`);
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicketMessages = useCallback(async (ticketId: string): Promise<Message[]> => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error || 'Failed to fetch messages');
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  const updateTicket = useCallback(async (
    ticketId: string,
    updates: Partial<Pick<Ticket, 'status' | 'is_fixed'>>
  ) => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with properly typed updates
        setTickets(prev => 
          prev.map(t => t.id === ticketId ? { ...t, ...data.data } : t)
        );
        return data.data;
      }
      throw new Error(data.error || 'Failed to update ticket');
    } catch (err) {
      console.error('Error updating ticket:', err);
      throw err;
    }
  }, []);

  const deleteTicket = useCallback(async (ticketId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        return true;
      }
      throw new Error(data.error || 'Failed to delete ticket');
    } catch (err) {
      console.error('Error deleting ticket:', err);
      throw err;
    }
  }, []);

  const addTicket = useCallback((ticket: Ticket) => {
    setTickets(prev => [ticket, ...prev]);
  }, []);

  const refreshTicket = useCallback((ticketId: string) => {
    // Refetch just this ticket or refetch all
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    fetchTicketMessages,
    updateTicket,
    deleteTicket,
    addTicket,
    refreshTicket
  };
}
