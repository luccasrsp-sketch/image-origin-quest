import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/crm';
import { CalendarEvent } from '@/types/crm';
import { subDays, isAfter } from 'date-fns';
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
  Globe,
  Users,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface OriginReportProps {
  leads: Lead[];
  events: CalendarEvent[];
}

type UtmDimension = 'utm_source' | 'utm_medium' | 'utm_campaign';
type PeriodFilter = 'today' | 7 | 30 | 60 | 90;

const DIMENSION_OPTIONS: { value: UtmDimension; label: string }[] = [
  { value: 'utm_source', label: 'Fonte' },
  { value: 'utm_medium', label: 'Mídia' },
  { value: 'utm_campaign', label: 'Campanha' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 7, label: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 60, label: 'Últimos 60 dias' },
  { value: 90, label: 'Últimos 90 dias' },
];

export function OriginReport({ leads, events }: OriginReportProps) {
  const [dimension, setDimension] = useState<UtmDimension>('utm_source');
  const [period, setPeriod] = useState<PeriodFilter>(30);

  const filteredLeads = useMemo(() => {
    if (period === 'today') {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return leads.filter(lead => {
        const leadDate = new Date(lead.created_at);
        return leadDate >= startOfToday;
      });
    }
    const cutoffDate = subDays(new Date(), period as number);
    return leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return isAfter(leadDate, cutoffDate);
    });
  }, [leads, period]);

  const originData = useMemo(() => {
    const grouped: Record<string, {
      name: string;
      leads: number;
      atendimentos: number;
      qualificados: number;
      reunioes: number;
      vendas: number;
      perdidos: number;
      leadIds: string[];
    }> = {};

    filteredLeads.forEach(lead => {
      const origin = lead[dimension] || 'Direto / Sem UTM';

      if (!grouped[origin]) {
        grouped[origin] = { name: origin, leads: 0, atendimentos: 0, qualificados: 0, reunioes: 0, vendas: 0, perdidos: 0, leadIds: [] };
      }

      grouped[origin].leads++;
      grouped[origin].leadIds.push(lead.id);

      if (lead.status !== 'sem_atendimento') {
        grouped[origin].atendimentos++;
      }

      const qualificadoStatuses = ['qualificado', 'follow_up', 'reuniao_marcada', 'envio_proposta', 'vendido'];
      if (qualificadoStatuses.includes(lead.status)) {
        grouped[origin].qualificados++;
      }

      const reuniaoStatuses = ['reuniao_marcada', 'envio_proposta', 'vendido'];
      if (reuniaoStatuses.includes(lead.status)) {
        grouped[origin].reunioes++;
      }

      if (lead.status === 'vendido') {
        grouped[origin].vendas++;
      }

      if (lead.status === 'perdido') {
        grouped[origin].perdidos++;
      }
    });

    return Object.values(grouped).sort((a, b) => b.leads - a.leads);
  }, [filteredLeads, dimension]);

  const totals = useMemo(() => {
    return originData.reduce(
      (acc, row) => ({
        leads: acc.leads + row.leads,
        atendimentos: acc.atendimentos + row.atendimentos,
        qualificados: acc.qualificados + row.qualificados,
        reunioes: acc.reunioes + row.reunioes,
        vendas: acc.vendas + row.vendas,
        perdidos: acc.perdidos + row.perdidos,
      }),
      { leads: 0, atendimentos: 0, qualificados: 0, reunioes: 0, vendas: 0, perdidos: 0 }
    );
  }, [originData]);

  const conversionRate = (from: number, to: number) =>
    from > 0 ? ((to / from) * 100).toFixed(1) + '%' : '—';

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Relatório por Origem</h2>
            <Badge variant="secondary">{originData.length} origens</Badge>
          </div>
          <div className="flex gap-1.5">
            {DIMENSION_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={dimension === opt.value ? 'default' : 'outline'}
                size="sm"
                className={`text-xs h-7 px-2.5 ${dimension === opt.value ? 'text-primary-foreground' : 'text-foreground'}`}
                onClick={() => setDimension(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          <div className="flex gap-1.5">
            {PERIOD_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={period === opt.value ? 'default' : 'outline'}
                size="sm"
                className={`text-xs h-7 px-2.5 ${period === opt.value ? 'text-primary-foreground' : 'text-foreground'}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.leads}</div>
            <p className="text-xs text-muted-foreground">{originData.length} origens</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.atendimentos}</div>
            <p className="text-xs text-muted-foreground">{conversionRate(totals.leads, totals.atendimentos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.qualificados}</div>
            <p className="text-xs text-muted-foreground">{conversionRate(totals.atendimentos, totals.qualificados)} dos atendidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.reunioes}</div>
            <p className="text-xs text-muted-foreground">{conversionRate(totals.qualificados, totals.reunioes)} dos qualificados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.vendas}</div>
            <p className="text-xs text-muted-foreground">{conversionRate(totals.leads, totals.vendas)} conv. geral</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perdidos</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.perdidos}</div>
            <p className="text-xs text-muted-foreground">{conversionRate(totals.leads, totals.perdidos)} do total</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {originData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Funil por Origem</CardTitle>
            <CardDescription>
              Leads → Atendimentos → Qualificados → Reuniões → Vendas | Perdidos por {DIMENSION_OPTIONS.find(d => d.value === dimension)?.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(250, originData.length * 45)}>
              <BarChart data={originData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={150} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--muted-foreground))" radius={0} />
                <Bar dataKey="atendimentos" name="Atendimentos" fill="hsl(199, 89%, 48%)" radius={0} />
                <Bar dataKey="qualificados" name="Qualificados" fill="hsl(45, 93%, 47%)" radius={0} />
                <Bar dataKey="reunioes" name="Reuniões" fill="hsl(263, 70%, 50%)" radius={0} />
                <Bar dataKey="vendas" name="Vendas" fill="hsl(142, 76%, 36%)" radius={0} />
                <Bar dataKey="perdidos" name="Perdidos" fill="hsl(var(--destructive))" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {originData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Origem</th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Leads</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Atend.</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Qualif.</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Reuniões</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Vendas</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span className="hidden sm:inline">Perdidos</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-3 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Conv. %</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {originData.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 px-3 font-medium max-w-[200px] truncate">{row.name}</td>
                      <td className="text-center py-2.5 px-3">{row.leads}</td>
                      <td className="text-center py-2.5 px-3">
                        {row.atendimentos}
                        <span className="text-xs text-muted-foreground ml-1">({conversionRate(row.leads, row.atendimentos)})</span>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {row.qualificados}
                        <span className="text-xs text-muted-foreground ml-1">({conversionRate(row.atendimentos, row.qualificados)})</span>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {row.reunioes}
                        <span className="text-xs text-muted-foreground ml-1">({conversionRate(row.qualificados, row.reunioes)})</span>
                      </td>
                      <td className="text-center py-2.5 px-3">{row.vendas}</td>
                      <td className="text-center py-2.5 px-3 text-destructive">{row.perdidos}</td>
                      <td className="text-center py-2.5 px-3 font-bold">{conversionRate(row.leads, row.vendas)}</td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-2.5 px-3">Total</td>
                    <td className="text-center py-2.5 px-3">{totals.leads}</td>
                    <td className="text-center py-2.5 px-3">
                      {totals.atendimentos}
                      <span className="text-xs text-muted-foreground ml-1 font-normal">({conversionRate(totals.leads, totals.atendimentos)})</span>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {totals.qualificados}
                      <span className="text-xs text-muted-foreground ml-1 font-normal">({conversionRate(totals.atendimentos, totals.qualificados)})</span>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {totals.reunioes}
                      <span className="text-xs text-muted-foreground ml-1 font-normal">({conversionRate(totals.qualificados, totals.reunioes)})</span>
                    </td>
                    <td className="text-center py-2.5 px-3">{totals.vendas}</td>
                    <td className="text-center py-2.5 px-3 text-destructive">{totals.perdidos}</td>
                    <td className="text-center py-2.5 px-3">{conversionRate(totals.leads, totals.vendas)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {originData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Nenhum lead encontrado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
