import { Phone, Mail, Building, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lead, STATUS_LABELS } from '@/types/crm';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  showActions?: boolean;
}

export function LeadCard({ lead, onClick, showActions = true }: LeadCardProps) {
  const timeSinceCreated = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const formatPhone = (phone: string) => {
    // Remove non-digits
    const digits = phone.replace(/\D/g, '');
    // Format as WhatsApp link
    return `https://wa.me/55${digits}`;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'Não informado';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sem_atendimento':
        return 'bg-muted text-muted-foreground';
      case 'nao_atendeu':
        return 'bg-warning/20 text-warning-foreground border-warning';
      case 'em_contato':
        return 'bg-info/20 text-info-foreground border-info';
      case 'qualificado':
        return 'bg-success/20 text-success-foreground border-success';
      case 'reuniao_marcada':
        return 'bg-primary/20 text-primary border-primary';
      case 'envio_proposta':
        return 'bg-info/20 text-info-foreground border-info';
      case 'vendido':
        return 'bg-success/30 text-success-foreground border-success';
      case 'recuperacao_sdr':
        return 'bg-destructive/20 text-destructive border-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        <h3 className="font-semibold text-foreground truncate">{lead.full_name}</h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{lead.company_name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{lead.phone}</span>
        </div>
      </CardContent>
    </Card>
  );
}