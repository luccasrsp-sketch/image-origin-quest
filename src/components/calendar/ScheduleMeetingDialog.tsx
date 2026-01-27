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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lead } from '@/types/crm';
import { useCalendar } from '@/hooks/useCalendar';
import { useTeam } from '@/hooks/useTeam';
import { Calendar, Clock, User } from 'lucide-react';

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
  const { createEvent } = useCalendar();
  const { getClosers } = useTeam();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    closerId: '',
    date: '',
    startTime: '',
    endTime: '',
  });

  const closers = getClosers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !formData.closerId || !formData.date || !formData.startTime) return;

    setIsLoading(true);

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = formData.endTime 
      ? new Date(`${formData.date}T${formData.endTime}`)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    const title = formData.title || `Reunião com ${lead.full_name}`;

    await createEvent({
      title,
      description: formData.description || `Reunião de apresentação - ${lead.company_name}`,
      lead_id: lead.id,
      user_id: formData.closerId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      event_type: 'meeting',
    });

    setIsLoading(false);
    setFormData({
      title: '',
      description: '',
      closerId: '',
      date: '',
      startTime: '',
      endTime: '',
    });
    onScheduled();
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Reunião
          </DialogTitle>
          <DialogDescription>
            Agendar reunião com {lead.full_name} - {lead.company_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="closer">Closer Responsável</Label>
            <Select 
              value={formData.closerId} 
              onValueChange={v => setFormData(d => ({ ...d, closerId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar closer" />
              </SelectTrigger>
              <SelectContent>
                {closers.map(closer => (
                  <SelectItem key={closer.id} value={closer.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {closer.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="startTime">Horário</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={e => setFormData(d => ({ ...d, startTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">Término (opcional)</Label>
            <Input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={e => setFormData(d => ({ ...d, endTime: e.target.value }))}
            />
          </div>

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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.closerId || !formData.date || !formData.startTime || isLoading}
            >
              {isLoading ? 'Agendando...' : 'Agendar Reunião'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}