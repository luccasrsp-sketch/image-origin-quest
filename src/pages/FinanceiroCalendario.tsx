import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  getDay,
  setMonth,
  setYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancial } from '@/hooks/useFinancial';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface DayData {
  date: Date;
  received: number;
  projected: number;
}

export default function FinanceiroCalendario() {
  const { cashEntries, installments, loading } = useFinancial();
  const [baseDate, setBaseDate] = useState(new Date());

  // Calculate two months for bimonthly view
  const month1Start = startOfMonth(baseDate);
  const month2Start = startOfMonth(addMonths(baseDate, 1));

  // Get days for both months
  const getDaysForMonth = (monthStart: Date): DayData[] => {
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Received (cash entries)
      const received = cashEntries
        .filter(e => e.entry_date === dateStr)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      // Projected (pending installments)
      const projected = installments
        .filter(i => i.due_date === dateStr && i.status === 'pending')
        .reduce((sum, i) => sum + Number(i.amount), 0);

      return { date, received, projected };
    });
  };

  const month1Days = useMemo(() => getDaysForMonth(month1Start), [month1Start, cashEntries, installments]);
  const month2Days = useMemo(() => getDaysForMonth(month2Start), [month2Start, cashEntries, installments]);

  // Calculate bimonthly totals
  const bimonthlyReceived = [...month1Days, ...month2Days].reduce((sum, d) => sum + d.received, 0);
  const bimonthlyProjected = [...month1Days, ...month2Days].reduce((sum, d) => sum + d.projected, 0);

  const navigateBimester = (direction: 'prev' | 'next') => {
    setBaseDate(current => 
      direction === 'next' 
        ? addMonths(current, 2) 
        : subMonths(current, 2)
    );
  };

  const MonthGrid = ({ days, monthStart }: { days: DayData[], monthStart: Date }) => {
    const firstDayOfMonth = getDay(monthStart);
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday = 0

    return (
      <div className="space-y-2">
        {/* Month Header */}
        <h3 className="text-lg font-semibold text-center capitalize">
          {format(monthStart, 'MMMM yyyy', { locale: ptBR })}
        </h3>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16" />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const isToday = isSameDay(day.date, new Date());
            const hasReceived = day.received > 0;
            const hasProjected = day.projected > 0;

            return (
              <div
                key={day.date.toISOString()}
                className={cn(
                  "h-16 p-1 rounded-md border text-xs transition-colors",
                  isToday && "ring-2 ring-primary",
                  "hover:bg-muted/50"
                )}
              >
                <div className="font-medium text-muted-foreground">
                  {format(day.date, 'd')}
                </div>
                <div className="space-y-0.5 mt-1">
                  {hasReceived && (
                    <div className="text-[10px] text-emerald-500 font-medium truncate">
                      +{formatCurrency(day.received)}
                    </div>
                  )}
                  {hasProjected && (
                    <div className="text-[10px] text-blue-500 font-medium truncate">
                      {formatCurrency(day.projected)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Year navigation grid (12 months)
  const currentYear = baseDate.getFullYear();
  const yearMonths = Array.from({ length: 12 }, (_, i) => setMonth(setYear(new Date(), currentYear), i));

  if (loading) {
    return (
      <AppLayout title="Calendário Financeiro">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="XFranchise Finances - Calendário">
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateBimester('prev')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Bimestre Anterior
          </Button>

          <h2 className="text-lg font-semibold">
            {format(month1Start, 'MMMM', { locale: ptBR })} - {format(month2Start, 'MMMM yyyy', { locale: ptBR })}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateBimester('next')}
          >
            Próximo Bimestre
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Bimonthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Recebido no Bimestre</div>
              <div className="text-2xl font-bold text-emerald-500">
                {formatCurrency(bimonthlyReceived)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Provisionado no Bimestre</div>
              <div className="text-2xl font-bold text-blue-500">
                {formatCurrency(bimonthlyProjected)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-muted-foreground">Valor Recebido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-muted-foreground">Valor Provisionado</span>
          </div>
        </div>

        {/* Bimonthly Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <Card>
            <CardContent className="pt-6">
              <MonthGrid days={month1Days} monthStart={month1Start} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <MonthGrid days={month2Days} monthStart={month2Start} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Year Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-4 w-4" />
              Navegação Rápida - {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {yearMonths.map((month, i) => {
                const isCurrentBimester = 
                  isSameMonth(month, month1Start) || isSameMonth(month, month2Start);
                
                return (
                  <Button
                    key={i}
                    variant={isCurrentBimester ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setBaseDate(month)}
                  >
                    {format(month, 'MMM', { locale: ptBR })}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
