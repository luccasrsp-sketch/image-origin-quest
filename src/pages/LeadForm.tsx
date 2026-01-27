import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { FunnelType } from '@/types/crm';
import { CheckCircle, ArrowRight, Building, User, Phone, Mail, DollarSign } from 'lucide-react';

const leadSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido').max(255),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  company_name: z.string().min(2, 'Nome da empresa é obrigatório').max(100),
  monthly_revenue: z.string().optional(),
  funnel_type: z.enum(['padrao', 'franquia']),
});

export default function LeadFormPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    monthly_revenue: '',
    funnel_type: 'padrao' as FunnelType,
  });

  // Capture UTM parameters from URL
  const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const utmParams = getUTMParams();
    const monthlyRevenue = formData.monthly_revenue 
      ? parseFloat(formData.monthly_revenue.replace(/[^\d,]/g, '').replace(',', '.'))
      : null;

    const { error } = await supabase.from('leads').insert({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      company_name: formData.company_name,
      monthly_revenue: monthlyRevenue,
      funnel_type: formData.funnel_type,
      status: 'sem_atendimento',
      ...utmParams,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar seus dados. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitted(true);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Cadastro Realizado!</h2>
            <p className="text-muted-foreground mb-6">
              Recebemos seus dados com sucesso. Nossa equipe entrará em contato em breve.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">C</span>
          </div>
          <CardTitle className="text-2xl">Fale com um Especialista</CardTitle>
          <p className="text-muted-foreground mt-2">
            Preencha seus dados e nossa equipe entrará em contato
          </p>
        </CardHeader>

        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge variant={step >= 1 ? 'default' : 'secondary'}>1</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={step >= 2 ? 'default' : 'secondary'}>2</Badge>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome Completo *
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Seu nome completo"
                    value={formData.full_name}
                    onChange={e => setFormData(d => ({ ...d, full_name: e.target.value }))}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={e => setFormData(d => ({ ...d, phone: formatPhone(e.target.value) }))}
                    maxLength={15}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <Button 
                  type="button" 
                  className="w-full"
                  onClick={() => {
                    const partialResult = z.object({
                      full_name: z.string().min(2),
                      email: z.string().email(),
                      phone: z.string().min(10),
                    }).safeParse(formData);

                    if (!partialResult.success) {
                      const fieldErrors: Record<string, string> = {};
                      partialResult.error.errors.forEach(err => {
                        if (err.path[0]) {
                          fieldErrors[err.path[0] as string] = err.message;
                        }
                      });
                      setErrors(fieldErrors);
                      return;
                    }
                    setErrors({});
                    setStep(2);
                  }}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Nome da Empresa *
                  </Label>
                  <Input
                    id="company_name"
                    placeholder="Nome da sua empresa"
                    value={formData.company_name}
                    onChange={e => setFormData(d => ({ ...d, company_name: e.target.value }))}
                  />
                  {errors.company_name && (
                    <p className="text-sm text-destructive">{errors.company_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_revenue" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Faturamento Mensal (opcional)
                  </Label>
                  <Input
                    id="monthly_revenue"
                    placeholder="R$ 50.000,00"
                    value={formData.monthly_revenue}
                    onChange={e => setFormData(d => ({ ...d, monthly_revenue: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funnel_type">Tipo de Interesse</Label>
                  <Select 
                    value={formData.funnel_type}
                    onValueChange={v => setFormData(d => ({ ...d, funnel_type: v as FunnelType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Consultoria/Serviço</SelectItem>
                      <SelectItem value="franquia">Franquia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Cadastro'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}