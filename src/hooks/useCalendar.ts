import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const fetchEvents = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        lead:leads(*),
        user:profiles!calendar_events_user_id_fkey(*)
      `)
      .order('start_time', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar eventos',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setEvents(data as CalendarEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [profile?.id]);

  const createEvent = async (event: {
    title: string;
    description?: string;
    lead_id?: string;
    user_id: string;
    start_time: string;
    end_time: string;
    event_type?: string;
  }) => {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao criar evento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    // Create notification for the assigned user
    await supabase.from('notifications').insert({
      user_id: event.user_id,
      title: 'Nova reunião agendada',
      message: `${event.title} - ${new Date(event.start_time).toLocaleString('pt-BR')}`,
      type: 'info',
      event_id: data.id,
    });

    toast({
      title: 'Evento criado',
      description: 'Reunião agendada com sucesso.',
    });

    fetchEvents();
    return data;
  };

  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    const { error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', eventId);

    if (error) {
      toast({
        title: 'Erro ao atualizar evento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Evento atualizado',
      description: 'Alterações salvas com sucesso.',
    });

    fetchEvents();
    return true;
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      toast({
        title: 'Erro ao excluir evento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Evento excluído',
      description: 'Evento removido da agenda.',
    });

    fetchEvents();
    return true;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getMyEvents = () => {
    if (!profile?.id) return [];
    return events.filter(event => event.user_id === profile.id);
  };

  return {
    events,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getMyEvents,
  };
}