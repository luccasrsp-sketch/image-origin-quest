import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarEvent } from '@/types/crm';
import { useCalendar } from '@/hooks/useCalendar';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Trash2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  const { deleteEvent, updateEvent } = useCalendar();
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [notCompletedReason, setNotCompletedReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!event) return null;

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      await deleteEvent(event.id);
      onOpenChange(false);
    }
  };

  const handleMarkAsCompleted = async (completed: boolean) => {
    if (!completed) {
      setShowReasonInput(true);
      return;
    }

    setIsSaving(true);
    await updateEvent(event.id, {
      meeting_completed: true,
      meeting_not_completed_reason: null,
    });
    setIsSaving(false);
  };

  const handleSaveNotCompletedReason = async () => {
    if (!notCompletedReason.trim()) return;

    setIsSaving(true);
    await updateEvent(event.id, {
      meeting_completed: false,
      meeting_not_completed_reason: notCompletedReason.trim(),
    });
    setShowReasonInput(false);
    setNotCompletedReason('');
    setIsSaving(false);
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  };

  const eventTypeLabels: Record<string, string> = {
    meeting: 'Reunião',
    call: 'Ligação',
    followup: 'Follow-up',
    other: 'Outro',
  };

  // Check if the event is a meeting (can be marked as completed)
  const isMeeting = event.event_type === 'meeting';
  const canMarkCompletion = isMeeting;
  const meetingCompleted = event.meeting_completed;
  const meetingNotCompletedReason = event.meeting_not_completed_reason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {format(new Date(event.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
              </p>
            </div>
          </div>

          {/* Event type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo</span>
            <Badge variant="secondary">
              {eventTypeLabels[event.event_type] || event.event_type}
            </Badge>
          </div>

          {/* Meeting completion status */}
          {canMarkCompletion && (
            <div className="p-3 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reunião Realizada?</span>
                {meetingCompleted === null && (
                  <Badge variant="outline" className="gap-1 text-warning">
                    <AlertCircle className="h-3 w-3" />
                    Pendente
                  </Badge>
                )}
              </div>

              {/* Show reason if not completed */}
              {meetingCompleted === false && meetingNotCompletedReason && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <span className="font-medium">Motivo:</span> {meetingNotCompletedReason}
                </div>
              )}

              {/* Buttons to mark completion - only show if not yet marked */}
              {meetingCompleted === null && !showReasonInput && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-success hover:text-success hover:bg-success/10 border-success/50"
                    onClick={() => handleMarkAsCompleted(true)}
                    disabled={isSaving}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Sim
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
                    onClick={() => handleMarkAsCompleted(false)}
                    disabled={isSaving}
                  >
                    <XCircle className="h-4 w-4" />
                    Não
                  </Button>
                </div>
              )}

              {/* Show only "Sim" marked when completed */}
              {meetingCompleted === true && (
                <div className="flex items-center justify-center gap-2 p-2 bg-success/10 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">Reunião realizada</span>
                </div>
              )}

              {/* Reason input when "No" is selected */}
              {showReasonInput && (
                <div className="space-y-2">
                  <Label className="text-sm">Por que a reunião não foi realizada?</Label>
                  <Textarea
                    value={notCompletedReason}
                    onChange={(e) => setNotCompletedReason(e.target.value)}
                    placeholder="Descreva o motivo..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReasonInput(false);
                        setNotCompletedReason('');
                      }}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotCompletedReason}
                      disabled={isSaving || !notCompletedReason.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Responsible user */}
          {event.user && (
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Responsável</p>
                <p className="font-medium">{event.user.full_name}</p>
              </div>
            </div>
          )}

          {/* Linked lead */}
          {event.lead && (
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lead vinculado</span>
              </div>
              <div>
                <p className="font-medium">{event.lead.full_name}</p>
                <p className="text-sm text-muted-foreground">{event.lead.company_name}</p>
              </div>
              {event.lead.phone && (
                <Button
                  className="w-full gap-2"
                  size="sm"
                  onClick={() => {
                    const url = formatPhone(event.lead?.phone);
                    if (url) window.open(url, '_blank');
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Abrir WhatsApp
                </Button>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p className="text-sm">{event.description}</p>
            </div>
          )}

          {/* Created at */}
          <p className="text-xs text-muted-foreground">
            Criado em {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
