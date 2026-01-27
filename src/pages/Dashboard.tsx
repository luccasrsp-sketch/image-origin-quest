import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Calendar, Clock, DollarSign, Target } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useCalendar } from '@/hooks/useCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_LABELS } from '@/types/crm';
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
  const { leads } = useLeads();
  const { events } = useCalendar();
  const { profile } = useAuth();

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
      <div className="space-y-6">
        {/* Welcome message */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Aqui está o resumo do seu CRM hoje.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leads Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newLeadsToday}</div>
              <p className="text-xs text-muted-foreground">
                +{newLeadsThisWeek} esta semana
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {soldLeads} de {leads.length} leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reuniões Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayEvents.length}</div>
              <p className="text-xs text-muted-foreground">
                {events.length} total agendadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Potencial</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads vendidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }} 
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-2">
                {statusDistribution.map((item, index) => (
                  <Badge 
                    key={item.name} 
                    variant="secondary"
                    className="text-xs"
                    style={{ borderLeft: `3px solid ${COLORS[index % COLORS.length]}` }}
                  >
                    {item.name}: {item.value}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent leads and upcoming events */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Leads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{lead.full_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.company_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {STATUS_LABELS[lead.status]}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhum lead cadastrado</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.slice(0, 5).map(event => (
                  <div key={event.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.lead?.full_name || 'Sem lead vinculado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(event.start_time).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.start_time).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhum evento agendado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}