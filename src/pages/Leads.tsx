import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { useLeads } from '@/hooks/useLeads';
import { Lead } from '@/types/crm';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeadsPage() {
  const { leads, loading } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter only new leads (sem_atendimento)
  const newLeads = leads.filter(l => l.status === 'sem_atendimento');

  const filteredLeads = newLeads.filter(lead => {
    const search = searchTerm.toLowerCase();
    return (
      lead.full_name.toLowerCase().includes(search) ||
      lead.email.toLowerCase().includes(search) ||
      lead.company_name.toLowerCase().includes(search) ||
      lead.phone.includes(search)
    );
  });

  return (
    <AppLayout title="Leads Novos">
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Painel de Leads</h2>
              <p className="text-sm text-muted-foreground">
                Leads aguardando primeiro atendimento
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit text-lg py-2 px-4">
            {newLeads.length} leads novos
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, empresa ou telefone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3 p-4 border rounded-lg">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredLeads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead novo'}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              {searchTerm 
                ? 'Tente ajustar sua busca para encontrar o lead desejado.'
                : 'Todos os leads foram atendidos! Novos leads aparecerão aqui automaticamente.'
              }
            </p>
          </div>
        )}

        {/* Leads grid */}
        {!loading && filteredLeads.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => setSelectedLead(lead)}
              />
            ))}
          </div>
        )}

        {/* Lead detail dialog */}
        <LeadDetailDialog
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
        />
      </div>
    </AppLayout>
  );
}