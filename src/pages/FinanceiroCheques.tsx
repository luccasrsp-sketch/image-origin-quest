import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  PlusCircle, 
  CalendarIcon, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle,
  Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFinancial } from '@/hooks/useFinancial';
import { formatCurrencyInput, parseCurrency } from '@/utils/currency';
import { CHECK_STATUS_LABELS, type CheckStatus } from '@/types/financial';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function FinanceiroCheques() {
  const { checks, createCheck, updateCheckStatus, loading } = useFinancial();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CheckStatus | 'all'>('all');
  
  // Form state
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [expectedDate, setExpectedDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAmount('');
    setBank('');
    setCheckNumber('');
    setIssuer('');
    setExpectedDate(new Date());
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !bank || !checkNumber || !issuer || !expectedDate) {
      return;
    }

    setIsSubmitting(true);
    
    const result = await createCheck({
      amount: parseCurrency(amount),
      bank,
      checkNumber,
      issuer,
      expectedClearDate: expectedDate,
      notes: notes || undefined,
    });

    setIsSubmitting(false);

    if (result) {
      resetForm();
      setIsDialogOpen(false);
    }
  };

  const filteredChecks = activeTab === 'all' 
    ? checks 
    : checks.filter(c => c.status === activeTab);

  const getStatusBadge = (status: CheckStatus) => {
    const variants: Record<CheckStatus, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      cleared: 'default',
      bounced: 'destructive',
    };
    
    const icons: Record<CheckStatus, React.ReactNode> = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      cleared: <CheckCircle className="h-3 w-3 mr-1" />,
      bounced: <XCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status]} className="flex items-center w-fit">
        {icons[status]}
        {CHECK_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const pendingCount = checks.filter(c => c.status === 'pending').length;
  const clearedCount = checks.filter(c => c.status === 'cleared').length;
  const bouncedCount = checks.filter(c => c.status === 'bounced').length;

  if (loading) {
    return (
      <AppLayout title="Cheques">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="XFranchise Finances - Cheques">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Gestão de Cheques</h2>
            <p className="text-sm text-muted-foreground">
              Controle de cheques a compensar
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Novo Cheque
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Cheque</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id="amount"
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                        placeholder="0,00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bank">Banco *</Label>
                    <Input
                      id="bank"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      placeholder="Ex: Bradesco"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkNumber">Número do Cheque *</Label>
                    <Input
                      id="checkNumber"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      placeholder="000000"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="issuer">Emitente *</Label>
                    <Input
                      id="issuer"
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      placeholder="Nome do emitente"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Prevista de Compensação *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expectedDate ? (
                          format(expectedDate, "PPP", { locale: ptBR })
                        ) : (
                          "Selecione a data"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expectedDate}
                        onSelect={setExpectedDate}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações opcionais"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CheckStatus | 'all')}>
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="all">
                    Todos ({checks.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    A Compensar ({pendingCount})
                  </TabsTrigger>
                  <TabsTrigger value="cleared">
                    Compensados ({clearedCount})
                  </TabsTrigger>
                  <TabsTrigger value="bounced">
                    Devolvidos ({bouncedCount})
                  </TabsTrigger>
                </TabsList>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emitente</TableHead>
                      <TableHead>Banco / Nº</TableHead>
                      <TableHead>Data Prevista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChecks.length > 0 ? (
                      filteredChecks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-medium">
                            {check.issuer}
                            {check.notes && (
                              <span className="block text-xs text-muted-foreground">
                                {check.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {check.bank}
                            <span className="block text-xs text-muted-foreground">
                              Nº {check.check_number}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(check.expected_clear_date), 'dd/MM/yyyy')}
                            {check.actual_clear_date && (
                              <span className="block text-xs text-muted-foreground">
                                Comp: {format(parseISO(check.actual_clear_date), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(check.status)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(Number(check.amount))}
                          </TableCell>
                          <TableCell>
                            {check.status === 'pending' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => updateCheckStatus(check.id, 'cleared')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                    Marcar como Compensado
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateCheckStatus(check.id, 'bounced')}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Marcar como Devolvido
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum cheque encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
