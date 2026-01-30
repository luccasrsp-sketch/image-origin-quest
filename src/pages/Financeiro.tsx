import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFinancial } from '@/hooks/useFinancial';
import { useSyncSalesToFinancial } from '@/hooks/useSyncSalesToFinancial';
import { useCompany } from '@/contexts/CompanyContext';
import { DollarSign, TrendingUp, Calendar, CreditCard, CalendarDays, Filter, LineChartIcon, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, startOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, parseISO, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PAYMENT_METHOD_LABELS, 
  PAYMENT_METHOD_COLORS,
  INSTALLMENT_STATUS_LABELS 
} from '@/types/financial';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type FilterPeriod = '7days' | '30days' | 'month' | 'custom';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Financeiro() {
  const { cashEntries, sales, installments, loading, refetch } = useFinancial();
  const { syncSales, isSyncing } = useSyncSalesToFinancial();
  const { selectedCompany } = useCompany();

  const handleSyncSales = async () => {
    await syncSales();
    refetch();
  };
  
  // Filter state
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (filterPeriod) {
      case '7days':
        return { start: subDays(today, 7), end: today };
      case '30days':
        return { start: subDays(today, 30), end: today };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'custom':
        return { 
          start: customStartDate || startOfMonth(today), 
          end: customEndDate || today 
        };
      default:
        return { start: startOfMonth(today), end: today };
    }
  }, [filterPeriod, customStartDate, customEndDate]);

  // Filter entries based on date range
  const filteredCashEntries = useMemo(() => {
    return cashEntries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return (isAfter(entryDate, dateRange.start) || entryDate.getTime() === dateRange.start.getTime()) &&
             (isBefore(entryDate, dateRange.end) || entryDate.getTime() <= dateRange.end.getTime());
    });
  }, [cashEntries, dateRange]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = parseISO(s.created_at);
      return (isAfter(saleDate, dateRange.start) || saleDate.getTime() === dateRange.start.getTime()) &&
             (isBefore(saleDate, dateRange.end) || saleDate.getTime() <= dateRange.end.getTime());
    });
  }, [sales, dateRange]);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  // Calculate metrics based on filtered data
  const periodRevenue = filteredCashEntries.reduce((sum, e) => sum + Number(e.amount), 0);

  // Keep original metrics for today/week/month
  const todayRevenue = cashEntries
    .filter(e => isAfter(parseISO(e.entry_date), today) || parseISO(e.entry_date).getTime() === today.getTime())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const weekRevenue = cashEntries
    .filter(e => isAfter(parseISO(e.entry_date), weekStart) || parseISO(e.entry_date).getTime() >= weekStart.getTime())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const monthRevenue = cashEntries
    .filter(e => isAfter(parseISO(e.entry_date), monthStart) || parseISO(e.entry_date).getTime() >= monthStart.getTime())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Payment method breakdown based on filtered data
  const paymentMethodData = Object.entries(
    filteredCashEntries.reduce((acc, entry) => {
      acc[entry.payment_method] = (acc[entry.payment_method] || 0) + Number(entry.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([method, value]) => ({
    name: PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method,
    value,
    color: PAYMENT_METHOD_COLORS[method as keyof typeof PAYMENT_METHOD_COLORS] || '#6b7280',
  }));

  // Revenue evolution data for line chart
  const revenueEvolutionData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    let cumulativeTotal = 0;
    return days.map(day => {
      const dayRevenue = filteredCashEntries
        .filter(e => isSameDay(parseISO(e.entry_date), day))
        .reduce((sum, e) => sum + Number(e.amount), 0);
      
      cumulativeTotal += dayRevenue;
      
      return {
        date: format(day, 'dd/MM'),
        fullDate: format(day, 'dd/MM/yyyy'),
        daily: dayRevenue,
        cumulative: cumulativeTotal,
      };
    });
  }, [filteredCashEntries, dateRange]);

  // Recent transactions from filtered sales
  const recentSales = filteredSales.slice(0, 10);

  if (loading) {
    return (
      <AppLayout title="Financeiro">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="XFranchise Finances - Dashboard">
      <div className="space-y-6">
        {/* Period Filter */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>Período:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterPeriod === '7days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterPeriod('7days')}
                  >
                    Últimos 7 dias
                  </Button>
                  <Button
                    variant={filterPeriod === '30days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterPeriod('30days')}
                  >
                    Últimos 30 dias
                  </Button>
                  <Button
                    variant={filterPeriod === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterPeriod('month')}
                  >
                    Este mês
                  </Button>
                  <Button
                    variant={filterPeriod === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterPeriod('custom')}
                  >
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Personalizado
                  </Button>
                </div>
                
                {filterPeriod === 'custom' && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal">
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Início'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate}
                          onSelect={(date) => {
                            setCustomStartDate(date);
                            setStartDateOpen(false);
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">até</span>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal">
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Fim'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={customEndDate}
                          onSelect={(date) => {
                            setCustomEndDate(date);
                            setEndDateOpen(false);
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
              
              {/* Period summary */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  Exibindo dados de {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} até {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncSales}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar vendas do CRM'}
                  </Button>
                  <Badge variant="secondary" className="text-lg font-bold">
                    Total: {formatCurrency(periodRevenue)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Hoje
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(todayRevenue)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Semana
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {formatCurrency(weekRevenue)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Mês
                </CardTitle>
                <Calendar className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  {formatCurrency(monthRevenue)}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Revenue Evolution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5" />
                  Evolução da Receita
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueEvolutionData.length > 0 && revenueEvolutionData.some(d => d.daily > 0 || d.cumulative > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueEvolutionData}>
                      <defs>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCurrency(value).replace('R$', '').trim()}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrency(value), 
                          name === 'cumulative' ? 'Acumulado' : 'Diário'
                        ]}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorCumulative)"
                        name="Acumulado"
                      />
                      <Line
                        type="monotone"
                        dataKey="daily"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Diário"
                      />
                      <Legend 
                        formatter={(value) => value === 'cumulative' ? 'Acumulado' : 'Diário'}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma entrada registrada no período
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Receita por Método de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethodData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma entrada registrada
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Lançamentos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.length > 0 ? (
                      recentSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {sale.description}
                            {sale.lead && (
                              <span className="block text-xs text-muted-foreground">
                                {sale.lead.full_name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {PAYMENT_METHOD_LABELS[sale.payment_method]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(Number(sale.total_amount))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhuma venda registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
