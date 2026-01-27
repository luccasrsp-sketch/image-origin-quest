import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeads } from '@/hooks/useLeads';
import { useCalendar } from '@/hooks/useCalendar';
import { useTeam } from '@/hooks/useTeam';
import { STATUS_LABELS, LeadStatus } from '@/types/crm';
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
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(199, 89%, 48%)', 'hsl(0, 84%, 60%)', 'hsl(280, 65%, 60%)'];

export default function RelatoriosPage() {
  const { leads } = useLeads();
  const { events } = useCalendar();
  const { team, getSDRs, getClosers } = useTeam();

  // Date ranges
  const today = new Date();
  const last30Days = subDays(today, 30);
  const last7Days = subDays(today, 7);

  // Calculate metrics
  const leadsLast30Days = leads.filter(l => new Date(l.created_at) >= last30Days).length;
  const leadsLast7Days = leads.filter(l => new Date(l.created_at) >= last7Days).length;
  
  const soldLeads = leads.filter(l => l.status === 'vendido');
  const conversionRate = leads.length > 0 ? ((soldLeads.length / leads.length) * 100).toFixed(1) : '0';
  
  const totalRevenue = soldLeads.reduce((sum, l) => sum + (l.monthly_revenue || 0), 0);
  
  const avgTimeToConvert = soldLeads.length > 0 
    ? soldLeads.reduce((sum, l) => {
        const created = new Date(l.created_at);
        const updated = new Date(l.updated_at);
        return sum + (updated.getTime() - created.getTime());
      }, 0) / soldLeads.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;

  // Leads by status for pie chart
  const statusDistribution = Object.entries(
    leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({
    name: STATUS_LABELS[status as LeadStatus] || status,
    value: count,
  }));

  // Leads by day for the last 30 days
  const dateInterval = eachDayOfInterval({ start: last30Days, end: today });
  const leadsByDay = dateInterval.map(date => {
    const dayLeads = leads.filter(l => 
      startOfDay(new Date(l.created_at)).getTime() === startOfDay(date).getTime()
    );
    return {
      date: format(date, 'dd/MM'),
      leads: dayLeads.length,
    };
  });

  // Leads by funnel type
  const funnelDistribution = [
    { name: 'Padrão', value: leads.filter(l => l.funnel_type === 'padrao').length },
    { name: 'Franquia', value: leads.filter(l => l.funnel_type === 'franquia').length },
  ];

  // Performance by team member
  const teamPerformance = team.map(member => {
    const memberLeads = leads.filter(l => 
      l.assigned_sdr_id === member.id || l.assigned_closer_id === member.id
    );
    const memberSold = memberLeads.filter(l => l.status === 'vendido').length;
    const memberMeetings = events.filter(e => e.user_id === member.id).length;
    
    return {
      name: member.full_name.split(' ')[0],
      leads: memberLeads.length,
      vendidos: memberSold,
      reunioes: memberMeetings,
    };
  }).filter(m => m.leads > 0 || m.reunioes > 0);

  // Conversion funnel
  const funnelData = [
    { stage: 'Leads', value: leads.length, fill: 'hsl(var(--muted))' },
    { stage: 'Em Contato', value: leads.filter(l => ['em_contato', 'qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'].includes(l.status)).length, fill: 'hsl(var(--info))' },
    { stage: 'Qualificados', value: leads.filter(l => ['qualificado', 'reuniao_marcada', 'envio_proposta', 'vendido'].includes(l.status)).length, fill: 'hsl(var(--primary))' },
    { stage: 'Reunião', value: leads.filter(l => ['reuniao_marcada', 'envio_proposta', 'vendido'].includes(l.status)).length, fill: 'hsl(var(--warning))' },
    { stage: 'Proposta', value: leads.filter(l => ['envio_proposta', 'vendido'].includes(l.status)).length, fill: 'hsl(var(--success))' },
    { stage: 'Vendidos', value: soldLeads.length, fill: 'hsl(142, 76%, 36%)' },
  ];

  // UTM sources distribution
  const utmSources = Object.entries(
    leads.reduce((acc, lead) => {
      const source = lead.utm_source || 'Direto';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 5);

  return (
    <AppLayout title="Relatórios">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leads (30 dias)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsLast30Days}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-success" />
                {leadsLast7Days} nos últimos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {soldLeads.length} vendidos de {leads.length} leads
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
                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Baseado em leads vendidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio Conversão</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTimeToConvert.toFixed(1)} dias</div>
              <p className="text-xs text-muted-foreground">
                Do cadastro até a venda
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads por Dia (30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={leadsByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    fill="hsl(var(--primary) / 0.2)" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="stage" className="text-xs" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }} 
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
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
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {statusDistribution.slice(0, 5).map((item, index) => (
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

          <Card>
            <CardHeader>
              <CardTitle>Origem dos Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={utmSources}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipo de Funil</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={funnelDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--info))" />
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
            </CardContent>
          </Card>
        </div>

        {/* Team Performance */}
        {teamPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance do Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vendidos" name="Vendidos" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reunioes" name="Reuniões" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}