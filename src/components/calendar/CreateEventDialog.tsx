import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCalendar } from '@/hooks/useCalendar';
import { useTeam } from '@/hooks/useTeam';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Plus, User, Building } from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

export function CreateEventDialog({ open, onOpenChange, defaultDate }: CreateEventDialogProps) {
  const { createEvent } = useCalendar();
  const { team } = useTeam();
  const { leads } = useLeads();
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    userId: '',
    leadId: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    eventType: 'meeting',
  });

  useEffect(() => {
    if (defaultDate) {
      setFormData(d => ({
        ...d,
        date: format(defaultDate, 'yyyy-MM-dd'),
      }));
    }
    if (profile?.id) {
      setFormData(d => ({
        ...d,
        userId: profile.id,
      }));
    }
  }, [defaultDate, profile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.date || !formData.startTime || !formData.title) return;

    setIsLoading(true);

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    await createEvent({
      title: formData.title,
      description: formData.description || undefined,
      lead_id: formData.leadId && formData.leadId !== 'none' ? formData.leadId : undefined,
      user_id: formData.userId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      event_type: formData.eventType,
    });

    setIsLoading(false);
    setFormData({
      title: '',
      description: '',
      userId: profile?.id || '',
      leadId: '',
      date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : '',
      startTime: '09:00',
      endTime: '10:00',
      eventType: 'meeting',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Título do evento"
              value={formData.title}
              onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={e => setFormData(d => ({ ...d, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Tipo</Label>
              <Select 
                value={formData.eventType} 
                onValueChange={v => setFormData(d => ({ ...d, eventType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Início *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={e => setFormData(d => ({ ...d, startTime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Término *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={e => setFormData(d => ({ ...d, endTime: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Responsável *</Label>
            <Select 
              value={formData.userId} 
              onValueChange={v => setFormData(d => ({ ...d, userId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar responsável" />
              </SelectTrigger>
              <SelectContent>
                {team.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {member.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead">Lead (opcional)</Label>
            <Select 
              value={formData.leadId} 
              onValueChange={v => setFormData(d => ({ ...d, leadId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vincular a um lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {lead.full_name} - {lead.company_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Detalhes sobre o evento..."
              value={formData.description}
              onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.title || !formData.userId || !formData.date || isLoading}
            >
              {isLoading ? 'Criando...' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}