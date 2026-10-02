import { supabase } from './supabase-client.js';

export function subscribeScrapes(handlers = {}) {
  const channel = supabase
    .channel('scrapes-stream-helper')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scrapes' },
      p => handlers.onInsert?.(p.new))
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'scrapes' },
      p => handlers.onDelete?.(p.old))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
