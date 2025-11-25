'use client';

import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { categoryConfig, statusConfig } from '@/lib/constants';
import type { Ticket, Message, TicketStatus } from '@/types';

interface TicketCardProps {
  ticket: Ticket;
  messages: Message[];
  isExpanded: boolean;
  onToggleFixed: (id: string, fixed: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onViewMessages: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TicketCard({
  ticket,
  messages,
  isExpanded,
  onToggleFixed,
  onStatusChange,
  onViewMessages,
  onDelete,
}: TicketCardProps) {
  const category = categoryConfig[ticket.category];
  const status = statusConfig[ticket.status as TicketStatus];

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={category.className}>
                {category.label}
              </Badge>
              <Badge className={status.className} variant="outline">
                <div className={`w-2 h-2 rounded-full mr-1.5 ${status.dotColor}`} />
                {status.label}
              </Badge>
              {ticket.is_fixed && (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Completed
                </Badge>
              )}
              {ticket.message_count && (
                <Badge variant="secondary" className="bg-accent/50">
                  {ticket.message_count} {ticket.message_count === 1 ? 'message' : 'messages'}
                </Badge>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
              {ticket.title}
            </h3>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </span>
              <span>User: {ticket.first_user_id}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`fixed-${ticket.id}`}
                checked={ticket.is_fixed}
                onCheckedChange={(checked) => onToggleFixed(ticket.id, checked as boolean)}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <label
                htmlFor={`fixed-${ticket.id}`}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Mark Complete
              </label>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Select
              value={ticket.status}
              onValueChange={(value) => onStatusChange(ticket.id, value)}
            >
              <SelectTrigger className="w-[140px] h-9 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewMessages(ticket.id)}
              className="h-9"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  View
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this ticket? This action cannot be undone.
                    All messages associated with this ticket will also be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(ticket.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Expanded Messages */}
        {isExpanded && messages.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Messages ({messages.length})
              </h4>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {message.slack_user_id}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {(message.confidence * 100).toFixed(0)}% confident
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-2">{message.text}</p>
                  {message.reasoning && (
                    <p className="text-xs text-muted-foreground italic">
                      AI: {message.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
