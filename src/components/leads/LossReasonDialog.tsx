import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lead } from '@/types/crm';
import { XCircle, AlertTriangle } from 'lucide-react';

interface LossReasonDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (leadId: string, reason: string) => Promise<boolean>;
}

export function LossReasonDialog({ lead, open, onOpenChange, onConfirm }: LossReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!lead || !reason.trim()) return;
    
    setIsSubmitting(true);
    const success = await onConfirm(lead.id, reason.trim());
    setIsSubmitting(false);
    
    if (success) {
      setReason('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Marcar Lead como Perdido
          </DialogTitle>
          <DialogDescription>
            {lead && (
              <span className="block mt-2">
                <strong>{lead.full_name}</strong> - {lead.company_name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Esta ação marcará o lead como perdido permanentemente. Por favor, informe o motivo para análise futura.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lossReason">Qual motivo do lead não comprar agora? *</Label>
            <Textarea
              id="lossReason"
              placeholder="Ex: Cliente não tem orçamento, optou por concorrente, projeto adiado, sem interesse no momento..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Descreva detalhadamente o motivo. Isso nos ajudará a otimizar a captação de leads.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
