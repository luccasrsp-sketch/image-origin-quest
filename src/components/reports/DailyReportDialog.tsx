import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Users, UserCheck, Calendar, Send, DollarSign, Trophy, Copy, Check } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompany } from '@/contexts/CompanyContext';
import { COMPANY_LABELS } from '@/types/crm';

type ReportPeriod = 'daily' | 'weekly';

interface ReportData {
  totalLeads: number;
  qualifiedLeads: number;
  topSDR: { name: string; count: number } | null;
  leadsByCloser: { name: string; count: number }[];
  meetingsCompleted: number;
  proposalsSent: number;
  sales: number;
}

interface DailyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyReportDialog({ open, onOpenChange }: DailyReportDialogProps) {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const { selectedCompany } = useCompany();
  const [report, setReport] = useState<ReportData>({
    totalLeads: 0,
    qualifiedLeads: 0,
    topSDR: null,
    leadsByCloser: [],
    meetingsCompleted: 0,
    proposalsSent: 0,
    sales: 0,
  });

  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [open, period, selectedCompany]);

  const getDateRange = () => {
    const today = new Date();
    
    if (period === 'daily') {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      // Weekly: Monday to Sunday
      const start = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
      start.setHours(0, 0, 0, 0);
      const end = endOfWeek(today, { weekStartsOn: 1 });
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    
    const { start, end } = getDateRange();
    const startOfPeriod = start.toISOString();
    const endOfPeriod = end.toISOString();

    try {
      // Total leads do período - filtrado por empresa
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company', selectedCompany)
        .gte('created_at', startOfPeriod)
        .lte('created_at', endOfPeriod);

      // Leads qualificados do período - buscar leads da empresa primeiro
      const { data: companyLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('company', selectedCompany);
      
      const companyLeadIds = companyLeads?.map(l => l.id) || [];
      
      const { data: qualifiedData } = await supabase
        .from('lead_activities')
        .select('lead_id, user_id')
        .eq('action', 'status_change')
        .eq('new_status', 'qualificado')
        .in('lead_id', companyLeadIds)
        .gte('created_at', startOfPeriod)
        .lte('created_at', endOfPeriod);

      // Buscar perfis para contar por SDR
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, user_id');

      // Contar qualificações por SDR
      const sdrCounts: Record<string, { name: string; count: number }> = {};
      qualifiedData?.forEach(activity => {
        const profile = profiles?.find(p => p.id === activity.user_id);
        if (profile) {
          if (!sdrCounts[profile.id]) {
            sdrCounts[profile.id] = { name: profile.full_name, count: 0 };
          }
          sdrCounts[profile.id].count++;
        }
      });

      const topSDR = Object.values(sdrCounts).sort((a, b) => b.count - a.count)[0] || null;

      // Leads por closer (todos os leads atribuídos) - filtrado por empresa
      const { data: leadsByCloserData } = await supabase
        .from('leads')
        .select('assigned_closer_id')
        .eq('company', selectedCompany)
        .not('assigned_closer_id', 'is', null);

      const closerCounts: Record<string, number> = {};
      leadsByCloserData?.forEach(lead => {
        if (lead.assigned_closer_id) {
          closerCounts[lead.assigned_closer_id] = (closerCounts[lead.assigned_closer_id] || 0) + 1;
        }
      });

      const leadsByCloser = Object.entries(closerCounts).map(([closerId, count]) => {
        const profile = profiles?.find(p => p.id === closerId);
        return { name: profile?.full_name || 'Desconhecido', count };
      }).sort((a, b) => b.count - a.count);

      // Reuniões realizadas no período
      const { count: meetingsCompleted } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_completed', true)
        .gte('start_time', startOfPeriod)
        .lte('start_time', endOfPeriod);

      // Propostas enviadas no período - filtrado por empresa
      const { data: proposalsData } = await supabase
        .from('lead_activities')
        .select('id')
        .eq('action', 'status_change')
        .eq('new_status', 'envio_proposta')
        .in('lead_id', companyLeadIds)
        .gte('created_at', startOfPeriod)
        .lte('created_at', endOfPeriod);

      // Vendas do período - filtrado por empresa
      const { count: sales } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company', selectedCompany)
        .eq('status', 'vendido')
        .gte('sale_confirmed_at', startOfPeriod)
        .lte('sale_confirmed_at', endOfPeriod);

      setReport({
        totalLeads: totalLeads || 0,
        qualifiedLeads: qualifiedData?.length || 0,
        topSDR,
        leadsByCloser,
        meetingsCompleted: meetingsCompleted || 0,
        proposalsSent: proposalsData?.length || 0,
        sales: sales || 0,
      });
    } catch (error) {
      console.error('Error fetching report:', error);
    }
    
    setLoading(false);
  };

  const generateTextReport = () => {
    const { start, end } = getDateRange();
    const periodLabel = period === 'daily' 
      ? format(new Date(), "dd/MM/yyyy", { locale: ptBR })
      : `${format(start, "dd/MM", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;
    
    const companyName = COMPANY_LABELS[selectedCompany];
    let text = `📊 RELATÓRIO ${period === 'daily' ? 'DIÁRIO' : 'SEMANAL'} - ${companyName}\n📅 ${periodLabel}\n\n`;
    text += `👥 Leads novos: ${report.totalLeads}\n`;
    text += `✅ Leads qualificados: ${report.qualifiedLeads}\n`;
    if (report.topSDR) {
      text += `🏆 SDR destaque: ${report.topSDR.name} (${report.topSDR.count} qualificações)\n`;
    }
    text += `\n📋 Leads por Closer:\n`;
    report.leadsByCloser.forEach(c => {
      text += `   • ${c.name}: ${c.count}\n`;
    });
    text += `\n📅 Reuniões realizadas: ${report.meetingsCompleted}\n`;
    text += `📨 Propostas enviadas: ${report.proposalsSent}\n`;
    text += `💰 Vendas: ${report.sales}\n`;
    return text;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateTextReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { start, end } = getDateRange();
  const periodLabel = period === 'daily' 
    ? format(new Date(), "dd 'de' MMMM", { locale: ptBR })
    : `${format(start, "dd/MM", { locale: ptBR })} a ${format(end, "dd/MM", { locale: ptBR })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório {period === 'daily' ? 'Diário' : 'Semanal'}
          </DialogTitle>
          <DialogDescription>
            {period === 'daily' ? `Resumo do dia ${periodLabel}` : `Semana de ${periodLabel}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Diário</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Leads */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Leads novos</span>
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                {report.totalLeads}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Leads qualificados</span>
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                {report.qualifiedLeads}
              </Badge>
            </div>

            {/* Top SDR */}
            {report.topSDR && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">SDR destaque</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{report.topSDR.name}</p>
                  <p className="text-xs text-muted-foreground">{report.topSDR.count} qualificações</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Leads por Closer */}
            {report.leadsByCloser.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Leads por Closer</p>
                {report.leadsByCloser.map((closer, index) => (
                  <div key={index} className="flex items-center justify-between text-sm pl-2">
                    <span>{closer.name}</span>
                    <Badge variant="outline">{closer.count}</Badge>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{report.meetingsCompleted}</p>
                <p className="text-xs text-muted-foreground">Reuniões</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Send className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{report.proposalsSent}</p>
                <p className="text-xs text-muted-foreground">Propostas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold text-green-600">{report.sales}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
            </div>

            {/* Copy button */}
            <Button 
              onClick={handleCopy} 
              variant="outline" 
              className="w-full gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar para WhatsApp
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
