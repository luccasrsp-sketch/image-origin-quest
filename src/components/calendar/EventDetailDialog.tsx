import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarEvent } from '@/types/crm';
import { useCalendar } from '@/hooks/useCalendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Trash2,
  MessageSquare,
} from 'lucide-react';

interface EventDetailDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  const { deleteEvent } = useCalendar();

  if (!event) return null;

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      await deleteEvent(event.id);
      onOpenChange(false);
    }
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