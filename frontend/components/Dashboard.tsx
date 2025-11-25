'use client';

import { useState, useEffect } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TicketCard } from '@/components/TicketCard';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Ticket, Message, TicketStatus } from '@/types';

export function Dashboard() {
  const { 
    tickets, 
    loading, 
    error, 
    updateTicket,
    deleteTicket,
    addTicket, 
    refreshTicket,
    fetchTicketMessages 
  } = useTickets();
  
  const { isConnected, subscribe } = useWebSocket();
  
  const [expandedTickets, setExpandedTickets] = useState<Record<string, Message[]>>({});
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!subscribe) return;

    const unsubscribeCreated = subscribe('ticket:created', (event) => {
      console.log('New ticket created:', event);
      if (event.ticket) {
        addTicket(event.ticket);
      }
    });

    const unsubscribeUpdated = subscribe('ticket:updated', (event) => {
      console.log('Ticket updated:', event);
      if (event.ticketId) {
        refreshTicket(event.ticketId);
      }
    });

    const unsubscribeDeleted = subscribe('ticket:deleted', (event) => {
      console.log('Ticket deleted:', event);
    });

    return () => {
      unsubscribeCreated?.();
      unsubscribeUpdated?.();
      unsubscribeDeleted?.();
    };
  }, [subscribe, addTicket, refreshTicket]);

  const handleToggleFixed = async (ticketId: string, isFixed: boolean) => {
    try {
      // If marking as fixed, also set status to resolved
      if (isFixed) {
        await updateTicket(ticketId, { is_fixed: isFixed, status: 'resolved' });
      } else {
        await updateTicket(ticketId, { is_fixed: isFixed });
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await updateTicket(ticketId, { status: status as TicketStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    }
  };

  const handleViewMessages = async (ticketId: string) => {
    if (expandedTickets[ticketId]) {
      // Collapse
      setExpandedTickets(prev => {
        const newState = { ...prev };
        delete newState[ticketId];
        return newState;
      });
      return;
    }
    
    // Expand - fetch messages
    const messages = await fetchTicketMessages(ticketId);
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: messages
    }));
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filter !== 'all' && ticket.status !== filter) return false;
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
    return true;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    fixed: tickets.filter(t => t.is_fixed).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                FDE Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time ticket management system
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={isConnected ? "default" : "destructive"}
                className="px-3 py-1"
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-card border-border hover:bg-accent/50 transition-colors">
            <div className="text-sm text-muted-foreground mb-1">Total Tickets</div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </Card>
          <Card className="p-4 bg-card border-border hover:bg-accent/50 transition-colors">
            <div className="text-sm text-muted-foreground mb-1">Open</div>
            <div className="text-2xl font-bold text-green-500">{stats.open}</div>
          </Card>
          <Card className="p-4 bg-card border-border hover:bg-accent/50 transition-colors">
            <div className="text-sm text-muted-foreground mb-1">In Progress</div>
            <div className="text-2xl font-bold text-yellow-500">{stats.inProgress}</div>
          </Card>
          <Card className="p-4 bg-card border-border hover:bg-accent/50 transition-colors">
            <div className="text-sm text-muted-foreground mb-1">Fixed</div>
            <div className="text-2xl font-bold text-blue-500">{stats.fixed}</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[150px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category:</span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="feature_request">Feature</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border">
              <p className="text-muted-foreground">No tickets found</p>
            </Card>
          ) : (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                messages={expandedTickets[ticket.id] || []}
                isExpanded={!!expandedTickets[ticket.id]}
                onToggleFixed={handleToggleFixed}
                onStatusChange={handleStatusChange}
                onViewMessages={handleViewMessages}
                onDelete={handleDeleteTicket}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
