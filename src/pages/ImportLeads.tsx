import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FunnelType, FUNNEL_LABELS, FUNNEL_COLORS } from '@/types/crm';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Download,
  ArrowRight,
  Users
} from 'lucide-react';

interface ParsedLead {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  monthly_revenue?: number;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  success: number;
  errors: number;
  duplicates: number;
  details: { email: string; status: 'success' | 'error' | 'duplicate'; message?: string }[];
}

export default function ImportLeadsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [funnelType, setFunnelType] = useState<FunnelType>('formatacao');
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseCSV = (text: string): ParsedLead[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detectar separador (vírgula ou ponto-e-vírgula)
    const separator = lines[0].includes(';') ? ';' : ',';
    
    const headers = lines[0].split(separator).map(h => 
      h.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9_]/g, '_')
    );
    
    // Mapeamento de colunas possíveis
    const findColumn = (possibleNames: string[]): number => {
      return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
    };

    const nameCol = findColumn(['nome', 'name', 'full_name', 'nome_completo']);
    const emailCol = findColumn(['email', 'e_mail']);
    const phoneCol = findColumn(['telefone', 'phone', 'celular', 'whatsapp', 'tel']);
    const companyCol = findColumn(['empresa', 'company', 'company_name', 'razao_social']);
    const revenueCol = findColumn(['faturamento', 'revenue', 'monthly_revenue']);
    const notesCol = findColumn(['observacao', 'notes', 'obs', 'anotacao']);

    const leads: ParsedLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const errors: string[] = [];
      const name = nameCol >= 0 ? values[nameCol] : '';
      const email = emailCol >= 0 ? values[emailCol] : '';
      const phone = phoneCol >= 0 ? values[phoneCol] : '';
      const company = companyCol >= 0 ? values[companyCol] : '';

      if (!name || name.length < 2) errors.push('Nome inválido');
      if (!email || !email.includes('@')) errors.push('E-mail inválido');
      if (!phone || phone.replace(/\D/g, '').length < 8) errors.push('Telefone inválido');
      if (!company || company.length < 2) errors.push('Empresa inválida');

      let revenue: number | undefined;
      if (revenueCol >= 0 && values[revenueCol]) {
        const revenueStr = values[revenueCol].replace(/[^\d,.-]/g, '').replace(',', '.');
        const parsed = parseFloat(revenueStr);
        if (!isNaN(parsed)) revenue = parsed;
      }

      leads.push({
        full_name: name,
        email: email,
        phone: phone,
        company_name: company,
        monthly_revenue: revenue,
        notes: notesCol >= 0 ? values[notesCol] : undefined,
        isValid: errors.length === 0,
        errors,
      });
    }

    return leads;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    const text = await file.text();
    const leads = parseCSV(text);
    
    if (leads.length === 0) {
      toast({
        title: 'Arquivo vazio',
        description: 'O arquivo CSV não contém leads válidos.',
        variant: 'destructive',
      });
      return;
    }

    setParsedLeads(leads);
    setStep('preview');
  };

  const handleImport = async () => {
    const validLeads = parsedLeads.filter(l => l.isValid);
    if (validLeads.length === 0) {
      toast({
        title: 'Nenhum lead válido',
        description: 'Corrija os erros antes de importar.',
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    setImportProgress(0);

    const result: ImportResult = {
      success: 0,
      errors: 0,
      duplicates: 0,
      details: [],
    };

    for (let i = 0; i < validLeads.length; i++) {
      const lead = validLeads[i];

      // Verificar duplicidade
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('email', lead.email)
        .maybeSingle();

      if (existing) {
        result.duplicates++;
        result.details.push({ email: lead.email, status: 'duplicate', message: 'Lead já existe' });
      } else {
        const { error } = await supabase.from('leads').insert({
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          company_name: lead.company_name,
          monthly_revenue: lead.monthly_revenue,
          funnel_type: funnelType,
          status: 'sem_atendimento',
          notes: lead.notes ? `Importado: ${lead.notes}` : 'Lead importado via CSV',
        });

        if (error) {
          result.errors++;
          result.details.push({ email: lead.email, status: 'error', message: error.message });
        } else {
          result.success++;
          result.details.push({ email: lead.email, status: 'success' });
        }
      }

      setImportProgress(Math.round(((i + 1) / validLeads.length) * 100));
    }

    setImportResult(result);
    setStep('complete');
  };

  const resetImport = () => {
    setStep('upload');
    setSelectedFile(null);
    setParsedLeads([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'Nome,Email,Telefone,Empresa,Faturamento,Observação\nJoão Silva,joao@empresa.com,(11) 99999-9999,Empresa ABC,50000,Lead qualificado\nMaria Santos,maria@empresa.com,(21) 98888-8888,Empresa XYZ,100000,Interessado em franquia';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_leads.csv';
    link.click();
  };

  const validCount = parsedLeads.filter(l => l.isValid).length;
  const invalidCount = parsedLeads.filter(l => !l.isValid).length;

  return (
    <AppLayout title="Importar Leads">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Importação de Leads via CSV</h2>
            <p className="text-sm text-muted-foreground">
              Importe leads de outros sistemas para o CRM
            </p>
          </div>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Selecionar Arquivo CSV
              </CardTitle>
              <CardDescription>
                O arquivo deve conter colunas para Nome, E-mail, Telefone e Empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Clique para selecionar o arquivo</p>
                    <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
                  </div>
                  <Badge variant="outline">Formato: CSV</Badge>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Precisa de um modelo?</span>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  Baixar Modelo CSV
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Colunas suportadas</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    <li><strong>Nome</strong> (obrigatório): nome, name, full_name, nome_completo</li>
                    <li><strong>E-mail</strong> (obrigatório): email, e_mail</li>
                    <li><strong>Telefone</strong> (obrigatório): telefone, phone, celular, whatsapp</li>
                    <li><strong>Empresa</strong> (obrigatório): empresa, company, razao_social</li>
                    <li><strong>Faturamento</strong> (opcional): faturamento, revenue</li>
                    <li><strong>Observação</strong> (opcional): observacao, notes, obs</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Prévia da Importação</CardTitle>
                    <CardDescription>
                      Revise os leads antes de importar
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={resetImport}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold">{parsedLeads.length}</p>
                    <p className="text-sm text-muted-foreground">Total de linhas</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10 text-center">
                    <p className="text-2xl font-bold text-success">{validCount}</p>
                    <p className="text-sm text-muted-foreground">Válidos</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 text-center">
                    <p className="text-2xl font-bold text-destructive">{invalidCount}</p>
                    <p className="text-sm text-muted-foreground">Com erros</p>
                  </div>
                </div>

                {/* Funnel Type Selection */}
                <div className="p-4 rounded-lg border space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Qual tag aplicar a estes leads?
                  </Label>
                  <Select value={funnelType} onValueChange={(v) => setFunnelType(v as FunnelType)}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formatacao">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={FUNNEL_COLORS.formatacao}>Formatação</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="franquia">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={FUNNEL_COLORS.franquia}>Franquia</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="padrao">
                        <div className="flex items-center gap-2">
                          <span>Padrão (sem tag)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-80 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Status</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Empresa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedLeads.slice(0, 50).map((lead, idx) => (
                          <TableRow key={idx} className={!lead.isValid ? 'bg-destructive/5' : ''}>
                            <TableCell>
                              {lead.isValid ? (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              ) : (
                                <span title={lead.errors.join(', ')}>
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{lead.full_name || '-'}</TableCell>
                            <TableCell>{lead.email || '-'}</TableCell>
                            <TableCell>{lead.phone || '-'}</TableCell>
                            <TableCell>{lead.company_name || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {parsedLeads.length > 50 && (
                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                      Mostrando 50 de {parsedLeads.length} leads
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={resetImport} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleImport} 
                    disabled={validCount === 0}
                    className="flex-1"
                  >
                    Importar {validCount} leads
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Importando leads...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Por favor, aguarde enquanto os leads são criados
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-center text-sm text-muted-foreground">{importProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === 'complete' && importResult && (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-6">
                <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Importação Concluída!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Veja o resumo abaixo
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                  <div className="p-4 rounded-lg bg-success/10 text-center">
                    <p className="text-2xl font-bold text-success">{importResult.success}</p>
                    <p className="text-sm text-muted-foreground">Importados</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 text-center">
                    <p className="text-2xl font-bold text-warning">{importResult.duplicates}</p>
                    <p className="text-sm text-muted-foreground">Duplicados</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 text-center">
                    <p className="text-2xl font-bold text-destructive">{importResult.errors}</p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </div>
                </div>

                {funnelType !== 'padrao' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Tag aplicada:</span>
                    <Badge variant="outline" className={FUNNEL_COLORS[funnelType]}>
                      {FUNNEL_LABELS[funnelType]}
                    </Badge>
                  </div>
                )}

                <div className="flex gap-3 w-full max-w-md">
                  <Button variant="outline" onClick={resetImport} className="flex-1">
                    Importar Mais
                  </Button>
                  <Button onClick={() => window.location.href = '/kanban'} className="flex-1">
                    Ver no Kanban
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
