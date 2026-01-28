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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lead } from '@/types/crm';
import { Calendar, X, Check } from 'lucide-react';

interface QualificationDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleMeeting: (lead: Lead) => void;
  onNeedScheduling: (leadId: string, reason: string) => Promise<boolean>;
}

export function QualificationDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onScheduleMeeting,
  onNeedScheduling 
}: QualificationDialogProps) {
  const [step, setStep] = useState<'question' | 'reason'>('question');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setStep('question');
    setReason('');
    onOpenChange(false);
  };

  const handleYes = () => {
    if (lead) {
      onScheduleMeeting(lead);
      handleClose();
    }
  };

  const handleNo = () => {
    setStep('reason');
  };

  const handleSaveReason = async () => {
    if (!lead || !reason.trim()) return;
    
    setIsSaving(true);
    const success = await onNeedScheduling(lead.id, reason.trim());
    setIsSaving(false);
    
    if (success) {
      handleClose();
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 'question' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Lead Qualificado!
              </DialogTitle>
              <DialogDescription>
                <strong>{lead.full_name}</strong> foi movido para Qualificado.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center">
              <p className="text-lg font-medium text-foreground mb-2">
                Conseguiu agendar a reunião?
              </p>
              <p className="text-sm text-muted-foreground">
                Se sim, você poderá preencher as informações da reunião.
              </p>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button 
                variant="outline" 
                className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleNo}
              >
                <X className="h-4 w-4" />
                Não
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={handleYes}
              >
                <Check className="h-4 w-4" />
                Sim
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-destructive">
                Motivo do não agendamento
              </DialogTitle>
              <DialogDescription>
                Informe o motivo pelo qual ainda não foi possível agendar a reunião com <strong>{lead.full_name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Lead pediu para retornar na próxima semana, horário incompatível..."
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button 
                variant="outline"
                onClick={() => setStep('question')}
              >
                Voltar
              </Button>
              <Button 
                onClick={handleSaveReason}
                disabled={!reason.trim() || isSaving}
              >
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
