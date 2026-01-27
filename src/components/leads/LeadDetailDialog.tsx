import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, LeadStatus, STATUS_LABELS, KANBAN_COLUMNS } from '@/types/crm';
import { useLeads } from '@/hooks/useLeads';
import { useTeam } from '@/hooks/useTeam';
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
} from 'lucide-react';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange }: LeadDetailDialogProps) {
  const { updateLeadStatus, addNote } = useLeads();
  const { getSDRs, getClosers } = useTeam();
  const [notes, setNotes] = useState(lead?.notes || '');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [selectedCloser, setSelectedCloser] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  if (!lead) return null;

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Não informado';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    setIsSaving(true);
    
    // If moving to closer stage, require closer selection
    const closerStages: LeadStatus[] = ['qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'];
    const closerId = closerStages.includes(selectedStatus) ? selectedCloser : undefined;
    
    await updateLeadStatus(lead.id, selectedStatus, closerId);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);
    await addNote(lead.id, notes);
    setIsSaving(false);
  };

  const closers = getClosers();
  const showCloserSelect = ['qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'].includes(selectedStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Observações
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Adicione observações sobre este lead..."
              rows={3}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveNotes}
              disabled={isSaving}
            >
              Salvar Observações
            </Button>
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