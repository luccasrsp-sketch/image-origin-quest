import { Lead, PROPOSAL_PRODUCTS } from '@/types/crm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, 
  Building2, 
  Mail, 
  CreditCard, 
  Banknote, 
  Calendar,
  FileText,
  Clock
} from 'lucide-react';

interface SaleDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsDialog({ lead, open, onOpenChange }: SaleDetailsDialogProps) {
  if (!lead) return null;

  const productLabel = lead.proposal_product 
    ? PROPOSAL_PRODUCTS.find(p => p.id === lead.proposal_product)?.label 
    : 'Não informado';

  const formatCurrency = (value?: number | null) => {
    if (!value) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const closingDate = lead.sale_confirmed_at ? new Date(lead.sale_confirmed_at) : null;
  const createdDate = new Date(lead.created_at);
  const daysToClose = closingDate ? differenceInDays(closingDate, createdDate) : null;

  const totalValue = (lead.sale_entry_value || 0) + (lead.sale_remaining_value || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalhes da Negociação
          </DialogTitle>
          <DialogDescription>
            Venda realizada para {lead.full_name} - {lead.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status e Datas */}
          <div className="flex items-center justify-between">
            <Badge className="bg-success text-success-foreground">
              Venda Concluída
            </Badge>
            {daysToClose !== null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{daysToClose} dias para fechar</span>
              </div>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Data de Entrada</p>
              <p className="font-medium">{format(createdDate, "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            {closingDate && (
              <div>
                <p className="text-xs text-muted-foreground">Data de Fechamento</p>
                <p className="font-medium">{format(closingDate, "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            )}
          </div>

          {/* Produto */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="h-4 w-4" />
              Produto
            </div>
            <p className="text-lg font-semibold">{productLabel}</p>
          </div>

          {/* Dados da Empresa */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Dados da Empresa</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CNPJ:</span>
                <span className="font-medium">{lead.sale_company_cnpj || 'Não informado'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">E-mail Administrador:</span>
                <span className="font-medium">{lead.sale_admin_email || 'Não informado'}</span>
              </div>
            </div>
          </div>

          {/* Dados do Pagamento */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Dados do Pagamento</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Forma:</span>
                <span className="font-medium">{lead.sale_payment_method || 'Não informado'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="font-medium text-success">{formatCurrency(lead.sale_entry_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Restante</p>
                  <p className="font-medium">{formatCurrency(lead.sale_remaining_value)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="font-medium">Valor Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(totalValue)}</span>
              </div>

              {lead.sale_installments && lead.sale_installments > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span className="font-medium">{lead.sale_installments}x</span>
                </div>
              )}

              {lead.sale_first_check_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">1º Cheque:</span>
                  <span className="font-medium">
                    {format(new Date(lead.sale_first_check_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {lead.sale_observations && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Observações</h4>
              <p className="text-sm p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                {lead.sale_observations}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
