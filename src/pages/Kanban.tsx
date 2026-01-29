import { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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

export default function KanbanPage() {
  const { leads, filteredLeads, loading, updateLeadStatus, moveToQualified, addNote, setNeedsScheduling, clearNeedsScheduling, saveProposal, saveSaleData, updateSaleStatus, markAsLost } = useLeads();
  const { createEvent } = useCalendar();
  const { profile, isAdmin, isSDR, isCloser, viewingAs } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [proposalLead, setProposalLead] = useState<Lead | null>(null);
  const [saleLead, setSaleLead] = useState<Lead | null>(null);
  const [saleDetailsLead, setSaleDetailsLead] = useState<Lead | null>(null);
  const [lossLead, setLossLead] = useState<Lead | null>(null);
  const [coldAlertDismissed, setColdAlertDismissed] = useState(false);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  // Filtra colunas baseado no papel do usuário ou do membro sendo visualizado
  const visibleColumns = KANBAN_COLUMNS.filter(col => {
    // Se está visualizando como outro membro
    if (viewingAs) {
      // Colunas adminOnly nunca aparecem na visão simulada
      if (col.adminOnly) return false;
      // Verifica se a coluna é visível para algum dos papéis do membro
      const memberRoles = viewingAs.roles;
      return col.roles.some(colRole => memberRoles.includes(colRole));
    }
    
    // Visão normal (sem simulação)
    // Colunas adminOnly só aparecem para admins
    if (col.adminOnly && !isAdmin()) return false;
    // Admin vê todas as colunas
    if (isAdmin()) return true;
    // SDR vê colunas que incluem 'sdr' no array de roles
    if (isSDR() && col.roles.includes('sdr')) return true;
    // Closer vê colunas que incluem 'closer' no array de roles
    if (isCloser() && col.roles.includes('closer')) return true;
    return false;
  });

  const getLeadsByStatus = (status: LeadStatus) => 
    filteredLeads.filter(l => l.status === status);

  const handleDragEnd = async (result: DropResult) => {
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

    // Se for para reuniao_marcada, abre o diálogo de agendamento
    if (newStatus === 'reuniao_marcada') {
      await updateLeadStatus(leadId, newStatus);
      // Limpa a tag de needs_scheduling se existir
      if (lead.needs_scheduling) {
        await clearNeedsScheduling(leadId);
      }
      setSchedulingLead({ ...lead, status: newStatus } as Lead);
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
      <AppLayout title="Kanban">
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
    <AppLayout title="Kanban">
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
                      className={`min-h-[500px] space-y-3 rounded-b-lg border border-t-0 p-3 transition-colors ${
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
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-transform ${
                                snapshot.isDragging ? 'rotate-2 scale-105' : ''
                              }`}
                            >
                              <LeadCard
                                lead={lead}
                                onClick={() => setSelectedLead(lead)}
                                onViewSale={() => setSaleDetailsLead(lead)}
                                onUpdateSaleStatus={updateSaleStatus}
                                onMarkAsLost={setLossLead}
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
      />

      {/* Schedule meeting dialog */}
      <ScheduleMeetingDialog
        lead={schedulingLead}
        open={!!schedulingLead}
        onOpenChange={(open) => !open && setSchedulingLead(null)}
        onScheduled={() => {
          setSchedulingLead(null);
        }}
      />

      {/* Qualification dialog */}
      <QualificationDialog
        lead={qualifyingLead}
        open={!!qualifyingLead}
        onOpenChange={(open) => !open && setQualifyingLead(null)}
        onScheduleMeeting={(lead) => {
          setQualifyingLead(null);
          // Mover para reuniao_marcada e abrir dialog de agendamento
          updateLeadStatus(lead.id, 'reuniao_marcada').then(() => {
            setSchedulingLead(lead);
          });
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
          leads={filteredLeads.filter(l => l.assigned_sdr_id === profile.id)}
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