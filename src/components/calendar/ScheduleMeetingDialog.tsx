import { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/types/crm';
import { useCalendar } from '@/hooks/useCalendar';
import { useTeam } from '@/hooks/useTeam';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { getAvailableSlots } from '@/utils/scheduleSlots';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScheduleMeetingDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: () => void;
}

export function ScheduleMeetingDialog({ 
  lead, 
  open, 
  onOpenChange, 
  onScheduled 
}: ScheduleMeetingDialogProps) {
  const { createEvent, events } = useCalendar();
  const { team, getClosers } = useTeam();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    selectedSlot: '',
    selectedCloserId: '',
  });

  // Lista de closers disponíveis
  const closers = getClosers();

  // O closer pode ser o já atribuído ao lead ou selecionado manualmente
  const closerId = formData.selectedCloserId || lead?.assigned_closer_id || '';
  const hasAssignedCloser = !!lead?.assigned_closer_id;
  
  // Buscar nome do closer da lista de team members
  const closerMember = useMemo(() => {
    if (!closerId) return null;
    return team.find(t => t.id === closerId);
  }, [closerId, team]);
  
  const closerName = closerMember?.full_name || lead?.assigned_closer?.full_name || '';

  // Reset selectedCloserId when dialog opens with a lead that has an assigned closer
  useEffect(() => {
    if (open && lead?.assigned_closer_id) {
      setFormData(prev => ({ ...prev, selectedCloserId: lead.assigned_closer_id || '' }));
    }
  }, [open, lead?.assigned_closer_id]);

  // Get available slots for the assigned closer and selected date
  const availableSlots = useMemo(() => {
    if (!closerId || !formData.date) {
      return [];
    }
    
    return getAvailableSlots(formData.date, events, closerId);
  }, [closerId, formData.date, events]);

  // Reset slot selection when date or closer changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, selectedSlot: '' }));
  }, [formData.date, closerId]);

  const selectedSlotData = useMemo(() => {
    if (!formData.selectedSlot) return null;
    return availableSlots.find(s => s.startTime === formData.selectedSlot) || null;
  }, [formData.selectedSlot, availableSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !closerId || !formData.date || !selectedSlotData) return;

    setIsLoading(true);

    const startDateTime = new Date(`${formData.date}T${selectedSlotData.startTime}:00`);
    const endDateTime = new Date(`${formData.date}T${selectedSlotData.endTime}:00`);

    const title = formData.title || `Reunião com ${lead.full_name}`;

    const result = await createEvent({
      title,
      description: formData.description || `Reunião de apresentação - ${lead.company_name}`,
      lead_id: lead.id,
      user_id: closerId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      event_type: 'meeting',
    });

    setIsLoading(false);
    
    // Só chama onScheduled se o evento foi criado com sucesso
    if (result) {
      setFormData({
        title: '',
        description: '',
        date: '',
        selectedSlot: '',
        selectedCloserId: '',
      });
      onScheduled();
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      selectedSlot: '',
      selectedCloserId: '',
    });
    onOpenChange(false);
  };

  if (!lead) return null;

  const showNoSlotsWarning = closerId && formData.date && availableSlots.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Reunião
          </DialogTitle>
          <DialogDescription>
            Agendar reunião com {lead.full_name} - {lead.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          <div className="space-y-4 pb-2">
            <Alert className="border-primary/50 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> O agendamento é obrigatório para mover o lead para "Reunião Marcada". 
                O evento será criado na agenda do Closer responsável.
              </AlertDescription>
            </Alert>

            <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Reunião</Label>
                <Input
                  id="title"
                  placeholder={`Reunião com ${lead.full_name}`}
                  value={formData.title}
                  onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Closer Responsável</Label>
                {hasAssignedCloser ? (
                  <>
                    <div className="p-3 rounded-md border bg-muted/50 text-sm font-medium">
                      {closerName || 'Carregando...'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O Closer foi atribuído automaticamente pelo sistema.
                    </p>
                  </>
                ) : (
                  <>
                    <Select 
                      value={formData.selectedCloserId} 
                      onValueChange={(value) => setFormData(d => ({ ...d, selectedCloserId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o closer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {closers.map(closer => (
                          <SelectItem key={closer.id} value={closer.id}>
                            {closer.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecione o closer que será responsável pela reunião.
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(d => ({ ...d, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {closerId && formData.date && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horário Disponível
                  </Label>
                  
                  {showNoSlotsWarning ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Não há horários disponíveis para este closer nesta data. Escolha outra data ou outro closer.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="max-h-36 overflow-y-auto rounded-md border p-2">
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.startTime}
                            type="button"
                            variant={formData.selectedSlot === slot.startTime ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => setFormData(d => ({ ...d, selectedSlot: slot.startTime }))}
                          >
                            {slot.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Detalhes sobre a reunião..."
                  value={formData.description}
                  onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </form>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            type="submit"
            form="schedule-form"
            disabled={!closerId || !formData.date || !formData.selectedSlot || isLoading}
          >
            {isLoading ? 'Agendando...' : 'Agendar Reunião'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}