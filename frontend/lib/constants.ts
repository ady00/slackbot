import type { TicketCategory } from '@/types';

export const categoryConfig: Record<TicketCategory, { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  support: {
    label: 'Support',
    variant: 'default',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
  },
  bug: {
    label: 'Bug',
    variant: 'destructive',
    className: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
  },
  feature_request: {
    label: 'Feature',
    variant: 'secondary',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20'
  },
  question: {
    label: 'Question',
    variant: 'outline',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
  },
  irrelevant: {
    label: 'Irrelevant',
    variant: 'outline',
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20'
  }
};

export const statusConfig = {
  open: { 
    label: 'Open', 
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
    dotColor: 'bg-green-500'
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    dotColor: 'bg-yellow-500'
  },
  resolved: { 
    label: 'Resolved', 
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dotColor: 'bg-blue-500'
  },
  closed: { 
    label: 'Closed', 
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    dotColor: 'bg-gray-500'
  }
};
