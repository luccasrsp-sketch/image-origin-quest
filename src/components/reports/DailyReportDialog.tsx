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
import { supabase } from '@/integrations/supabase/client';
import { FileText, Users, UserCheck, Calendar, Send, DollarSign, Trophy, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  }, [open]);

  const fetchReportData = async () => {
    setLoading(true);
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    try {
      // Total leads do dia
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      // Leads qualificados do dia
      const { data: qualifiedData } = await supabase
        .from('lead_activities')
        .select('lead_id, user_id')
        .eq('action', 'status_change')
        .eq('new_status', 'qualificado')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

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

      // Leads por closer (todos os leads atribuídos)
      const { data: leadsByCloserData } = await supabase
        .from('leads')
        .select('assigned_closer_id')
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

      // Reuniões realizadas hoje
      const { count: meetingsCompleted } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_completed', true)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

      // Propostas enviadas hoje
      const { data: proposalsData } = await supabase
        .from('lead_activities')
        .select('id')
        .eq('action', 'status_change')
        .eq('new_status', 'envio_proposta')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      // Vendas do dia
      const { count: sales } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'vendido')
        .gte('sale_confirmed_at', startOfDay)
        .lte('sale_confirmed_at', endOfDay);

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
    const today = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    let text = `📊 RELATÓRIO DIÁRIO - ${today}\n\n`;
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

  const today = format(new Date(), "dd 'de' MMMM", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório Diário
          </DialogTitle>
          <DialogDescription>
            Resumo do dia {today}
          </DialogDescription>
        </DialogHeader>

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
