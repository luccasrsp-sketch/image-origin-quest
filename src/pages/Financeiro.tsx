import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancial } from '@/hooks/useFinancial';
import { useCompany } from '@/contexts/CompanyContext';
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  PAYMENT_METHOD_LABELS, 
  PAYMENT_METHOD_COLORS,
  INSTALLMENT_STATUS_LABELS 
} from '@/types/financial';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function Financeiro() {
  const { cashEntries, sales, installments, loading } = useFinancial();
  const { selectedCompany } = useCompany();

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  // Calculate metrics
  const todayRevenue = cashEntries
    .filter(e => isAfter(parseISO(e.entry_date), today) || parseISO(e.entry_date).getTime() === today.getTime())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const weekRevenue = cashEntries
    .filter(e => isAfter(parseISO(e.entry_date), weekStart) || parseISO(e.entry_date).getTime() >= weekStart.getTime())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const monthRevenue = cashEntries
    .filter(e => isAfter(parseISO(e.entry_date), monthStart) || parseISO(e.entry_date).getTime() >= monthStart.getTime())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Payment method breakdown
  const paymentMethodData = Object.entries(
    cashEntries.reduce((acc, entry) => {
      acc[entry.payment_method] = (acc[entry.payment_method] || 0) + Number(entry.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([method, value]) => ({
    name: PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method,
    value,
    color: PAYMENT_METHOD_COLORS[method as keyof typeof PAYMENT_METHOD_COLORS] || '#6b7280',
  }));

  // Recent transactions
  const recentSales = sales.slice(0, 10);

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
