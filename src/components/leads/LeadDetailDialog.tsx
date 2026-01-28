import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, LeadStatus, STATUS_LABELS, KANBAN_COLUMNS, LeadActivity } from '@/types/crm';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Building, 
  Calendar, 
  Clock, 
  DollarSign, 
  MessageSquare,
  User,
  Tag,
  Globe,
  StickyNote,
  History,
  XCircle,
} from 'lucide-react';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (leadId: string, newStatus: LeadStatus, closerId?: string) => Promise<boolean>;
  onAddNote?: (leadId: string, note: string) => Promise<boolean>;
  onMarkAsLost?: (lead: Lead) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange, onStatusChange, onAddNote, onMarkAsLost }: LeadDetailDialogProps) {
  const { getClosers } = useTeam();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [selectedCloser, setSelectedCloser] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Buscar histórico de atividades quando o dialog abrir
  useEffect(() => {
    if (open && lead) {
      fetchActivities();
    }
  }, [open, lead?.id]);

  const fetchActivities = async () => {
    if (!lead) return;
    setLoadingActivities(true);
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*, user:profiles(*)')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActivities(data as LeadActivity[]);
    }
    setLoadingActivities(false);
  };

  if (!lead) return null;

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return "https://api.whatsapp.com/send/?phone=55" + digits;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Não informado';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || !onStatusChange) return;
    setIsSaving(true);
    
    // If moving to closer stage, require closer selection
    const closerStages: LeadStatus[] = ['qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'];
    const closerId = closerStages.includes(selectedStatus) ? selectedCloser : undefined;
    
    const success = await onStatusChange(lead.id, selectedStatus, closerId);
    if (success) {
      await fetchActivities(); // Atualiza o histórico
    }
    setIsSaving(false);
    setSelectedStatus('');
    setSelectedCloser('');
  };

  const handleSaveNotes = async () => {
    if (!newNote.trim() || !onAddNote) return;
    setIsSaving(true);
    const success = await onAddNote(lead.id, newNote.trim());
    if (success) {
      setNewNote('');
      await fetchActivities(); // Atualiza o histórico
    }
    setIsSaving(false);
  };

  const closers = getClosers();
  const showCloserSelect = ['qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'].includes(selectedStatus);

  const canMarkAsLost = lead.status !== 'vendido' && lead.status !== 'perdido' && lead.status !== 'sem_atendimento';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          {/* Botão Marcar como Perdido no canto superior direito */}
          {canMarkAsLost && onMarkAsLost && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onMarkAsLost(lead);
                onOpenChange(false);
              }}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Perdido
            </Button>
          )}
          <DialogTitle className="flex items-center gap-2 pr-20">
            <User className="h-5 w-5" />
            {lead.full_name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            {lead.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-sm">
              {STATUS_LABELS[lead.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Cadastrado {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>

          {/* Contact info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm truncate">{lead.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm">{lead.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Faturamento Mensal</p>
                <p className="text-sm font-medium">{formatCurrency(lead.monthly_revenue)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Funil</p>
                <p className="text-sm">{lead.funnel_type === 'franquia' ? 'Franquia' : 'Padrão'}</p>
              </div>
            </div>
          </div>

          {/* UTM info */}
          {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Origem (UTMs)</p>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                {lead.utm_source && <p>Source: {lead.utm_source}</p>}
                {lead.utm_medium && <p>Medium: {lead.utm_medium}</p>}
                {lead.utm_campaign && <p>Campaign: {lead.utm_campaign}</p>}
                {lead.utm_content && <p>Content: {lead.utm_content}</p>}
                {lead.utm_term && <p>Term: {lead.utm_term}</p>}
              </div>
            </div>
          )}

          {/* Assigned team */}
          <div className="grid gap-3 sm:grid-cols-2">
            {lead.assigned_sdr && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground">SDR Responsável</p>
                <p className="text-sm font-medium">{lead.assigned_sdr.full_name}</p>
              </div>
            )}
            {lead.assigned_closer && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground">Closer Responsável</p>
                <p className="text-sm font-medium">{lead.assigned_closer.full_name}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <Calendar className="inline h-3 w-3 mr-1" />
              Data de cadastro: {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            {lead.last_contact_at && (
              <p>
                <Clock className="inline h-3 w-3 mr-1" />
                Último contato: {format(new Date(lead.last_contact_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Nova Observação */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Nova Observação
            </Label>
            <Textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Adicione uma observação sobre este lead..."
              rows={3}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveNotes}
              disabled={isSaving || !newNote.trim()}
            >
              Salvar Observação
            </Button>
          </div>

          {/* Histórico de Atividades */}
          <div className="space-y-2 border-t pt-4">
            <Label className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Negociação
            </Label>
            <ScrollArea className="h-48 rounded-md border p-3">
              {loadingActivities ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border-b pb-2 last:border-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{activity.user?.full_name || 'Sistema'}</span>
                        <span>{format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                      {activity.action === 'status_change' && (
                        <p className="text-sm">
                          Alterou status de <strong>{STATUS_LABELS[activity.old_status!] || '-'}</strong> para <strong>{STATUS_LABELS[activity.new_status!]}</strong>
                        </p>
                      )}
                      {activity.action === 'note_added' && (
                        <p className="text-sm bg-muted/50 p-2 rounded mt-1">{activity.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Status change */}
          <div className="space-y-3 border-t pt-4">
            <Label>Alterar Status</Label>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as LeadStatus)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Novo status" />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showCloserSelect && (
                <Select value={selectedCloser} onValueChange={setSelectedCloser}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar Closer" />
                  </SelectTrigger>
                  <SelectContent>
                    {closers.map(closer => (
                      <SelectItem key={closer.id} value={closer.id}>
                        {closer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button 
                onClick={handleStatusChange}
                disabled={!selectedStatus || (showCloserSelect && !selectedCloser) || isSaving}
              >
                Atualizar
              </Button>
            </div>
          </div>

          {/* WhatsApp button */}
          <Button
            className="w-full gap-2"
            onClick={() => window.open(formatPhone(lead.phone), '_blank')}
          >
            <MessageSquare className="h-4 w-4" />
            Abrir WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}