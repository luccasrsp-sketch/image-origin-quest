import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead, ProposalProduct, PROPOSAL_PRODUCTS } from '@/types/crm';
import { FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ProposalDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    leadId: string;
    product: ProposalProduct;
    value: number;
    paymentMethod: string;
    followUpAt: Date;
  }) => Promise<boolean>;
}

export function ProposalDialog({ lead, open, onOpenChange, onSubmit }: ProposalDialogProps) {
  const [product, setProduct] = useState<ProposalProduct | ''>('');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setProduct('');
    setValue('');
    setPaymentMethod('');
    setFollowUpDate('');
    setFollowUpTime('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!lead || !product || !value || !paymentMethod || !followUpDate || !followUpTime) return;

    const followUpAt = new Date(`${followUpDate}T${followUpTime}`);
    const numericValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));

    if (isNaN(numericValue)) {
      return;
    }

    setIsSaving(true);
    const success = await onSubmit({
      leadId: lead.id,
      product: product as ProposalProduct,
      value: numericValue,
      paymentMethod,
      followUpAt,
    });
    setIsSaving(false);

    if (success) {
      handleClose();
    }
  };

  const isFormValid = product && value && paymentMethod && followUpDate && followUpTime;

  if (!lead) return null;

  // Get min date (today)
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Envio de Proposta
          </DialogTitle>
          <DialogDescription>
            Registre os detalhes da proposta enviada para <strong>{lead.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Produto */}
          <div className="space-y-2">
            <Label htmlFor="product">Produto</Label>
            <Select value={product} onValueChange={(v) => setProduct(v as ProposalProduct)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_PRODUCTS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor</Label>
            <Input
              id="value"
              type="text"
              placeholder="R$ 0,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
            <Input
              id="paymentMethod"
              type="text"
              placeholder="Ex: Cartão de crédito 12x, Boleto..."
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
          </div>

          {/* Prazo de retorno */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prazo de Retorno
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Data e horário para cobrar posicionamento do lead. Um lembrete será criado na sua agenda.
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                min={today}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSaving}>
            {isSaving ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
