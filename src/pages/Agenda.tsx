import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCalendar } from '@/hooks/useCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { format, isSameDay, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Clock, 
  User, 
  Building,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { CalendarEvent } from '@/types/crm';

export default function AgendaPage() {
  const { events, loading } = useCalendar();
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Get events for selected date
  const dayEvents = events.filter(event => 
    isSameDay(new Date(event.start_time), selectedDate)
  );

  // Get events for the week view
  const weekStart = startOfDay(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get dates that have events for calendar highlighting
  const eventDates = events.map(e => startOfDay(new Date(e.start_time)));

  const navigateDay = (direction: number) => {
    setSelectedDate(d => addDays(d, direction));
  };

  return (
    <AppLayout title="Agenda">
      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Sidebar with calendar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                locale={ptBR}
                modifiers={{
                  hasEvent: (date) => eventDates.some(d => isSameDay(d, date)),
                }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                  },
                }}
              />
            </CardContent>
          </Card>

          <Button 
            className="w-full gap-2" 
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>

          {/* Today's summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{dayEvents.length}</p>
                <p className="text-sm text-muted-foreground">
                  {dayEvents.length === 1 ? 'evento' : 'eventos'} agendados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main agenda view */}
        <div className="space-y-4">
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              {isSameDay(selectedDate, new Date()) && (
                <Badge variant="secondary">Hoje</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
            </div>
          </div>

          {/* Day view */}
          {viewMode === 'day' && (
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : dayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nenhum evento</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Não há eventos agendados para este dia.
                    </p>
                    <Button 
                      className="mt-4 gap-2" 
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Agendar Evento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayEvents
                      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                      .map(event => (
                        <div
                          key={event.id}
                          className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="flex flex-col items-center justify-center min-w-[60px] text-center">
                            <span className="text-lg font-bold">
                              {format(new Date(event.start_time), 'HH:mm')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.end_time), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{event.title}</h4>
                            {event.lead && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <Building className="h-3 w-3 shrink-0" />
                                <span className="truncate">{event.lead.company_name}</span>
                              </div>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {event.event_type === 'meeting' ? 'Reunião' : event.event_type}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Week view */}
          {viewMode === 'week' && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, index) => {
                    const dayEvts = events.filter(e => isSameDay(new Date(e.start_time), day));
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <div
                        key={index}
                        className={`min-h-[200px] p-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : ''
                        } ${isToday ? 'bg-muted/50' : ''}`}
                        onClick={() => {
                          setSelectedDate(day);
                          setViewMode('day');
                        }}
                      >
                        <div className="text-center mb-2">
                          <p className="text-xs text-muted-foreground">
                            {format(day, 'EEE', { locale: ptBR })}
                          </p>
                          <p className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                            {format(day, 'd')}
                          </p>
                        </div>
                        <div className="space-y-1">
                          {dayEvts.slice(0, 3).map(evt => (
                            <div
                              key={evt.id}
                              className="text-xs p-1 rounded bg-primary/20 truncate"
                            >
                              {format(new Date(evt.start_time), 'HH:mm')} {evt.title}
                            </div>
                          ))}
                          {dayEvts.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{dayEvts.length - 3} mais
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create event dialog */}
      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultDate={selectedDate}
      />

      {/* Event detail dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </AppLayout>
  );
}