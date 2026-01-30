import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, ArrowLeft } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFinancial } from '@/hooks/useFinancial';
import { formatCurrencyInput, parseCurrency } from '@/utils/currency';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/financial';
import { motion } from 'framer-motion';

export default function FinanceiroNovaVenda() {
  const navigate = useNavigate();
  const { createSale } = useFinancial();
  
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate installment preview
  const totalValue = parseCurrency(totalAmount);
  const numInstallments = parseInt(installmentsCount) || 1;
  const installmentValue = totalValue / numInstallments;

  const installmentPreview = Array.from({ length: Math.min(numInstallments, 12) }, (_, i) => ({
    number: i + 1,
    dueDate: firstDueDate ? addMonths(firstDueDate, i) : addMonths(new Date(), i),
    amount: installmentValue,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !totalAmount || !paymentMethod || !installmentsCount) {
      return;
    }

    setIsSubmitting(true);
    
    const result = await createSale({
      description,
      totalAmount: totalValue,
      paymentMethod: paymentMethod as PaymentMethod,
      installmentsCount: numInstallments,
      firstDueDate,
    });

    setIsSubmitting(false);

    if (result) {
      navigate('/financeiro');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AppLayout title="Nova Venda">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/financeiro')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Registrar Nova Venda
              </CardTitle>
              <CardDescription>
                Preencha os dados da venda para gerar as parcelas automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Description */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva a venda (produto, serviço, cliente...)"
                      rows={2}
                      required
                    />
                  </div>

                  {/* Total Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Valor Total *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id="totalAmount"
                        type="text"
                        inputMode="numeric"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(formatCurrencyInput(e.target.value))}
                        placeholder="0,00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Installments Count */}
                  <div className="space-y-2">
                    <Label htmlFor="installments">Quantidade de Parcelas *</Label>
                    <Input
                      id="installments"
                      type="number"
                      min="1"
                      max="60"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      required
                    />
                  </div>

                  {/* First Due Date */}
                  <div className="space-y-2">
                    <Label>Data da Primeira Parcela</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !firstDueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {firstDueDate ? (
                            format(firstDueDate, "PPP", { locale: ptBR })
                          ) : (
                            "Selecione a data"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={firstDueDate}
                          onSelect={setFirstDueDate}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Installment Preview */}
                {totalValue > 0 && numInstallments > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border rounded-lg p-4 bg-muted/50"
                  >
                    <h4 className="font-medium mb-3">Prévia das Parcelas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {installmentPreview.map((inst) => (
                        <div 
                          key={inst.number}
                          className="p-2 bg-background rounded border"
                        >
                          <div className="text-muted-foreground">
                            Parcela {inst.number}/{numInstallments}
                          </div>
                          <div className="font-mono font-medium">
                            {formatCurrency(inst.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(inst.dueDate, 'dd/MM/yyyy')}
                          </div>
                        </div>
                      ))}
                      {numInstallments > 12 && (
                        <div className="p-2 bg-background rounded border flex items-center justify-center">
                          <span className="text-muted-foreground">
                            +{numInstallments - 12} parcelas...
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/financeiro')}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !description || !totalAmount || !paymentMethod}
                  >
                    {isSubmitting ? 'Salvando...' : 'Registrar Venda'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
