import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadStatus } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_sdr:profiles!leads_assigned_sdr_id_fkey(*),
        assigned_closer:profiles!leads_assigned_closer_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar leads',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus, closerId?: string) => {
    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead?.status;

    const updateData: Record<string, unknown> = { 
      status: newStatus,
      last_contact_at: new Date().toISOString(),
    };

    // If moving to qualificado or beyond, assign closer
    if (closerId && ['qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'].includes(newStatus)) {
      updateData.assigned_closer_id = closerId;
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Erro ao atualizar lead',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Log activity
    if (profile?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: profile.id,
        action: 'status_change',
        old_status: oldStatus,
        new_status: newStatus,
      });
    }

    toast({
      title: 'Lead atualizado',
      description: 'Status do lead foi alterado com sucesso.',
    });

    return true;
  };

  const assignLead = async (leadId: string, userId: string, type: 'sdr' | 'closer') => {
    const field = type === 'sdr' ? 'assigned_sdr_id' : 'assigned_closer_id';
    
    const { error } = await supabase
      .from('leads')
      .update({ [field]: userId })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Erro ao atribuir lead',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Lead atribuído',
      description: `Lead foi atribuído com sucesso.`,
    });

    fetchLeads();
    return true;
  };

  const addNote = async (leadId: string, note: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ notes: note })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Erro ao salvar nota',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Log activity
    if (profile?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: profile.id,
        action: 'note_added',
        notes: note,
      });
    }

    fetchLeads();
    return true;
  };

  const getNewLeads = () => leads.filter(l => l.status === 'sem_atendimento');
  
  const getLeadsByStatus = (status: LeadStatus) => leads.filter(l => l.status === status);

  return {
    leads,
    loading,
    fetchLeads,
    updateLeadStatus,
    assignLead,
    addNote,
    getNewLeads,
    getLeadsByStatus,
  };
}