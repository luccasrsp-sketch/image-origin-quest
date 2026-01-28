import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  XCircle,
  MessageSquareWarning,
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

  // Lost leads analysis
  const lostLeads = leads.filter(l => l.status === 'perdido' && l.loss_reason);
  
  // Extract and categorize loss reasons
  const categorizeReason = (reason: string): string => {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('orçamento') || lowerReason.includes('preço') || lowerReason.includes('caro') || lowerReason.includes('dinheiro') || lowerReason.includes('investimento') || lowerReason.includes('valor')) {
      return 'Sem Orçamento';
    }
    if (lowerReason.includes('concorrente') || lowerReason.includes('concorrência') || lowerReason.includes('outra empresa') || lowerReason.includes('outro fornecedor')) {
      return 'Optou por Concorrente';
    }
    if (lowerReason.includes('momento') || lowerReason.includes('timing') || lowerReason.includes('agora não') || lowerReason.includes('depois') || lowerReason.includes('adiou') || lowerReason.includes('adiar') || lowerReason.includes('futuro')) {
      return 'Momento Inadequado';
    }
    if (lowerReason.includes('interesse') || lowerReason.includes('não quer') || lowerReason.includes('desistiu') || lowerReason.includes('não precisa')) {
      return 'Sem Interesse';
    }
    if (lowerReason.includes('contato') || lowerReason.includes('não atende') || lowerReason.includes('sumiu') || lowerReason.includes('ghost') || lowerReason.includes('não responde')) {
      return 'Sem Retorno';
    }
    if (lowerReason.includes('perfil') || lowerReason.includes('não se encaixa') || lowerReason.includes('não é pra') || lowerReason.includes('público')) {
      return 'Fora do Perfil';
    }
    return 'Outros Motivos';
  };

  const lossReasonCounts = lostLeads.reduce((acc, lead) => {
    const category = categorizeReason(lead.loss_reason || '');
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lossReasonRanking = Object.entries(lossReasonCounts)
    .map(([reason, count]) => ({ reason, count, percentage: ((count / lostLeads.length) * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  // Word cloud data - extract common words from loss reasons
  const extractWords = (reasons: string[]): { text: string; value: number }[] => {
    const stopWords = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'por', 'para', 'com', 'que', 'e', 'é', 'foi', 'ser', 'está', 'não', 'se', 'ele', 'ela', 'eles', 'elas', 'seu', 'sua', 'seus', 'suas', 'isso', 'este', 'esta', 'esse', 'essa', 'ao', 'à', 'às', 'aos', 'já', 'também', 'muito', 'mais', 'como', 'mas', 'ou', 'porque', 'quando', 'qual', 'até', 'sem', 'sobre', 'entre', 'depois', 'antes', 'ainda', 'agora', 'então', 'só', 'ter', 'tem', 'tinha', 'vai', 'vão', 'estava', 'era', 'eram']);
    
    const wordCounts: Record<string, number> = {};
    
    reasons.forEach(reason => {
      const words = reason.toLowerCase()
        .replace(/[^\wáàâãéèêíìîóòôõúùûç\s]/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
      
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });
    
    return Object.entries(wordCounts)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);
  };

  const wordCloudData = extractWords(lostLeads.map(l => l.loss_reason || ''));

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

        {/* Loss Reason Analysis Section */}
        {lostLeads.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-4">
              <XCircle className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-semibold">Análise de Leads Perdidos</h2>
              <Badge variant="destructive">{lostLeads.length} leads perdidos</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Ranking of Loss Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareWarning className="h-5 w-5" />
                    Ranking de Motivos de Perda
                  </CardTitle>
                  <CardDescription>
                    Motivos categorizados automaticamente com base nas respostas dos vendedores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lossReasonRanking.map((item, index) => (
                      <div key={item.reason} className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          index === 0 ? 'bg-destructive text-destructive-foreground' :
                          index === 1 ? 'bg-warning text-warning-foreground' :
                          index === 2 ? 'bg-muted text-muted-foreground' :
                          'bg-muted/50 text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.reason}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-muted">
                            <div 
                              className="h-full rounded-full bg-destructive/70 transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Word Cloud Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Nuvem de Palavras</CardTitle>
                  <CardDescription>
                    Palavras mais frequentes nos motivos de perda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 justify-center items-center min-h-[200px]">
                    {wordCloudData.map((word, index) => {
                      const maxValue = wordCloudData[0]?.value || 1;
                      const sizeRatio = word.value / maxValue;
                      const fontSize = Math.max(12, Math.min(36, 12 + sizeRatio * 24));
                      const opacity = 0.4 + sizeRatio * 0.6;
                      
                      return (
                        <span 
                          key={word.text}
                          className="text-destructive transition-all hover:scale-110 cursor-default"
                          style={{ 
                            fontSize: `${fontSize}px`,
                            opacity,
                            fontWeight: sizeRatio > 0.5 ? 600 : 400,
                          }}
                          title={`"${word.text}" apareceu ${word.value} vezes`}
                        >
                          {word.text}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Loss Reasons */}
            <Card>
              <CardHeader>
                <CardTitle>Últimos Motivos de Perda</CardTitle>
                <CardDescription>
                  Motivos registrados pelos vendedores (mais recentes primeiro)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {lostLeads
                    .sort((a, b) => new Date(b.lost_at || b.updated_at).getTime() - new Date(a.lost_at || a.updated_at).getTime())
                    .slice(0, 10)
                    .map((lead) => (
                      <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{lead.full_name}</span>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {categorizeReason(lead.loss_reason || '')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{lead.loss_reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {lead.lost_at ? format(new Date(lead.lost_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não registrada'}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}