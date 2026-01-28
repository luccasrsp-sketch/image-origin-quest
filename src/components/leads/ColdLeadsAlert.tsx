import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/types/crm';
import { AlertTriangle, Phone, Building, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColdLeadsAlertProps {
  leads: Lead[];
  onDismiss: () => void;
  onLeadClick: (lead: Lead) => void;
}

export function ColdLeadsAlert({ leads, onDismiss, onLeadClick }: ColdLeadsAlertProps) {
  const [open, setOpen] = useState(false);
  const [coldLeads, setColdLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const checkColdLeads = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Only check between 9am and 7pm
      if (currentHour < 9 || currentHour >= 19) {
        setColdLeads([]);
        return;
      }

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const cold = leads.filter(lead => {
        if (lead.status !== 'sem_atendimento') return false;
        
        const createdAt = new Date(lead.created_at);
        const createdHour = createdAt.getHours();
        
        // Lead must have been created between 9am and 7pm
        if (createdHour < 9 || createdHour >= 19) return false;
        
        // Lead must be older than 5 minutes
        return createdAt < fiveMinutesAgo;
      });

      setColdLeads(cold);
      
      if (cold.length > 0) {
        setOpen(true);
      }
    };

    // Check immediately
    checkColdLeads();

    // Check every 30 seconds
    const interval = setInterval(checkColdLeads, 30000);

    return () => clearInterval(interval);
  }, [leads]);

  const handleClose = () => {
    setOpen(false);
    onDismiss();
  };

  const handleLeadClick = (lead: Lead) => {
    setOpen(false);
    onLeadClick(lead);
  };

  if (coldLeads.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg border-warning">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
            Você está perdendo uma oportunidade!
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            Leads esfriando:
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {coldLeads.map(lead => (
              <div 
                key={lead.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-warning/50 bg-warning/5 cursor-pointer hover:bg-warning/10 transition-colors"
                onClick={() => handleLeadClick(lead)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{lead.full_name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building className="h-3 w-3" />
                    <span className="truncate">{lead.company_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{lead.phone}</span>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <Badge variant="outline" className="border-warning text-warning text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-3">
          <div className="w-full p-3 rounded-lg bg-destructive/10 border border-destructive">
            <p className="text-destructive font-bold text-center text-sm">
              ⚠️ RESOLVA ESSA PENDÊNCIA O QUANTO ANTES, LEAD NÃO É CAPIM! ⚠️
            </p>
          </div>
          <Button onClick={handleClose} className="w-full">
            Entendi, vou resolver!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
