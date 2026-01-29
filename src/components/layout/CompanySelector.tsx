import { Building2, ChevronDown } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
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

const companies: Company[] = ['escola_franchising', 'evidia'];

export function CompanySelector() {
  const { selectedCompany, setSelectedCompany, companyLabel } = useCompany();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{companyLabel}</span>
          <Badge 
            variant="outline" 
            className={cn("sm:hidden text-[10px] px-1", COMPANY_COLORS[selectedCompany])}
          >
            {selectedCompany === 'escola_franchising' ? 'EF' : 'EV'}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
