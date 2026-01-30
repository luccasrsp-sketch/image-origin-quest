import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancial } from '@/hooks/useFinancial';
import { TrendingUp, CalendarDays, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { INSTALLMENT_STATUS_LABELS } from '@/types/financial';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function FinanceiroProjecoes() {
  const { installments, loading } = useFinancial();

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  // Pending installments (for projections)
  const pendingInstallments = installments.filter(i => i.status === 'pending');

  // Current month projection
  const currentMonthProjection = pendingInstallments
    .filter(i => {
      const dueDate = parseISO(i.due_date);
      return isWithinInterval(dueDate, { start: currentMonthStart, end: currentMonthEnd });
    })
    .reduce((sum, i) => sum + Number(i.amount), 0);

  // Next 3 months projection
  const next3MonthsStart = addMonths(currentMonthStart, 1);
  const next3MonthsEnd = endOfMonth(addMonths(currentMonthStart, 3));
  const next3MonthsProjection = pendingInstallments
    .filter(i => {
      const dueDate = parseISO(i.due_date);
      return isWithinInterval(dueDate, { start: next3MonthsStart, end: next3MonthsEnd });
    })
    .reduce((sum, i) => sum + Number(i.amount), 0);

  // Monthly projection data for chart
  const monthlyProjectionData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(addMonths(now, i));
    const monthEnd = endOfMonth(addMonths(now, i));
    
    const amount = pendingInstallments
      .filter(inst => {
        const dueDate = parseISO(inst.due_date);
        return isWithinInterval(dueDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, inst) => sum + Number(inst.amount), 0);

    return {
      month: format(monthStart, 'MMM/yy', { locale: ptBR }),
      value: amount,
      isCurrent: i === 0,
    };
  });

  // Upcoming installments list
  const upcomingInstallments = pendingInstallments
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 15);

  if (loading) {
    return (
      <AppLayout title="Projeções">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="XFranchise Finances - Projeções">
      <div className="space-y-6">
        {/* Projection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projeção do Mês
                </CardTitle>
                <Target className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {formatCurrency(currentMonthProjection)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Parcelas pendentes para {format(now, 'MMMM', { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Próximos 3 Meses
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-500">
                  {formatCurrency(next3MonthsProjection)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(next3MonthsStart, 'MMM', { locale: ptBR })} - {format(next3MonthsEnd, 'MMM/yy', { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Monthly Projection Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Projeção Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyProjectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {monthlyProjectionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                        opacity={entry.isCurrent ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Installments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Parcelas a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingInstallments.length > 0 ? (
                    upcomingInstallments.map((inst) => {
                      const dueDate = parseISO(inst.due_date);
                      const isOverdue = dueDate < now && inst.status === 'pending';
                      
                      return (
                        <TableRow key={inst.id}>
                          <TableCell className={isOverdue ? 'text-destructive' : ''}>
                            {format(dueDate, 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            Parcela {inst.installment_number}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={isOverdue ? 'destructive' : 'secondary'}
                            >
                              {isOverdue ? 'Atrasado' : INSTALLMENT_STATUS_LABELS[inst.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(Number(inst.amount))}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhuma parcela pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
