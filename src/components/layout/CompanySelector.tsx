import { Building2, ChevronDown } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Company, COMPANY_LABELS, COMPANY_COLORS } from '@/types/crm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CompanySelectorProps {
  variant?: 'default' | 'prominent';
}

export function CompanySelector({ variant = 'default' }: CompanySelectorProps) {
  const { selectedCompany, setSelectedCompany, companyLabel } = useCompany();
  const { isAdmin } = useAuth();

  // Apenas admins podem ver Evidia
  const companies: Company[] = isAdmin() 
    ? ['escola_franchising', 'evidia'] 
    : ['escola_franchising'];

  // Se não é admin e estava vendo Evidia, volta para escola_franchising
  if (!isAdmin() && selectedCompany === 'evidia') {
    setSelectedCompany('escola_franchising');
  }

  // Se só tem uma empresa disponível, não mostra o seletor
  if (companies.length === 1) {
    return null;
  }

  const isProminent = variant === 'prominent';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isProminent ? "default" : "outline"} 
          className={cn(
            "gap-2",
            isProminent 
              ? "w-full justify-between bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary" 
              : "h-9 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className={isProminent ? "" : "hidden sm:inline"}>{companyLabel}</span>
            {!isProminent && (
              <Badge 
                variant="outline" 
                className={cn("sm:hidden text-[10px] px-1", COMPANY_COLORS[selectedCompany])}
              >
                {selectedCompany === 'escola_franchising' ? 'EF' : 'EV'}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isProminent ? "center" : "end"} className="w-56">
        {companies.map((company) => (
          <DropdownMenuItem
            key={company}
            onClick={() => setSelectedCompany(company)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              selectedCompany === company && "bg-accent"
            )}
          >
            <Badge 
              variant="outline" 
              className={cn("text-xs", COMPANY_COLORS[company])}
            >
              {company === 'escola_franchising' ? 'EF' : 'EV'}
            </Badge>
            {COMPANY_LABELS[company]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
