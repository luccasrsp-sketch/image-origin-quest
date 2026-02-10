import { useState, useRef, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Search, X, CalendarDays, CalendarRange, User, LayoutGrid } from 'lucide-react';
import { startOfDay, startOfWeek, isAfter } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { ScheduleMeetingDialog } from '@/components/calendar/ScheduleMeetingDialog';
import { QualificationDialog } from '@/components/leads/QualificationDialog';
import { ProposalDialog } from '@/components/leads/ProposalDialog';
import { SaleConfirmationDialog } from '@/components/leads/SaleConfirmationDialog';
import { SaleDetailsDialog } from '@/components/leads/SaleDetailsDialog';
import { ColdLeadsAlert } from '@/components/leads/ColdLeadsAlert';
import { LossReasonDialog } from '@/components/leads/LossReasonDialog';
import { KanbanScrollbar } from '@/components/kanban/KanbanScrollbar';
import { useLeads } from '@/hooks/useLeads';
import { useCalendar } from '@/hooks/useCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { Lead, LeadStatus, KANBAN_COLUMNS } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type LeadFilter = 'todos' | 'hoje' | 'semana' | 'meus';

export default function KanbanPage() {
  const { leads, filteredLeads, loading, updateLeadStatus, moveToQualified, addNote, setNeedsScheduling, clearNeedsScheduling, saveProposal, saveSaleData, updateSaleStatus, markAsLost, changeLeadAssignment } = useLeads();
  const { createEvent } = useCalendar();
  const { profile, isAdmin, isSDR, isCloser, isViewerOnly, viewingAs } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [schedulingPreviousStatus, setSchedulingPreviousStatus] = useState<LeadStatus | null>(null);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [saleLead, setSaleLead] = useState<Lead | null>(null);
  const [saleDetailsLead, setSaleDetailsLead] = useState<Lead | null>(null);
  const [lossLead, setLossLead] = useState<Lead | null>(null);
  const [coldAlertDismissed, setColdAlertDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LeadFilter>('todos');
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  // Filtra leads baseado no filtro ativo
  const activeFilteredLeads = useMemo(() => {
    const now = new Date();
    
    switch (activeFilter) {
      case 'hoje': {
        const todayStart = startOfDay(now);
        return filteredLeads.filter(lead => 
          isAfter(new Date(lead.created_at), todayStart)
        );
      }
      case 'semana': {
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return filteredLeads.filter(lead => 
          isAfter(new Date(lead.created_at), weekStart)
        );
      }
      case 'meus':
        return filteredLeads.filter(lead => 
          lead.assigned_sdr_id === profile?.id || 
          lead.assigned_closer_id === profile?.id
        );
      default:
        return filteredLeads;
    }
  }, [filteredLeads, activeFilter, profile?.id]);

  // Filtra leads baseado na busca por nome ou e-mail
  const searchedLeads = useMemo(() => {
    if (!searchQuery.trim()) return activeFilteredLeads;
    
    const query = searchQuery.toLowerCase().trim();
    return activeFilteredLeads.filter(lead => 
      lead.full_name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.company_name?.toLowerCase().includes(query)
    );
  }, [activeFilteredLeads, searchQuery]);

  // Viewers podem apenas visualizar, não podem editar ou mover leads
  const canEdit = !isViewerOnly();

  // Filtra colunas baseado no papel do usuário
  // SDRs, Closers e Viewers veem todas as colunas (exceto adminOnly como "Perdido")
  // Admins veem todas as colunas incluindo adminOnly
  const visibleColumns = KANBAN_COLUMNS.filter(col => {
    // Colunas adminOnly só aparecem para admins
    if (col.adminOnly) return isAdmin();
    // Todas as outras colunas são visíveis para todos os papéis
    return true;
  });

  const getLeadsByStatus = (status: LeadStatus) => {
    const leads = searchedLeads.filter(l => l.status === status);
    
    // Para vendidos, ordena do mais recente para o mais antigo
    if (status === 'vendido') {
      return leads.sort((a, b) => {
        const dateA = a.sale_confirmed_at ? new Date(a.sale_confirmed_at).getTime() : 0;
        const dateB = b.sale_confirmed_at ? new Date(b.sale_confirmed_at).getTime() : 0;
        return dateB - dateA; // Mais recente primeiro
      });
    }
    
    return leads;
  };

  const handleDragEnd = async (result: DropResult) => {
    // Bloqueia movimentação para viewers
    if (!canEdit) return;
    if (!result.destination) return;

    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId as LeadStatus;
    const lead = leads.find(l => l.id === leadId);

    if (!lead || lead.status === newStatus) return;

    // Se for para qualificado, usa moveToQualified com round-robin de closer
    if (newStatus === 'qualificado') {
      const result = await moveToQualified(leadId);
      if (result.success && result.closerId) {
        // Buscar dados do closer para incluir no lead
        const updatedLead = { 
          ...lead, 
          status: newStatus, 
          assigned_closer_id: result.closerId 
        } as Lead;
        setQualifyingLead(updatedLead);
      }
      return;
    }

    // Se for para reuniao_marcada, abre o diálogo de agendamento primeiro
    // O status só será atualizado APÓS o agendamento ser concluído
    if (newStatus === 'reuniao_marcada') {
      // Salva o status anterior para reverter se cancelar
      setSchedulingPreviousStatus(lead.status);
      // Limpa a tag de needs_scheduling se existir
      if (lead.needs_scheduling) {
        await clearNeedsScheduling(leadId);
      }
      // Abre o dialog sem mudar o status ainda
      setSchedulingLead({ ...lead, assigned_closer_id: lead.assigned_closer_id } as Lead);
      return;
    }

    // Se for para envio_proposta, abre o diálogo de proposta
    if (newStatus === 'envio_proposta') {
      await updateLeadStatus(leadId, newStatus);
      setProposalLead({ ...lead, status: newStatus } as Lead);
      return;
    }

    // Se for para vendido, abre o diálogo de confirmação de venda
    if (newStatus === 'vendido') {
      // Não atualiza o status ainda, espera confirmação
      setSaleLead(lead);
      return;
    }

    // Para outras colunas, apenas atualiza o status
    await updateLeadStatus(leadId, newStatus);
  };

  if (loading) {
    return (
      <AppLayout title="CRM">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleColumns.map(col => (
            <div key={col.id} className="min-w-[300px] space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="CRM">
      {/* Filters and search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ToggleGroup 
            type="single" 
            value={activeFilter} 
            onValueChange={(val) => val && setActiveFilter(val as LeadFilter)}
            className="justify-start"
          >
            <ToggleGroupItem value="todos" aria-label="Todos" className="gap-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <LayoutGrid className="h-3.5 w-3.5" />
              Todos
            </ToggleGroupItem>
            <ToggleGroupItem value="hoje" aria-label="Hoje" className="gap-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Hoje
            </ToggleGroupItem>
            <ToggleGroupItem value="semana" aria-label="Semana" className="gap-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="meus" aria-label="Meus Leads" className="gap-1.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <User className="h-3.5 w-3.5" />
              Meus Leads
            </ToggleGroupItem>
          </ToggleGroup>
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {searchedLeads.length} / {filteredLeads.length}
          </Badge>
        </div>

        <div className="relative max-w-md w-full sm:w-auto sm:min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
          <Input
            type="text"
            placeholder="Buscar por nome, e-mail ou empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-background/50 border-border text-white placeholder:text-white/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Top scrollbar */}
        <KanbanScrollbar containerRef={kanbanContainerRef} />
        
        <div 
          ref={kanbanContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin"
        >
          {visibleColumns.map(column => {
            const columnLeads = getLeadsByStatus(column.id);
            
            return (
              <div 
                key={column.id} 
                className="min-w-[320px] flex-shrink-0"
              >
                {/* Column header */}
                <div className={`rounded-t-lg p-3 ${column.color} border border-b-0`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnLeads.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {column.roles.includes('sdr') && column.roles.includes('closer') ? 'SDR / Closer' : column.roles.includes('sdr') ? 'SDR' : 'Closer'}
                  </p>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] max-h-[calc(100vh-280px)] overflow-y-auto space-y-3 rounded-b-lg border border-t-0 p-3 transition-colors scrollbar-thin ${
                        snapshot.isDraggingOver 
                          ? 'bg-slate-200 border-primary/50' 
                          : 'bg-white'
                      }`}
                    >
                      {columnLeads.map((lead, index) => (
                        <Draggable
                          key={lead.id}
                          draggableId={lead.id}
                          index={index}
                          isDragDisabled={!canEdit}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-transform ${
                                snapshot.isDragging ? 'rotate-2 scale-105' : ''
                              } ${!canEdit ? 'cursor-default' : ''}`}
                            >
                              <LeadCard
                                lead={lead}
                                onClick={() => setSelectedLead(lead)}
                                onViewSale={() => setSaleDetailsLead(lead)}
                                onUpdateSaleStatus={canEdit ? updateSaleStatus : undefined}
                                onMarkAsLost={canEdit ? setLossLead : undefined}
                                compact
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {columnLeads.length === 0 && (
                        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted">
                          <p className="text-sm text-muted-foreground">
                            Arraste leads aqui
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead detail dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onStatusChange={updateLeadStatus}
        onAddNote={addNote}
        onMarkAsLost={(lead) => setLossLead(lead)}
        onChangeAssignment={changeLeadAssignment}
      />

      {/* Schedule meeting dialog */}
      <ScheduleMeetingDialog
        lead={schedulingLead}
        open={!!schedulingLead}
        onOpenChange={(open) => {
          if (!open) {
            // Se fechou sem agendar, o status não foi alterado (comportamento esperado)
            setSchedulingLead(null);
            setSchedulingPreviousStatus(null);
          }
        }}
        onScheduled={async () => {
          // Agendamento concluído com sucesso, agora sim atualiza o status para reuniao_marcada
          if (schedulingLead) {
            await updateLeadStatus(schedulingLead.id, 'reuniao_marcada');
          }
          setSchedulingLead(null);
          setSchedulingPreviousStatus(null);
        }}
      />

      {/* Qualification dialog */}
      <QualificationDialog
        lead={qualifyingLead}
        open={!!qualifyingLead}
        onOpenChange={(open) => !open && setQualifyingLead(null)}
        onScheduleMeeting={(lead) => {
          // O lead recebido aqui já tem o assigned_closer_id do qualifyingLead
          const leadWithCloser = qualifyingLead || lead;
          setQualifyingLead(null);
          // Salva o status anterior (qualificado) para referência
          setSchedulingPreviousStatus('qualificado');
          // Abre dialog de agendamento - status só muda após confirmar
          setSchedulingLead(leadWithCloser);
        }}
        onNeedScheduling={setNeedsScheduling}
      />

      {/* Proposal dialog */}
      <ProposalDialog
        lead={proposalLead}
        open={!!proposalLead}
        onOpenChange={(open) => !open && setProposalLead(null)}
        onSubmit={async (data) => {
          const success = await saveProposal(data);
          if (success && profile?.id) {
            // Cria evento de lembrete na agenda do vendedor
            const followUpEnd = new Date(data.followUpAt);
            followUpEnd.setMinutes(followUpEnd.getMinutes() + 30);
            
            await createEvent({
              title: `Retorno: ${proposalLead?.full_name} - ${proposalLead?.company_name}`,
              description: `Cobrar posicionamento sobre proposta ${data.product.toUpperCase()} - R$ ${data.value.toLocaleString('pt-BR')}\nForma de pagamento: ${data.paymentMethod}`,
              lead_id: data.leadId,
              user_id: profile.id,
              start_time: data.followUpAt.toISOString(),
              end_time: followUpEnd.toISOString(),
              event_type: 'follow_up',
            });
          }
          return success;
        }}
      />

      {/* Sale confirmation dialog */}
      <SaleConfirmationDialog
        lead={saleLead}
        open={!!saleLead}
        onOpenChange={(open) => !open && setSaleLead(null)}
        onConfirm={async (data) => {
          // Primeiro atualiza o status para vendido
          const statusUpdated = await updateLeadStatus(data.leadId, 'vendido');
          if (statusUpdated) {
            // Depois salva os dados da venda
            return await saveSaleData(data);
          }
          return false;
        }}
        onCancel={() => {
          // Volta o lead para envio_proposta se estava em outra coluna
          if (saleLead && saleLead.status !== 'envio_proposta') {
            updateLeadStatus(saleLead.id, 'envio_proposta');
          }
          setSaleLead(null);
        }}
      />

      {/* Sale details dialog */}
      <SaleDetailsDialog
        lead={saleDetailsLead}
        open={!!saleDetailsLead}
        onOpenChange={(open) => !open && setSaleDetailsLead(null)}
      />

      {/* Loss reason dialog */}
      <LossReasonDialog
        lead={lossLead}
        open={!!lossLead}
        onOpenChange={(open) => !open && setLossLead(null)}
        onConfirm={markAsLost}
      />

      {/* Cold leads alert - only for SDRs with their assigned leads */}
      {!coldAlertDismissed && isSDR() && profile?.id && (
        <ColdLeadsAlert
          leads={searchedLeads.filter(l => l.assigned_sdr_id === profile.id)}
          onDismiss={() => setColdAlertDismissed(true)}
          onLeadClick={(lead) => {
            setColdAlertDismissed(true);
            setSelectedLead(lead);
          }}
        />
      )}
    </AppLayout>
  );
}