import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Calendar, Clock, DollarSign, Target, AlertCircle, Phone, FileText } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useCalendar } from '@/hooks/useCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow, isAfter, isBefore, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS, PROPOSAL_PRODUCTS } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { DailyReportDialog } from '@/components/reports/DailyReportDialog';
import { DailyVerse } from '@/components/dashboard/DailyVerse';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function Dashboard() {
  const { filteredLeads: leads } = useLeads();
  const { filteredEvents: events } = useCalendar();
  const { profile, viewingAs } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  // Calculate metrics
  const newLeadsToday = leads.filter(l => {
    const today = new Date();
    const leadDate = new Date(l.created_at);
    return leadDate.toDateString() === today.toDateString();
  }).length;

  const newLeadsThisWeek = leads.filter(l => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(l.created_at) >= weekAgo;
  }).length;

  const soldLeads = leads.filter(l => l.status === 'vendido').length;
  const conversionRate = leads.length > 0 ? ((soldLeads / leads.length) * 100).toFixed(1) : '0';

  const totalRevenue = leads
    .filter(l => l.status === 'vendido')
    .reduce((sum, l) => sum + (l.monthly_revenue || 0), 0);

  const todayEvents = events.filter(e => {
    const today = new Date();
    const eventDate = new Date(e.start_time);
    return eventDate.toDateString() === today.toDateString();
  });

  // Status distribution for pie chart
  const statusDistribution = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
    value: count,
  }));

  // Weekly leads trend
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayLeads = leads.filter(l => {
      const leadDate = new Date(l.created_at);
      return leadDate.toDateString() === date.toDateString();
    }).length;
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      leads: dayLeads,
    };
  });

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-4 md:space-y-6">
        {/* Welcome message + Report button */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {viewingAs 
                ? `Painel de ${viewingAs.full_name}` 
                : `Olá, ${profile?.full_name?.split(' ')[0]}! 👋`
              }
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {viewingAs 
                ? `Visualizando como ${viewingAs.roles.includes('sdr') ? 'SDR' : 'Closer'}` 
                : 'Aqui está o resumo do seu CRM hoje.'
              }
            </p>
          </div>
          <Button 
            onClick={() => setReportOpen(true)} 
            className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto touch-manipulation min-h-[44px]"
          >
            <FileText className="h-4 w-4" />
            Relatório Simples
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="touch-manipulation active:scale-[0.98] transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Leads Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{newLeadsToday}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                +{newLeadsThisWeek} esta semana
              </p>
            </CardContent>
          </Card>

          <Card className="touch-manipulation active:scale-[0.98] transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{conversionRate}%</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {soldLeads}/{leads.length} leads
              </p>
            </CardContent>
          </Card>

          <Card className="touch-manipulation active:scale-[0.98] transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Reuniões</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{todayEvents.length}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {events.length} agendadas
              </p>
            </CardContent>
          </Card>

          <Card className="touch-manipulation active:scale-[0.98] transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {totalRevenue >= 1000 
                  ? `R$ ${(totalRevenue / 1000).toFixed(0)}K`
                  : totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                }
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Vendidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Verse */}
        <DailyVerse />

        {/* Charts - stack on mobile */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base">Leads por Dia</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} width={30} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: '12px',
                    }} 
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      fontSize: '12px',
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 md:mt-4 flex flex-wrap gap-1 md:gap-2">
                {statusDistribution.map((item, index) => (
                  <Badge 
                    key={item.name} 
                    variant="secondary"
                    className="text-[10px] md:text-xs"
                    style={{ borderLeft: `3px solid ${COLORS[index % COLORS.length]}` }}
                  >
                    {item.name}: {item.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-ups Pendentes */}
        <Card className="border-warning/50">
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-warning text-sm md:text-base">
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
              Follow-ups Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="space-y-2 md:space-y-3">
              {leads
                .filter(l => l.proposal_follow_up_at && l.status === 'envio_proposta')
                .sort((a, b) => new Date(a.proposal_follow_up_at!).getTime() - new Date(b.proposal_follow_up_at!).getTime())
                .slice(0, 5)
                .map(lead => {
                  const followUpDate = new Date(lead.proposal_follow_up_at!);
                  const now = new Date();
                  const isOverdue = isBefore(followUpDate, now);
                  const isUrgent = !isOverdue && isBefore(followUpDate, addHours(now, 24));
                  const productLabel = lead.proposal_product 
                    ? PROPOSAL_PRODUCTS.find(p => p.id === lead.proposal_product)?.label 
                    : null;

                  return (
                    <div 
                      key={lead.id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-3 gap-2 touch-manipulation active:scale-[0.99] transition-transform ${
                        isOverdue 
                          ? 'border-destructive bg-destructive/10' 
                          : isUrgent 
                            ? 'border-warning bg-warning/10' 
                            : 'border-border'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate text-sm md:text-base">{lead.full_name}</p>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] md:text-xs">Atrasado</Badge>
                          )}
                          {isUrgent && !isOverdue && (
                            <Badge className="bg-warning text-warning-foreground text-[10px] md:text-xs">Hoje</Badge>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{lead.company_name}</p>
                        {productLabel && lead.proposal_value && (
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                            {productLabel} • {lead.proposal_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:text-right sm:ml-3 shrink-0">
                        <p className={`text-xs md:text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                          {format(followUpDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 md:h-7 text-xs gap-1 touch-manipulation min-w-[100px]"
                          onClick={() => {
                            const digits = lead.phone.replace(/\D/g, '');
                            window.open(`https://api.whatsapp.com/send/?phone=55${digits}`, '_blank');
                          }}
                        >
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  );
                })}
              {leads.filter(l => l.proposal_follow_up_at && l.status === 'envio_proposta').length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhum follow-up pendente</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent leads and upcoming events */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Target className="h-4 w-4 md:h-5 md:w-5" />
                Leads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="space-y-3 md:space-y-4">
                {leads.slice(0, 5).map(lead => (
                  <div 
                    key={lead.id} 
                    className="flex items-center justify-between border-b border-border pb-2 md:pb-3 last:border-0 touch-manipulation"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">{lead.full_name}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{lead.company_name}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px] md:text-xs">
                        {STATUS_LABELS[lead.status]}
                      </Badge>
                      <p className="mt-1 text-[10px] md:text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nenhum lead cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Clock className="h-4 w-4 md:h-5 md:w-5" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="space-y-3 md:space-y-4">
                {events.slice(0, 5).map(event => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between border-b border-border pb-2 md:pb-3 last:border-0 touch-manipulation"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">{event.title}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {event.lead?.full_name || 'Sem lead vinculado'}
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-xs md:text-sm font-medium">
                        {new Date(event.start_time).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {new Date(event.start_time).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nenhum evento agendado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily Report Dialog */}
      <DailyReportDialog open={reportOpen} onOpenChange={setReportOpen} />
    </AppLayout>
  );
}