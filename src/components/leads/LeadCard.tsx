import { Phone, Mail, Building, Clock, MessageSquare, FileText, CalendarClock, CheckCircle2, Eye, FileCheck, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, STATUS_LABELS, PROPOSAL_PRODUCTS } from '@/types/crm';
import { formatDistanceToNow, format, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onViewSale?: () => void;
  onUpdateSaleStatus?: (leadId: string, field: 'contract' | 'payment', value: boolean) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function LeadCard({ lead, onClick, onViewSale, onUpdateSaleStatus, showActions = true, compact = false }: LeadCardProps) {
  const timeSinceCreated = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return "https://api.whatsapp.com/send/?phone=55" + digits;
  };

  const formatCurrency = (value?: number | null) => {
    if (!value) return 'Não informado';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const closingDate = lead.sale_confirmed_at ? new Date(lead.sale_confirmed_at) : null;
  const createdDate = new Date(lead.created_at);
  const daysToClose = closingDate ? differenceInDays(closingDate, createdDate) : null;

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

  // Compact mode for Kanban
  if (compact) {
    const productLabel = lead.proposal_product 
      ? PROPOSAL_PRODUCTS.find(p => p.id === lead.proposal_product)?.label 
      : null;

    const isVendido = lead.status === 'vendido';

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md relative ${
          isVendido 
            ? 'bg-success/20 border-success hover:border-success/70' 
            : 'hover:border-primary/50'
        }`}
        onClick={onClick}
      >
        {lead.status === 'sem_atendimento' && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
              <Clock className="h-3 w-3 mr-1" />
              {timeSinceCreated}
            </Badge>
          </div>
        )}
        {isVendido && (
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                onViewSale?.();
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver negociação
            </Button>
          </div>
        )}
        <CardContent className={`p-3 space-y-1.5 ${lead.status === 'sem_atendimento' || isVendido ? 'pt-10' : 'pt-3'}`}>
          {lead.needs_scheduling && (
            <Badge className="bg-destructive text-destructive-foreground text-xs mb-1">
              Precisa agendar call!
            </Badge>
          )}
          {isVendido && (
            <Badge className="bg-success text-success-foreground text-xs mb-1 flex items-center gap-1 w-fit">
              <CheckCircle2 className="h-3 w-3" />
              {productLabel || 'Vendido'}
            </Badge>
          )}
          {lead.status === 'envio_proposta' && lead.proposal_product && lead.proposal_value && (
            <Badge className="bg-primary text-primary-foreground text-xs mb-1 flex items-center gap-1 w-fit">
              <FileText className="h-3 w-3" />
              {productLabel} • {formatCurrency(lead.proposal_value)}
            </Badge>
          )}
          {lead.status === 'envio_proposta' && lead.proposal_follow_up_at && (
            (() => {
              const followUpDate = new Date(lead.proposal_follow_up_at);
              const isOverdue = isBefore(followUpDate, new Date());
              return (
                <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  <CalendarClock className="h-3 w-3" />
                  <span>Retorno: {format(followUpDate, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                  {isOverdue && <span className="text-destructive">(Atrasado)</span>}
                </div>
              );
            })()
          )}
          <h3 className={`font-semibold truncate ${isVendido ? 'text-success-foreground' : 'text-foreground'}`}>{lead.full_name}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.company_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{lead.phone}</span>
          </div>
          
          {/* Datas para leads vendidos */}
          {isVendido && (
            <div className="pt-2 mt-2 border-t border-success/30 space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Cadastro: {format(createdDate, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              {closingDate && (
                <div className="flex items-center gap-1 text-xs text-success-foreground font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Fechamento: {format(closingDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {daysToClose !== null && (
                <div className="text-xs text-muted-foreground">
                  ⏱️ Tempo de fechamento: <span className="font-medium">{daysToClose} dias</span>
                </div>
              )}
              
              {/* Status do Contrato e Pagamento - Editável */}
              <div className="flex flex-col gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileCheck className="h-3 w-3" />
                    <span>Contrato:</span>
                  </div>
                  <Select 
                    value={lead.sale_contract_sent ? 'sim' : 'nao'} 
                    onValueChange={(value) => onUpdateSaleStatus?.(lead.id, 'contract', value === 'sim')}
                  >
                    <SelectTrigger className={`h-6 w-24 text-xs ${lead.sale_contract_sent ? 'border-success text-success-foreground' : 'border-warning text-warning'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Pendente</SelectItem>
                      <SelectItem value="sim">Enviado ✓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    <span>Pagamento:</span>
                  </div>
                  <Select 
                    value={lead.sale_payment_received ? 'sim' : 'nao'} 
                    onValueChange={(value) => onUpdateSaleStatus?.(lead.id, 'payment', value === 'sim')}
                  >
                    <SelectTrigger className={`h-6 w-24 text-xs ${lead.sale_payment_received ? 'border-success text-success-foreground' : 'border-warning text-warning'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Pendente</SelectItem>
                      <SelectItem value="sim">Realizado ✓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full mode for Leads page
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{lead.full_name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.company_name}</span>
            </div>
          </div>
          <Badge className={`shrink-0 text-xs ${getStatusColor(lead.status)}`}>
            {STATUS_LABELS[lead.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{lead.phone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Faturamento:</span>
          <span className="font-medium">{formatCurrency(lead.monthly_revenue)}</span>
        </div>

        {lead.funnel_type === 'franquia' && (
          <Badge variant="outline" className="text-xs">
            Franquia
          </Badge>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground border-t border-border pt-2">
          <Clock className="h-3 w-3" />
          <span>Cadastrado {timeSinceCreated}</span>
        </div>

        {lead.utm_source && (
          <div className="text-xs text-muted-foreground">
            Origem: {lead.utm_source}
            {lead.utm_medium && ` / ${lead.utm_medium}`}
          </div>
        )}

        {showActions && (
          <Button
            className="w-full gap-2"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(formatPhone(lead.phone), '_blank');
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Abrir WhatsApp
          </Button>
        )}
      </CardContent>
    </Card>
  );
}