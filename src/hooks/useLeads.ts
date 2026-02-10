import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadStatus, ProposalProduct, Company } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { SaleData } from '@/components/leads/SaleConfirmationDialog';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile, viewingAs, isAdmin, isViewerOnly } = useAuth();
  const { selectedCompany } = useCompany();

  // Filtra leads por empresa selecionada
  const companyFilteredLeads = useMemo(() => {
    return leads.filter(lead => lead.company === selectedCompany);
  }, [leads, selectedCompany]);

  // Retorna leads filtrados baseado no viewingAs (já filtrados por empresa)
  const getFilteredLeads = () => {
    // Viewers veem todos os leads da empresa (apenas visualização)
    if (isViewerOnly()) return companyFilteredLeads;
    
    if (!viewingAs) return companyFilteredLeads; // Admin vê tudo da empresa
    
    // Filtra leads pelo membro sendo visualizado
    return companyFilteredLeads.filter(lead => {
      if (viewingAs.roles.includes('sdr')) {
        return lead.assigned_sdr_id === viewingAs.id || 
               (!lead.assigned_sdr_id && !lead.assigned_closer_id);
      }
      if (viewingAs.roles.includes('closer')) {
        return lead.assigned_closer_id === viewingAs.id;
      }
      return false;
    });
  };

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

  // Refetch silencioso (sem loading state) para sincronizar dados com relações
  const silentRefetch = async () => {
    const { data } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_sdr:profiles!leads_assigned_sdr_id_fkey(*),
        assigned_closer:profiles!leads_assigned_closer_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setLeads(data as Lead[]);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Subscribe to realtime changes - atualiza localmente sem refetch completo
    const channel = supabase
      .channel('leads_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        () => {
          // Novo lead adicionado - precisa refetch silencioso para trazer relações
          silentRefetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          // Atualiza apenas o lead modificado no estado local
          setLeads(prev => {
            const updated = payload.new as Lead;
            const exists = prev.some(l => l.id === updated.id);
            if (!exists) return prev;
            return prev.map(l => 
              l.id === updated.id 
                ? { ...l, ...updated, assigned_sdr: l.assigned_sdr, assigned_closer: l.assigned_closer }
                : l
            );
          });
          // Se mudou assigned_sdr_id ou assigned_closer_id, refetch silencioso para atualizar relações
          const old = leads.find(l => l.id === (payload.new as Lead).id);
          if (old && (old.assigned_sdr_id !== (payload.new as Lead).assigned_sdr_id || 
                      old.assigned_closer_id !== (payload.new as Lead).assigned_closer_id)) {
            silentRefetch();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          setLeads(prev => prev.filter(l => l.id !== (payload.old as Lead).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Função para obter o próximo closer via round-robin
  const getNextCloser = async (): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_next_closer');
    
    if (error) {
      console.error('Error getting next closer:', error);
      return null;
    }
    
    return data;
  };

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus, closerId?: string) => {
    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead?.status;

    // Optimistic update - atualiza o estado local imediatamente
    setLeads(prevLeads => 
      prevLeads.map(l => 
        l.id === leadId 
          ? { ...l, status: newStatus, last_contact_at: new Date().toISOString() }
          : l
      )
    );

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
      // Reverte a mudança otimista em caso de erro
      setLeads(prevLeads => 
        prevLeads.map(l => 
          l.id === leadId 
            ? { ...l, status: oldStatus as LeadStatus }
            : l
        )
      );
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

  // Função para mover lead para qualificado com atribuição automática de closer
  const moveToQualified = async (leadId: string): Promise<{ success: boolean; closerId: string | null }> => {
    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead?.status;

    // Buscar próximo closer via round-robin
    const nextCloserId = await getNextCloser();
    
    if (!nextCloserId) {
      toast({
        title: 'Erro',
        description: 'Não há closers disponíveis para atribuição.',
        variant: 'destructive',
      });
      return { success: false, closerId: null };
    }

    // Optimistic update
    setLeads(prevLeads => 
      prevLeads.map(l => 
        l.id === leadId 
          ? { ...l, status: 'qualificado' as LeadStatus, assigned_closer_id: nextCloserId, last_contact_at: new Date().toISOString() }
          : l
      )
    );

    const { error } = await supabase
      .from('leads')
      .update({
        status: 'qualificado',
        assigned_closer_id: nextCloserId,
        last_contact_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      // Revert
      setLeads(prevLeads => 
        prevLeads.map(l => 
          l.id === leadId 
            ? { ...l, status: oldStatus as LeadStatus, assigned_closer_id: lead?.assigned_closer_id }
            : l
        )
      );
      toast({
        title: 'Erro ao qualificar lead',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, closerId: null };
    }

    // Log activity
    if (profile?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: profile.id,
        action: 'status_change',
        old_status: oldStatus,
        new_status: 'qualificado',
        notes: `Lead atribuído automaticamente ao closer (round-robin)`,
      });
    }

    // Fetch para atualizar os dados do closer atribuído
    fetchLeads();

    return { success: true, closerId: nextCloserId };
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

  // Função para alterar responsável com registro no histórico
  const changeLeadAssignment = async (
    leadId: string, 
    newUserId: string | null, 
    type: 'sdr' | 'closer',
    newUserName: string,
    oldUserName?: string
  ) => {
    const field = type === 'sdr' ? 'assigned_sdr_id' : 'assigned_closer_id';
    const roleName = type === 'sdr' ? 'SDR' : 'Closer';
    
    const { error } = await supabase
      .from('leads')
      .update({ [field]: newUserId })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Erro ao alterar responsável',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Log activity - registrar a mudança de responsável
    if (profile?.id) {
      const noteText = oldUserName 
        ? `${roleName} alterado de "${oldUserName}" para "${newUserName}"`
        : `${roleName} atribuído: ${newUserName}`;
      
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: profile.id,
        action: 'note_added',
        notes: noteText,
      });
    }

    toast({
      title: 'Responsável alterado',
      description: `${roleName} do lead foi alterado com sucesso.`,
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
        activity_type: 'note',
      });
    }

    fetchLeads();
    return true;
  };

  const addActivity = async (leadId: string, activityType: string, note?: string) => {
    if (!profile?.id) return false;

    const activityLabels: Record<string, string> = {
      call: 'Ligação realizada',
      whatsapp: 'Mensagem WhatsApp enviada',
      meeting: 'Reunião realizada',
      email: 'E-mail enviado',
    };

    const label = activityLabels[activityType] || activityType;
    const fullNote = note ? `${label}: ${note}` : label;

    // Update last_contact_at
    await supabase
      .from('leads')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', leadId);

    const { error } = await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: profile.id,
      action: 'activity_logged',
      notes: fullNote,
      activity_type: activityType,
    });

    if (error) {
      toast({
        title: 'Erro ao registrar atividade',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Atividade registrada',
      description: label,
    });

    fetchLeads();
    return true;
  };

  const setNeedsScheduling = async (leadId: string, reason: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ 
        needs_scheduling: true,
        scheduling_pending_reason: reason,
      })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Erro ao salvar',
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
        notes: `Motivo de não agendamento: ${reason}`,
      });
    }

    toast({
      title: 'Registro salvo',
      description: 'Lead marcado como pendente de agendamento.',
    });

    fetchLeads();
    return true;
  };

  const clearNeedsScheduling = async (leadId: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ 
        needs_scheduling: false,
        scheduling_pending_reason: null,
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error clearing needs_scheduling:', error);
      return false;
    }

    fetchLeads();
    return true;
  };

  const saveProposal = async (data: {
    leadId: string;
    product: ProposalProduct;
    value: number;
    paymentMethod: string;
    followUpAt: Date;
  }) => {
    const { error } = await supabase
      .from('leads')
      .update({
        proposal_product: data.product,
        proposal_value: data.value,
        proposal_payment_method: data.paymentMethod,
        proposal_follow_up_at: data.followUpAt.toISOString(),
      })
      .eq('id', data.leadId);

    if (error) {
      toast({
        title: 'Erro ao salvar proposta',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Log activity
    if (profile?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: data.leadId,
        user_id: profile.id,
        action: 'note_added',
        notes: `Proposta enviada: ${data.product.toUpperCase()} - R$ ${data.value.toLocaleString('pt-BR')} - ${data.paymentMethod}`,
      });
    }

    toast({
      title: 'Proposta registrada',
      description: 'Detalhes da proposta salvos com sucesso.',
    });

    fetchLeads();
    return true;
  };

  // Leads novos filtrados por empresa
  const getNewLeads = () => companyFilteredLeads.filter(l => l.status === 'sem_atendimento');
  
  // Leads por status filtrados por empresa
  const getLeadsByStatus = (status: LeadStatus) => companyFilteredLeads.filter(l => l.status === status);

  const saveSaleData = async (data: SaleData) => {
    const { error } = await supabase
      .from('leads')
      .update({
        sale_company_cnpj: data.companyCnpj,
        sale_admin_email: data.adminEmail,
        sale_payment_method: data.paymentMethod,
        sale_entry_value: data.entryValue,
        sale_remaining_value: data.remainingValue,
        sale_installments: data.installments,
        sale_first_check_date: data.firstCheckDate?.toISOString().split('T')[0] || null,
        sale_observations: data.observations,
        sale_confirmed_at: new Date().toISOString(),
        proposal_product: data.product,
        sale_contract_sent: data.contractSent,
        sale_payment_received: data.paymentReceived,
      })
      .eq('id', data.leadId);

    if (error) {
      toast({
        title: 'Erro ao salvar dados da venda',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Financial records are now created automatically by database trigger (sync_sale_to_financial)
    // This ensures data consistency even if frontend code changes

    const totalAmount = data.entryValue + data.remainingValue;

    // Log activity
    if (profile?.id) {
      await supabase.from('lead_activities').insert({
        lead_id: data.leadId,
        user_id: profile.id,
        action: 'note_added',
        notes: `Venda confirmada: ${data.product} - R$ ${totalAmount.toLocaleString('pt-BR')} - ${data.paymentMethod}`,
      });
    }

    toast({
      title: 'Venda registrada',
      description: 'Dados da venda salvos com sucesso. Registros financeiros sincronizados automaticamente.',
    });

    fetchLeads();
    return true;
  };

  const updateSaleStatus = async (leadId: string, field: 'contract' | 'payment', value: boolean) => {
    const updateField = field === 'contract' ? 'sale_contract_sent' : 'sale_payment_received';
    const lead = leads.find(l => l.id === leadId);
    
    // Optimistic update
    setLeads(prevLeads => 
      prevLeads.map(l => 
        l.id === leadId 
          ? { ...l, [updateField]: value }
          : l
      )
    );

    const { error } = await supabase
      .from('leads')
      .update({ [updateField]: value })
      .eq('id', leadId);

    if (error) {
      // Revert on error
      setLeads(prevLeads => 
        prevLeads.map(l => 
          l.id === leadId 
            ? { ...l, [updateField]: !value }
            : l
        )
      );
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    // Se marcou pagamento como realizado, criar entrada de caixa automática
    if (field === 'payment' && value && lead) {
      try {
        // Buscar a venda financeira associada a este lead
        const { data: financialSale } = await supabase
          .from('financial_sales')
          .select('*')
          .eq('lead_id', leadId)
          .single();

        if (financialSale) {
          // Calcular o valor total da venda (entrada + restante)
          const totalAmount = lead.sale_entry_value || 0 + (lead.sale_remaining_value || 0);
          
          // Mapear método de pagamento
          const paymentMethodMap: Record<string, 'pix' | 'credit_card' | 'debit_card' | 'check' | 'cash' | 'other'> = {
            'Cartão': 'credit_card',
            'Pix': 'pix',
            'Entrada pix + cartão': 'pix',
            'Entrada cartão + cheque': 'credit_card',
            'Entrada pix + cheque': 'pix',
          };
          const financialPaymentMethod = paymentMethodMap[lead.sale_payment_method || ''] || 'other';

          // Criar entrada de caixa para o valor total da venda
          await supabase
            .from('financial_cash_entries')
            .insert({
              sale_id: financialSale.id,
              installment_id: null,
              amount: totalAmount,
              entry_date: new Date().toISOString().split('T')[0],
              payment_method: financialPaymentMethod,
              description: `Pagamento confirmado - ${lead.proposal_product || 'Venda'} - ${lead.full_name}`,
              company: lead.company as 'escola_franchising' | 'evidia',
              created_by: profile?.id || null,
            });

          // Atualizar o valor recebido na venda financeira
          await supabase
            .from('financial_sales')
            .update({ received_amount: totalAmount })
            .eq('id', financialSale.id);

          // Marcar todas as parcelas como recebidas
          await supabase
            .from('financial_installments')
            .update({ 
              status: 'received',
              received_date: new Date().toISOString().split('T')[0]
            })
            .eq('sale_id', financialSale.id);

          toast({
            title: 'Entrada de caixa criada',
            description: `R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado no financeiro.`,
          });
        }
      } catch (financialErr) {
        console.error('Error creating cash entry:', financialErr);
        // Não falha a operação principal se o registro financeiro falhar
      }
    }

    toast({
      title: 'Status atualizado',
      description: field === 'contract' ? 'Status do contrato atualizado.' : 'Status do pagamento atualizado.',
    });

    return true;
  };

  const markAsLost = async (leadId: string, reason: string) => {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'perdido',
        loss_reason: reason,
        lost_at: new Date().toISOString(),
        last_contact_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      toast({
        title: 'Erro ao marcar lead como perdido',
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
        old_status: leads.find(l => l.id === leadId)?.status,
        new_status: 'perdido',
        notes: `Lead marcado como perdido. Motivo: ${reason}`,
      });
    }

    toast({
      title: 'Lead marcado como perdido',
      description: 'O motivo foi registrado para análise.',
    });

    fetchLeads();
    return true;
  };

  return {
    leads,
    filteredLeads: getFilteredLeads(),
    loading,
    fetchLeads,
    updateLeadStatus,
    moveToQualified,
    getNextCloser,
    assignLead,
    changeLeadAssignment,
    addNote,
    addActivity,
    setNeedsScheduling,
    clearNeedsScheduling,
    saveProposal,
    saveSaleData,
    updateSaleStatus,
    markAsLost,
    getNewLeads,
    getLeadsByStatus,
  };
}