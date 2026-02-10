import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { useCompany } from '@/contexts/CompanyContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Phone,
  MessageSquare,
  Calendar,
  Mail,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityRecord {
  id: string;
  lead_id: string;
  user_id: string | null;
  action: string;
  activity_type: string | null;
  created_at: string;
  user?: { full_name: string } | null;
}

type DateRange = 'today' | 'week' | 'month' | '7d' | '15d' | '30d' | '60d' | '90d';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: '7d', label: '7 dias' },
  { value: '15d', label: '15 dias' },
  { value: '30d', label: '30 dias' },
  { value: '60d', label: '60 dias' },
  { value: '90d', label: '90 dias' },
];

const ACTIVITY_CONFIG = [
  { type: 'call', label: 'Ligações', icon: Phone, color: 'text-green-500', barColor: 'hsl(142, 76%, 36%)' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-yellow-500', barColor: 'hsl(45, 93%, 47%)' },
  { type: 'meeting', label: 'Reuniões', icon: Calendar, color: 'text-violet-500', barColor: 'hsl(263, 70%, 50%)' },
  { type: 'email', label: 'E-mails', icon: Mail, color: 'text-blue-500', barColor: 'hsl(217, 91%, 60%)' },
];

export function ProductivityReport() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const { team } = useTeam();

  const startDate = useMemo(() => {
    if (dateRange === 'today') return startOfDay(new Date());
    if (dateRange === 'week') return startOfWeek(new Date(), { locale: ptBR });
    if (dateRange === 'month') return startOfMonth(new Date());
    const days = parseInt(dateRange);
    return subDays(new Date(), days);
  }, [dateRange]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange === 'today') return 'hoje';
    if (dateRange === 'week') return 'esta semana';
    if (dateRange === 'month') return 'este mês';
    return `últimos ${dateRange.replace('d', '')} dias`;
  }, [dateRange]);

  const daysCount = useMemo(() => {
    if (dateRange === 'today') return 1;
    if (dateRange === 'week') {
      const now = new Date();
      return Math.max(1, Math.ceil((now.getTime() - startOfWeek(now, { locale: ptBR }).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    if (dateRange === 'month') {
      const now = new Date();
      return Math.max(1, Math.ceil((now.getTime() - startOfMonth(now).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    return parseInt(dateRange);
  }, [dateRange]);

  useEffect(() => {
    fetchActivities();
  }, [startDate]);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lead_activities')
      .select('id, lead_id, user_id, action, activity_type, created_at, user:profiles(*)')
      .eq('action', 'activity_logged')
      .gte('created_at', startOfDay(startDate).toISOString())
      .lte('created_at', endOfDay(new Date()).toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActivities(data as unknown as ActivityRecord[]);
    }
    setLoading(false);
  };

  // Aggregate by user
  const userStats = useMemo(() => {
    const stats: Record<string, { name: string; call: number; whatsapp: number; meeting: number; email: number; total: number }> = {};

    activities.forEach(a => {
      const userId = a.user_id || 'unknown';
      const userName = (a.user as any)?.full_name || 'Sistema';

      if (!stats[userId]) {
        stats[userId] = { name: userName.split(' ').slice(0, 2).join(' '), call: 0, whatsapp: 0, meeting: 0, email: 0, total: 0 };
      }

      const type = a.activity_type as string;
      if (type in stats[userId]) {
        (stats[userId] as any)[type]++;
      }
      stats[userId].total++;
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [activities]);

  // Totals
  const totals = useMemo(() => {
    return {
      call: activities.filter(a => a.activity_type === 'call').length,
      whatsapp: activities.filter(a => a.activity_type === 'whatsapp').length,
      meeting: activities.filter(a => a.activity_type === 'meeting').length,
      email: activities.filter(a => a.activity_type === 'email').length,
      total: activities.length,
    };
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Produtividade dos Vendedores</h2>
          <Badge variant="secondary">{activities.length} atividades</Badge>
        </div>
        <div className="flex gap-1.5">
          {DATE_RANGE_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={dateRange === opt.value ? 'default' : 'outline'}
              size="sm"
              className={`text-xs h-7 px-2.5 ${dateRange === opt.value ? 'text-primary-foreground' : 'text-foreground'}`}
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Carregando atividades...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {ACTIVITY_CONFIG.map(({ type, label, icon: Icon, color }) => (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(totals as any)[type]}</div>
                  <p className="text-xs text-muted-foreground">
                    {((totals as any)[type] / Math.max(daysCount, 1)).toFixed(1)}/dia
                  </p>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.total}</div>
                <p className="text-xs text-muted-foreground">
                  {(totals.total / Math.max(daysCount, 1)).toFixed(1)}/dia
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart - Activities by user */}
          {userStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Atividades por Vendedor</CardTitle>
                <CardDescription>
                  {dateRangeLabel} — {format(startDate, "dd 'de' MMMM", { locale: ptBR })} a {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(250, userStats.length * 50)}>
                  <BarChart data={userStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="name" className="text-xs" width={120} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Legend />
                    {ACTIVITY_CONFIG.map(({ type, label, barColor }) => (
                      <Bar key={type} dataKey={type} name={label} fill={barColor} stackId="a" radius={0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table with details */}
          {userStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Vendedor</th>
                        {ACTIVITY_CONFIG.map(({ label, icon: Icon, color }) => (
                          <th key={label} className="text-center py-2 px-3 font-medium">
                            <div className="flex items-center justify-center gap-1">
                              <Icon className={`h-3.5 w-3.5 ${color}`} />
                              <span className="hidden sm:inline">{label}</span>
                            </div>
                          </th>
                        ))}
                        <th className="text-center py-2 px-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userStats.map((user, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2.5 px-3 font-medium">{user.name}</td>
                          {ACTIVITY_CONFIG.map(({ type }) => (
                            <td key={type} className="text-center py-2.5 px-3">
                              {(user as any)[type] || 0}
                            </td>
                          ))}
                          <td className="text-center py-2.5 px-3 font-bold">{user.total}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-muted/30 font-bold">
                        <td className="py-2.5 px-3">Total</td>
                        {ACTIVITY_CONFIG.map(({ type }) => (
                          <td key={type} className="text-center py-2.5 px-3">
                            {(totals as any)[type]}
                          </td>
                        ))}
                        <td className="text-center py-2.5 px-3">{totals.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {userStats.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade registrada {dateRangeLabel}.</p>
                <p className="text-xs mt-1">As atividades são registradas pelos vendedores nos detalhes de cada lead.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
