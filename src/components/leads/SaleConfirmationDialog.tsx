import { useState } from 'react';
import { Lead } from '@/types/crm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileText, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PRODUCTS = ['Start', 'Sales', 'Scale', 'Business'];

const PAYMENT_METHODS = [
  'Cartão',
  'Pix',
  'Entrada pix + cartão',
  'Entrada cartão + cheque',
  'Entrada pix + cheque',
];

interface SaleConfirmationDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: SaleData) => Promise<boolean>;
  onCancel: () => void;
}

export interface SaleData {
  leadId: string;
  product: string;
  companyCnpj: string;
  adminEmail: string;
  paymentMethod: string;
  entryValue: number;
  remainingValue: number;
  installments: number;
  firstCheckDate: Date | null;
  observations: string;
  contractSent: boolean;
  paymentReceived: boolean;
}

export function SaleConfirmationDialog({
  lead,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: SaleConfirmationDialogProps) {
  const [step, setStep] = useState<'confirm' | 'form'>('confirm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [product, setProduct] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [remainingValue, setRemainingValue] = useState('');
  const [installments, setInstallments] = useState('');
  const [firstCheckDate, setFirstCheckDate] = useState<Date | undefined>();
  const [observations, setObservations] = useState('');
  const [contractSent, setContractSent] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);

  const showCheckDate = paymentMethod.toLowerCase().includes('cheque');

  const resetForm = () => {
    setStep('confirm');
    setProduct('');
    setCompanyCnpj('');
    setAdminEmail('');
    setPaymentMethod('');
    setEntryValue('');
    setRemainingValue('');
    setInstallments('');
    setFirstCheckDate(undefined);
    setObservations('');
    setContractSent(false);
    setPaymentReceived(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleNo = () => {
    resetForm();
    onCancel();
  };

  const handleYes = () => {
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!lead || !product || !companyCnpj || !adminEmail || !paymentMethod) return;

    setIsSubmitting(true);
    const success = await onConfirm({
      leadId: lead.id,
      product,
      companyCnpj,
      adminEmail,
      paymentMethod,
      entryValue: parseFloat(entryValue.replace(',', '.')) || 0,
      remainingValue: parseFloat(remainingValue.replace(',', '.')) || 0,
      installments: parseInt(installments) || 0,
      firstCheckDate: firstCheckDate || null,
      observations,
      contractSent,
      paymentReceived,
    });
    setIsSubmitting(false);

    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `55${digits}`;
  };

  const sendToWhatsApp = async (type: 'juridico' | 'financeiro') => {
    if (!lead) return;

    // Automatically save the sale when sending to WhatsApp
    if (!isSubmitting) {
      setIsSubmitting(true);
      const saleData: SaleData = {
        leadId: lead.id,
        product,
        companyCnpj,
        adminEmail,
        paymentMethod,
        entryValue: parseFloat(entryValue.replace(',', '.')) || 0,
        remainingValue: parseFloat(remainingValue.replace(',', '.')) || 0,
        installments: parseInt(installments) || 0,
        firstCheckDate: firstCheckDate || null,
        observations,
        contractSent: type === 'juridico' ? true : contractSent, // Mark contract as sent if requesting
        paymentReceived,
      };
      
      const success = await onConfirm(saleData);
      setIsSubmitting(false);
      
      if (!success) {
        return; // Don't send WhatsApp if save failed
      }
      
      // Update local state if we just requested contract
      if (type === 'juridico') {
        setContractSent(true);
      }
    }

    const header = type === 'juridico' 
      ? '📋 *SOLICITAÇÃO DE EMISSÃO DE CONTRATO*' 
      : '💰 *NOVA VENDA REALIZADA*';

    const message = `${header}

👤 *Cliente:* ${lead.full_name}
🏢 *Empresa:* ${lead.company_name}
📞 *Telefone:* ${lead.phone}
📧 *E-mail Administrador:* ${adminEmail}
🔢 *CNPJ:* ${companyCnpj}

📦 *Produto:* ${product}
💳 *Forma de Pagamento:* ${paymentMethod}
💵 *Valor de Entrada:* R$ ${parseFloat(entryValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
💰 *Valor Restante:* R$ ${parseFloat(remainingValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🔢 *Parcelas:* ${installments || 'N/A'}
${showCheckDate && firstCheckDate ? `📅 *Vencimento 1º Cheque:* ${format(firstCheckDate, 'dd/MM/yyyy')}` : ''}
${observations ? `📝 *Observações:* ${observations}` : ''}`;

    const encodedMessage = encodeURIComponent(message);
    const phone = type === 'juridico' ? '5535999749585' : '5535991190980';
    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${encodedMessage}`, '_blank');
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-y-auto",
        step === 'form' ? "sm:max-w-[600px]" : "sm:max-w-[425px]"
      )}>
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Venda</DialogTitle>
              <DialogDescription>
                Confirma que a venda para <strong>{lead.full_name}</strong> ({lead.company_name}) foi efetuada?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleNo}>
                Não
              </Button>
              <Button onClick={handleYes}>
                Sim
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Dados da Venda</DialogTitle>
              <DialogDescription>
                Preencha os dados da venda para {lead.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Produto */}
              <div className="space-y-2">
                <Label htmlFor="product">Produto *</Label>
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ da Empresa *</Label>
                <Input
                  id="cnpj"
                  value={companyCnpj}
                  onChange={(e) => setCompanyCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </div>

              {/* Email Administrador */}
              <div className="space-y-2">
                <Label htmlFor="adminEmail">E-mail do Sócio Administrador *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryValue">Valor de Entrada</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      id="entryValue"
                      type="text"
                      inputMode="decimal"
                      value={entryValue}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, '');
                        setEntryValue(value);
                      }}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remainingValue">Valor Restante</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      id="remainingValue"
                      type="text"
                      inputMode="decimal"
                      value={remainingValue}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, '');
                        setRemainingValue(value);
                      }}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Parcelas */}
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Data do primeiro cheque (condicional) */}
              {showCheckDate && (
                <div className="space-y-2">
                  <Label>Data do Vencimento do 1º Cheque</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !firstCheckDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {firstCheckDate ? (
                          format(firstCheckDate, "PPP", { locale: ptBR })
                        ) : (
                          "Selecione a data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={firstCheckDate}
                        onSelect={setFirstCheckDate}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendToWhatsApp('juridico')}
                  disabled={!product || !companyCnpj || !adminEmail || !paymentMethod}
                  className="flex-1 sm:flex-none"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Solicitar Contrato
                </Button>
                {paymentReceived && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendToWhatsApp('financeiro')}
                    disabled={!product || !companyCnpj || !adminEmail || !paymentMethod}
                    className="flex-1 sm:flex-none"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Enviar ao Financeiro
                  </Button>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Button
                  variant="ghost"
                  onClick={() => handleClose(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !product || !companyCnpj || !adminEmail || !paymentMethod}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Venda'}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
