import logoEscolaFranchising from '@/assets/logo-escola-franchising.svg';
import logoEvidia from '@/assets/logo-evidia.png';
import { CompanySelector } from './CompanySelector';
import { useCompany } from '@/contexts/CompanyContext';

export function MobileHeader() {
  const { selectedCompany } = useCompany();
  const logo = selectedCompany === 'evidia' ? logoEvidia : logoEscolaFranchising;
  const altText = selectedCompany === 'evidia' ? 'Evidia' : 'Escola do Franchising';

  return (
    <div className="md:hidden sticky top-0 z-50 flex flex-col bg-background border-b border-border safe-area-top">
      <div className="flex items-center justify-center py-3 px-4">
        <img 
          src={logo} 
          alt={altText} 
          className="h-8 w-auto"
        />
      </div>
      {/* Company Selector no mobile */}
      <div className="flex items-center justify-center pb-2 px-4">
        <CompanySelector variant="prominent" />
      </div>
    </div>
  );
}
